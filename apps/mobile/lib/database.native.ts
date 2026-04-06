import { openDatabaseSync } from 'expo-sqlite';

const db = openDatabaseSync('nutrition-planner.db');

db.execSync(`
  CREATE TABLE IF NOT EXISTS kv_store (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

type KvRow = {
  value: string;
};

export const readJson = <T>(key: string): T | null => {
  const row = db.getFirstSync<KvRow>('SELECT value FROM kv_store WHERE key = ?', key);

  if (!row) {
    return null;
  }

  try {
    return JSON.parse(row.value) as T;
  } catch {
    return null;
  }
};

export const writeJson = (key: string, value: unknown): void => {
  db.runSync(
    `INSERT INTO kv_store (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    key,
    JSON.stringify(value),
    new Date().toISOString(),
  );
};

export const removeKey = (key: string): void => {
  db.runSync('DELETE FROM kv_store WHERE key = ?', key);
};

export const clearStore = (): void => {
  db.runSync('DELETE FROM kv_store');
};
