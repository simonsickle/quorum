import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { CREATE_TABLES, SCHEMA_VERSION } from './schema';
import { runMigrations } from './migrations';

let db: Database.Database | null = null;

export function getDbPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'ai-code-reviewer.db');
}

export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = getDbPath();
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeDatabase(db);
  }
  return db;
}

function initializeDatabase(database: Database.Database): void {
  database.exec(CREATE_TABLES);

  const versionRow = database
    .prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1')
    .get() as { version: number } | undefined;

  const currentVersion = versionRow?.version ?? 0;

  if (currentVersion < SCHEMA_VERSION) {
    runMigrations(database, currentVersion, SCHEMA_VERSION);
    database
      .prepare('INSERT OR REPLACE INTO schema_version (version) VALUES (?)')
      .run(SCHEMA_VERSION);
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// Helper for transactional operations
export function withTransaction<T>(fn: (db: Database.Database) => T): T {
  const database = getDatabase();
  const transaction = database.transaction(fn);
  return transaction(database);
}
