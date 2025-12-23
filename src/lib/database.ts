import Database from 'better-sqlite3';
import path from 'path';

// Renderのデプロイ環境では /tmp や永続ディスクが必要ですが、
// まずはプロジェクトのルートにDBを作成します。
const dbPath = path.join(process.cwd(), 'aibo.db');
const db = new Database(dbPath);

// テーブル初期化
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
    getOrCreateUser: (userId: string, name: string = 'ゲスト') => {
        let user: any = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        if (!user) {
            db.prepare('INSERT INTO users (id, name) VALUES (?, ?)').run(userId, name);
            user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        }
        return user;
    },

    // ユーザー情報取得
    getUserInfo: (userId: string) => {
        return db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    },

    // ノート保存
    saveNote: (userId: string, content: string, analysisResult: string | null = null) => {
        return db.prepare('INSERT INTO notes (user_id, content, analysis_result) VALUES (?, ?, ?)')
            .run(userId, content, analysisResult);
    },

    // 会話履歴保存
    saveConversation: (userId: string, message: string, sender: 'user' | 'ai') => {
        return db.prepare('INSERT INTO conversations (user_id, message, sender) VALUES (?, ?, ?)')
            .run(userId, message, sender);
    },

    // 最新の会話履歴取得（短期記憶用）
    getRecentConversations: (userId: string, limit: number = 5) => {
        return db.prepare('SELECT * FROM conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT ?')
            .all(userId, limit).reverse();
    },

    // ポイント加算と称号更新
    addPoints: (userId: string, pointsToAdd: number) => {
        const user: any = db.prepare('SELECT points, title FROM users WHERE id = ?').get(userId);
        if (!user) return null;

        const newPoints = user.points + pointsToAdd;
        let newTitle = user.title;

        // 称号昇格ロジック
        if (newPoints >= 1000) newTitle = '伝説の相棒';
        else if (newPoints >= 500) newTitle = 'エリート会員';
        else if (newPoints >= 100) newTitle = 'ファイター';
        else if (newPoints >= 50) newTitle = 'ルーキー';

        return db.prepare('UPDATE users SET points = ?, title = ? WHERE id = ?')
            .run(newPoints, newTitle, userId);
    }
};

export default db;
