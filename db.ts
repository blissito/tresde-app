import { Database } from "bun:sqlite";

const DB_PATH = process.env.DB_PATH || "/data/tresde.db";

const db = new Database(DB_PATH, { create: true });

db.run(`
  CREATE TABLE IF NOT EXISTS scenes (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    title TEXT,
    s3_url TEXT NOT NULL,
    scene_data TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

db.run(`CREATE INDEX IF NOT EXISTS idx_session ON scenes(session_id)`);

export interface SceneRow {
  id: string;
  session_id: string;
  title: string | null;
  s3_url: string;
  scene_data: string;
  created_at: string;
}

export function insertScene(
  id: string,
  sessionId: string,
  title: string | null,
  s3Url: string,
  sceneData: string
) {
  db.run(
    `INSERT INTO scenes (id, session_id, title, s3_url, scene_data) VALUES (?, ?, ?, ?, ?)`,
    [id, sessionId, title, s3Url, sceneData]
  );
}

export function getScenesBySession(sessionId: string): SceneRow[] {
  return db.query(`SELECT * FROM scenes WHERE session_id = ? ORDER BY created_at DESC`).all(sessionId) as SceneRow[];
}

export function getSceneById(id: string): SceneRow | null {
  return db.query(`SELECT * FROM scenes WHERE id = ?`).get(id) as SceneRow | null;
}
