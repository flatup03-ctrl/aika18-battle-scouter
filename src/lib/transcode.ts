import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import path from 'path';

/**
 * 動画ファイルをH.264/MP4形式にトランスコードする
 * @param inputPath - 入力動画ファイルの一時パス
 * @param outputPath - 出力動画ファイルの一時パス
 * @returns {Promise<string>} トランスコードされたファイルのパス
 */
export async function transcodeVideo(inputPath: string, outputPath: string): Promise<string> {
    // 出力パスのディレクトリが存在しない場合は作成
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    return new Promise((resolve, reject) => {
        // タイムアウト設定 (最大3分)
        const timeout = setTimeout(() => {
            reject(new Error("Transcoding timed out (180s)"));
        }, 180000);

        ffmpeg(inputPath)
            // H.264コーデックを指定 (Geminiが好む形式)
            .videoCodec('libx264')
            // 音声もAACに統一
            .audioCodec('aac')
            // 互換性の高いピクセルフォーマット (HDR問題を回避)
            .outputOptions([
                '-pix_fmt yuv420p',
                '-movflags +faststart', // Web再生/ストリーミング最適化
                '-preset ultrafast',    // 速度優先 (画質より速度)
                '-crf 28'               // 画質を少し下げて軽量化
            ])
            // 出力ファイルパス
            .save(outputPath)
            .on('end', () => {
                clearTimeout(timeout);
                console.log('[FFmpeg] Transcoding finished successfully.');
                resolve(outputPath);
            })
            .on('error', (err) => {
                clearTimeout(timeout);
                console.error('[FFmpeg] An error occurred: ' + err.message);
                reject(new Error(`Video transcoding failed: ${err.message}`));
            });
    });
}
