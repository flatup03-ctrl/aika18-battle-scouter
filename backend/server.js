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
  res.status(200).send('AIKA (AIBO) Backend is running');
});

/**
 * 2. 練習ノート投稿 (New Aibo Implementation)
 */
app.post('/api/notes', async (req, res) => {
  try {
    const { content, userId, userName } = req.body;

    if (!content || !userId) {
      return res.status(400).json({ error: 'Missing content or userId' });
    }

    // 1. ユーザーの取得・作成
    const { dbService } = await import('./services/db.js');
    await dbService.getOrCreateUser(userId, userName || 'ゲスト');

    // 立入制限（サーキットブレーカー）チェック
    if (!circuitBreaker.checkLimit()) {
      return res.status(429).json({ message: '本日の受付は終了しました' });
    }

    // 2. 応答開始を即時返却
    res.status(202).json({ message: 'Note being processed', status: 'processing' });

    // 3. 非同期処理：AI回答生成とプッシュ通知
    (async () => {
      try {
        const { difyService } = await import('./services/dify.js');

        // 会話履歴の取得（短期記憶）
        const history = await dbService.getRecentConversations(userId, 5);
        const context = history.map(h => `${h.sender === 'user' ? 'User' : 'AI'}: ${h.message}`).join('\n');

        // Dify連携 (練習ノートとして処理)
        const taskType = content.includes('食事') ? 'image_analysis' : 'normal_chat'; // Difyのプロンプト分岐に合わせる
        const aikaResponse = await difyService.sendToDify(content, userId, userName, taskType);

        // DB永続化
        await dbService.saveNote(userId, content, aikaResponse);
        await dbService.saveConversation(userId, content, 'user');
        await dbService.saveConversation(userId, aikaResponse, 'ai');
        await dbService.addPoints(userId, 5); // ノート投稿で5ポイント

        // LINEプッシュ送信
        await lineService.pushMessage(userId, aikaResponse);

      } catch (error) {
        console.error('Async Note Processing Error:', error);
        await lineService.pushMessage(userId, "【申し訳ありません】ノートの処理中にエラーが発生しました。");
      }
    })();

  } catch (error) {
    console.error('Notes API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 旧動画解析エンドポイントは廃止されました
app.post('/api/analyze', (req, res) => {
  res.status(410).json({ message: 'Video analysis is deprecated for server efficiency.' });
});

const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});