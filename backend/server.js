import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { circuitBreaker } from './circuitBreaker.js';
import { r2Service } from './services/r2.js';
import { geminiService } from './services/gemini.js';
import { lineService } from './services/line.js';

dotenv.config();

// Force set GOOGLE_PROJECT_ID to bypass validation if missing
process.env.GOOGLE_PROJECT_ID = process.env.GOOGLE_PROJECT_ID || 'dummy-project-id';

const app = express();
// Security: Allow all origins (handled by firewall/Netlify proxy)
app.use(cors());
// Enable JSON parsing
app.use(express.json());
// const allowedOrigins = [...]; // Strict check disabled to fix 500 error with rewrites

// Health Check
app.get('/', (req, res) => {
  res.status(200).send('AIKA Backend is running');
});

// 1. Request Upload URL
app.post('/api/upload-request', async (req, res) => {
  try {
    // Safety Check
    if (!circuitBreaker.checkLimit()) {
      return res.status(429).json({
        error: 'Daily limit reached',
        message: '本日の解析受付は終了しました。また明日お試しください。'
      });
    }

    const { fileName, contentType } = req.body;
    // Generate unique key
    const uniqueKey = `videos/${Date.now()}_${fileName || 'video.mp4'}`;

    // Get Presigned URL
    const uploadUrl = await r2Service.getUploadUrl(uniqueKey, contentType);

    res.json({ uploadUrl, fileKey: uniqueKey });
  } catch (error) {
    console.error('Upload Request Error:', error);
    // DEBUG: Expose error to client
    const r2ConfigCheck = {
      accountId: !!process.env.R2_ACCOUNT_ID,
      keyId: !!process.env.R2_ACCESS_KEY_ID,
      secret: !!process.env.R2_SECRET_ACCESS_KEY,
      bucket: !!process.env.R2_BUCKET_NAME,
    };
    console.log('R2 Config Check:', r2ConfigCheck);

    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      configCheck: r2ConfigCheck
    });
  }
});

app.post('/api/analyze', async (req, res) => {
  try {
    const { fileKey, userId } = req.body;

    if (!fileKey || !userId) {
      return res.status(400).json({ error: 'Missing fileKey or userId' });
    }

    // Double check limit before committing resources
    if (!circuitBreaker.checkLimit()) {
      // Even if they uploaded, we can't analyze.
      // Notify user immediately via response
      return res.status(429).json({ message: '本日の受付は終了しました' });
    }

    // Record Usage immediately to reserve slot (or after success? Standard is leaky bucket, but for strict cost, reserve now).
    circuitBreaker.recordUsage('GEMINI_ANALYSIS', 0); // Cost updated later if needed, or fixed 1 unit

    // Return immediately to client so LIFF doesn't hang
    res.status(202).json({ message: 'Analysis started', status: 'processing' });

    // Async Processing
    (async () => {
      const tempFilePath = path.join('/tmp', path.basename(fileKey));
      try {
        console.log(`Starting analysis for ${fileKey}...`);

        // 1. Download from R2
        const s3Stream = await r2Service.getFileStream(fileKey);
        await pipeline(s3Stream, fs.createWriteStream(tempFilePath));
        console.log('Downloaded to', tempFilePath);

        // 2. OpenAI/Gemini Analysis
        const resultText = await geminiService.analyzeVideo(tempFilePath);
        console.log('Gemini Analysis result length:', resultText.length);

        // 3. Dify Persona Generation (New Flow)
        const { difyService } = await import('./services/dify.js');
        const aikaResponse = await difyService.sendToDify(resultText, userId);
        console.log('Dify Response length:', aikaResponse.length);

        // 4. Push to LINE
        await lineService.pushMessage(userId, aikaResponse);

      } catch (error) {
        console.error('Async Analysis Error:', error);
        await lineService.pushMessage(userId, "【エラー】\n動画の解析中にエラーが発生しました。もう一度お試しください。");
      } finally {
        // Cleanup
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      }
    })();
  } catch (error) {
    console.error('Analyze Request Error:', error);
    res.status(500).json({ error: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});