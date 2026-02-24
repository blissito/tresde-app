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
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )
`);

db.run(`CREATE INDEX IF NOT EXISTS idx_session ON scenes(session_id)`);

db.run(`
  CREATE TABLE IF NOT EXISTS waitlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    session_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

export function insertWaitlist(email: string, sessionId: string): void {
  db.run(
    `INSERT OR IGNORE INTO waitlist (email, session_id) VALUES (?, ?)`,
    [email, sessionId]
  );
}

export function getAllWaitlist(): { id: number; email: string; session_id: string; created_at: string }[] {
  return db.query(`SELECT * FROM waitlist ORDER BY created_at DESC`).all() as any;
}

export function getAllScenes(): SceneRow[] {
  return db.query(`SELECT * FROM scenes ORDER BY updated_at DESC`).all() as SceneRow[];
}

export function isSessionRegistered(sessionId: string): boolean {
  const row = db.query(`SELECT 1 FROM waitlist WHERE session_id = ? LIMIT 1`).get(sessionId);
  return !!row;
}

export interface SceneRow {
  id: string;
  session_id: string;
  title: string | null;
  s3_url: string;
  scene_data: string;
  created_at: string;
  updated_at: string;
}

export function toSlug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "escena";
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

export function updateScene(
  id: string,
  title: string | null,
  s3Url: string,
  sceneData: string
) {
  db.run(
    `UPDATE scenes SET title = ?, s3_url = ?, scene_data = ?, updated_at = datetime('now') WHERE id = ?`,
    [title, s3Url, sceneData, id]
  );
}

export function getSceneBySession(sessionId: string): SceneRow | null {
  return db.query(`SELECT * FROM scenes WHERE session_id = ? LIMIT 1`).get(sessionId) as SceneRow | null;
}

export function getScenesBySession(sessionId: string): SceneRow[] {
  return db.query(`SELECT * FROM scenes WHERE session_id = ? ORDER BY created_at DESC`).all(sessionId) as SceneRow[];
}

export function getSceneById(id: string): SceneRow | null {
  return db.query(`SELECT * FROM scenes WHERE id = ?`).get(id) as SceneRow | null;
}
