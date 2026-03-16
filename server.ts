import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";

const db = new Database("math_tutor.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    fullName TEXT,
    grade INTEGER,
    points INTEGER DEFAULT 0,
    stage INTEGER DEFAULT 1,
    unlockedItems TEXT DEFAULT '[]',
    history TEXT DEFAULT '[]',
    chatHistory TEXT DEFAULT '[]'
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Auth Routes
  app.post("/api/register", (req, res) => {
    const { username, password, fullName, grade } = req.body;
    try {
      const stmt = db.prepare("INSERT INTO users (username, password, fullName, grade) VALUES (?, ?, ?, ?)");
      const result = stmt.run(username, password, fullName, grade);
      res.json({ success: true, userId: result.lastInsertRowid });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password) as any;
    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, error: "Tên đăng nhập hoặc mật khẩu không đúng" });
    }
  });

  // Progress Routes
  app.post("/api/update-progress", (req, res) => {
    const { userId, points, stage, unlockedItems, history, chatHistory } = req.body;
    try {
      const stmt = db.prepare(`
        UPDATE users 
        SET points = ?, stage = ?, unlockedItems = ?, history = ?, chatHistory = ?
        WHERE id = ?
      `);
      stmt.run(points, stage, JSON.stringify(unlockedItems), JSON.stringify(history), JSON.stringify(chatHistory), userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get("/api/leaderboard", (req, res) => {
    const users = db.prepare("SELECT fullName as name, points, stage FROM users ORDER BY points DESC LIMIT 10").all();
    res.json(users);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
