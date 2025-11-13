
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const db = new sqlite3.Database('./data.db', (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    db.serialize(() => {
      // Create users table
      db.run(`CREATE TABLE IF NOT EXISTS users (
        token TEXT PRIMARY KEY,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        last_sync_at INTEGER
      )`);

      // Create tasks table
      db.run(`CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        token TEXT NOT NULL,
        name TEXT NOT NULL,
        estimated_time INTEGER,
        long_cycle INTEGER,
        cycle_list TEXT,
        progress INTEGER DEFAULT 0,
        deadline INTEGER,
        completed INTEGER DEFAULT 0,
        time_up INTEGER DEFAULT 0,
        urgent INTEGER DEFAULT 0,
        important INTEGER DEFAULT 0,
        description TEXT,
        timestamp INTEGER NOT NULL
      )`);

      db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_token ON tasks(token)`);
    });
  }
});

// Routes
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.post('/sync', (req, res) => {
  const token = req.headers['x-token'];
  if (!token) {
    return res.status(401).send('Token is required');
  }

  const clientTasks = req.body.tasks || [];

  db.serialize(() => {
    // 1. Ensure user exists
    db.run(`INSERT INTO users (token) VALUES (?) ON CONFLICT(token) DO NOTHING`, [token]);

    // 2. Get server tasks
    db.all(`SELECT * FROM tasks WHERE token = ?`, [token], (err, serverTasks) => {
      if (err) {
        return res.status(500).send('Error fetching server tasks');
      }

      // 3. Merge tasks
      const merged = {};
      serverTasks.forEach(task => {
        merged[task.id] = task;
      });

      clientTasks.forEach(task => {
        const serverTask = merged[task.id];
        if (!serverTask || task.timestamp > serverTask.timestamp) {
          merged[task.id] = task;
        }
      });

      const finalTasks = Object.values(merged);

      // 4. Persist merged tasks
      db.run(`DELETE FROM tasks WHERE token = ?`, [token], (err) => {
        if (err) {
          return res.status(500).send('Error clearing old tasks');
        }

        if (finalTasks.length === 0) {
            db.run(`UPDATE users SET last_sync_at = strftime('%s', 'now') WHERE token = ?`, [token]);
            return res.status(200).json({ tasks: [] });
        }

        const stmt = db.prepare(`INSERT INTO tasks (id, token, name, estimated_time, long_cycle, cycle_list, progress, deadline, completed, time_up, urgent, important, description, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        finalTasks.forEach(task => {
          stmt.run(
            task.id,
            token,
            task.name,
            task.estimatedTime,
            task.longCycle ? 1 : 0,
            JSON.stringify(task.cycleList),
            task.progress,
            task.deadline,
            task.completed ? 1 : 0,
            task.time_up ? 1 : 0,
            task.urgent ? 1 : 0,
            task.important ? 1 : 0,
            task.description,
            task.timestamp
          );
        });
        stmt.finalize((err) => {
            if (err) {
                return res.status(500).send('Error saving new tasks');
            }
            db.run(`UPDATE users SET last_sync_at = strftime('%s', 'now') WHERE token = ?`, [token]);
            res.status(200).json({ tasks: finalTasks });
        });
      });
    });
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
