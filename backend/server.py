import json
import os
import sqlite3
import time
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, JSONResponse

DB_PATH = os.path.join(os.path.dirname(__file__), 'data.db')

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_schema_and_migrate(conn: sqlite3.Connection) -> None:
    cur = conn.cursor()
    # users
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
          token TEXT PRIMARY KEY,
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          last_sync_at INTEGER
        )
        """
    )

    # tasks (composite PK)
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT NOT NULL,
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
          timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
          PRIMARY KEY (id, token)
        )
        """
    )

    cur.execute("CREATE INDEX IF NOT EXISTS idx_tasks_token ON tasks(token)")

    # migrate if old schema had single PK on id
    cur.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='tasks'")
    row = cur.fetchone()
    ddl = row[0] if row and row[0] else ''
    if 'PRIMARY KEY' in ddl and '(id, token)' not in ddl:
        try:
            conn.executescript(
                """
                BEGIN TRANSACTION;
                ALTER TABLE tasks RENAME TO tasks_old;
                CREATE TABLE tasks (
                  id TEXT NOT NULL,
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
                  timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
                  PRIMARY KEY (id, token)
                );
                INSERT INTO tasks (id, token, name, estimated_time, long_cycle, cycle_list, progress, deadline, completed, time_up, urgent, important, description, timestamp)
                  SELECT id, token, name, estimated_time, long_cycle, cycle_list, progress, deadline, completed, time_up, urgent, important, description, timestamp FROM tasks_old;
                DROP TABLE tasks_old;
                CREATE INDEX IF NOT EXISTS idx_tasks_token ON tasks(token);
                COMMIT;
                """
            )
            print('Tasks table migration completed (composite PK).')
        except Exception as e:
            print('Tasks table migration failed:', e)
            conn.rollback()

    conn.commit()


@app.on_event("startup")
def startup_event():
    conn = get_conn()
    ensure_schema_and_migrate(conn)
    conn.close()


@app.get('/health', response_class=PlainTextResponse)
async def health():
    return 'OK'


def row_to_task(row: sqlite3.Row) -> Dict[str, Any]:
    # Convert DB row (snake_case, ints) to frontend Task (camelCase, booleans, ms timestamps)
    ts = row['timestamp'] if row['timestamp'] is not None else int(time.time())
    # normalize seconds -> ms
    ts_ms = ts * 1000 if ts < 1_000_000_000_000 else ts
    cycle_list = None
    try:
        cycle_list = json.loads(row['cycle_list']) if row['cycle_list'] else []
    except Exception:
        cycle_list = []
    return {
        'id': row['id'],
        'name': row['name'],
        'estimatedTime': row['estimated_time'],
        'longCycle': bool(row['long_cycle']),
        'cycleList': cycle_list,
        'progress': row['progress'],
        'deadline': row['deadline'],
        'completed': bool(row['completed']),
        'time_up': bool(row['time_up']),
        'urgent': bool(row['urgent']),
        'important': bool(row['important']),
        'description': row['description'],
        'timestamp': ts_ms,
    }


def normalize_task_for_db(task: Dict[str, Any], token: str) -> Dict[str, Any]:
    # Ensure types and defaults
    name = (task.get('name') or '').strip() or 'Untitled'
    # timestamp: accept ms or s; store seconds in DB
    ts_raw = task.get('timestamp')
    if isinstance(ts_raw, (int, float)):
        ts_sec = int(ts_raw / 1000) if ts_raw > 1_000_000_000_000 else int(ts_raw)
    else:
        ts_sec = int(time.time())

    def to_int_or_none(v: Any) -> Optional[int]:
        try:
            return int(v)
        except (TypeError, ValueError):
            return None

    estimated_time = to_int_or_none(task.get('estimatedTime'))
    long_cycle = 1 if task.get('longCycle') else 0
    cycle_list = json.dumps(task.get('cycleList')) if task.get('cycleList') is not None else None
    progress = to_int_or_none(task.get('progress')) or 0
    deadline = to_int_or_none(task.get('deadline'))
    completed = 1 if task.get('completed') else 0
    time_up = 1 if task.get('time_up') else 0
    urgent = 1 if task.get('urgent') else 0
    important = 1 if task.get('important') else 0
    description = task.get('description') if isinstance(task.get('description'), str) else None

    return {
        'id': str(task.get('id')),
        'token': token,
        'name': name,
        'estimated_time': estimated_time,
        'long_cycle': long_cycle,
        'cycle_list': cycle_list,
        'progress': progress,
        'deadline': deadline,
        'completed': completed,
        'time_up': time_up,
        'urgent': urgent,
        'important': important,
        'description': description,
        'timestamp': ts_sec,
    }


@app.post('/sync')
async def sync(request: Request, x_token: Optional[str] = Header(None)):
    token = x_token
    if not token:
        raise HTTPException(status_code=401, detail='Token is required')

    body = await request.json()
    client_tasks: List[Dict[str, Any]] = body.get('tasks') or []

    conn = get_conn()
    try:
        cur = conn.cursor()
        # Ensure user exists
        cur.execute("INSERT INTO users(token) VALUES (?) ON CONFLICT(token) DO NOTHING", (token,))

        # Load server tasks for token
        cur.execute("SELECT * FROM tasks WHERE token = ?", (token,))
        server_rows = cur.fetchall()
        server_tasks_by_id: Dict[str, Dict[str, Any]] = {row['id']: row_to_task(row) for row in server_rows}

        # Merge: prefer newer timestamp
        merged: Dict[str, Dict[str, Any]] = dict(server_tasks_by_id)
        for t in client_tasks:
            cid = str(t.get('id'))
            if not cid:
                continue
            server_task = merged.get(cid)
            # Normalize timestamps to ms for comparison
            def to_ms(v: Any) -> int:
                if isinstance(v, (int, float)):
                    return int(v * 1000) if v < 1_000_000_000_000 else int(v)
                return 0
            if (server_task is None) or (to_ms(t.get('timestamp')) > to_ms(server_task.get('timestamp'))):
                merged[cid] = t

        final_tasks: List[Dict[str, Any]] = list(merged.values())

    # Persist: upsert by (id, token)
    # Note: sqlite3 starts a transaction implicitly on first DML when isolation_level is default.
    # Avoid explicit BEGIN here to prevent 'cannot start a transaction within a transaction'.
    # Optionally, clear token's tasks first to avoid stale rows
        cur.execute("DELETE FROM tasks WHERE token = ?", (token,))

        upsert_sql = (
            "INSERT INTO tasks (id, token, name, estimated_time, long_cycle, cycle_list, progress, deadline, completed, time_up, urgent, important, description, timestamp) "
            "VALUES (:id, :token, :name, :estimated_time, :long_cycle, :cycle_list, :progress, :deadline, :completed, :time_up, :urgent, :important, :description, :timestamp) "
            "ON CONFLICT(id, token) DO UPDATE SET "
            "name=excluded.name, estimated_time=excluded.estimated_time, long_cycle=excluded.long_cycle, cycle_list=excluded.cycle_list, progress=excluded.progress, deadline=excluded.deadline, completed=excluded.completed, time_up=excluded.time_up, urgent=excluded.urgent, important=excluded.important, description=excluded.description, timestamp=excluded.timestamp"
        )
        for t in final_tasks:
            norm = normalize_task_for_db(t, token)
            cur.execute(upsert_sql, norm)

        cur.execute("UPDATE users SET last_sync_at = strftime('%s', 'now') WHERE token = ?", (token,))
        conn.commit()

        # Return tasks normalized to frontend shape (camelCase, ms timestamps)
        # Reload from DB for consistency
        cur.execute("SELECT * FROM tasks WHERE token = ?", (token,))
        rows = cur.fetchall()
        resp_tasks = [row_to_task(r) for r in rows]
        return JSONResponse({"tasks": resp_tasks})
    except Exception as e:
        conn.rollback()
        print('Sync failed:', e)
        raise HTTPException(status_code=500, detail='Internal Server Error')
    finally:
        conn.close()


if __name__ == '__main__':
    import uvicorn
    # Keep the same port as the previous Node server for compatibility
    uvicorn.run(app, host='0.0.0.0', port=3000)
