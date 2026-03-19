import Database from 'better-sqlite3';

type Migration = {
  version: number;
  up: (db: Database.Database) => void;
  description: string;
};

const migrations: Migration[] = [
  {
    version: 1,
    description: 'Initial schema',
    up: (_db: Database.Database) => {
      // Initial schema is created in schema.ts via CREATE_TABLES
      // This migration entry exists for tracking purposes
    },
  },
];

export function runMigrations(
  db: Database.Database,
  fromVersion: number,
  toVersion: number
): void {
  const pendingMigrations = migrations.filter(
    (m) => m.version > fromVersion && m.version <= toVersion
  );

  for (const migration of pendingMigrations) {
    console.log(
      `Running migration v${migration.version}: ${migration.description}`
    );
    migration.up(db);
  }
}
