import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../db/aibo.db');

const db = new Database(dbPath);

// テーブル作成
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    points INTEGER DEFAULT 0,
    title TEXT DEFAULT 'ルーキー',
    level INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    content TEXT,
    analysis_result TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    message TEXT,
    sender TEXT, -- 'user' or 'ai'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

export const dbService = {
    // ユーザー取得または作成
    getOrCreateUser: (userId, name = 'ゲスト') => {
        let user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        if (!user) {
            db.prepare('INSERT INTO users (id, name) VALUES (?, ?)').run(userId, name);
            user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        }
        return user;
    },

    // ノート保存
    saveNote: (userId, content, analysisResult = null) => {
        return db.prepare('INSERT INTO notes (user_id, content, analysis_result) VALUES (?, ?, ?)')
            .run(userId, content, analysisResult);
    },

    // 会話履歴保存
    saveConversation: (userId, message, sender) => {
        return db.prepare('INSERT INTO conversations (user_id, message, sender) VALUES (?, ?, ?)')
            .run(userId, message, sender);
    },

    // 最新の会話履歴取得（短期記憶用）
    getRecentConversations: (userId, limit = 10) => {
        return db.prepare('SELECT * FROM conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT ?')
            .all(userId, limit).reverse();
    },

    // ポイント加算
    addPoints: (userId, points) => {
        return db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(points, userId);
    }
};

export default db;
