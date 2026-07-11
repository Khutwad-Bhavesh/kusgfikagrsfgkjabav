import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

let db = null;

export async function getDb() {
  if (db) return db;

  db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      ts TEXT NOT NULL,
      source_ip TEXT,
      dest_ip TEXT,
      user TEXT,
      event TEXT,
      status TEXT,
      port INTEGER,
      message TEXT,
      bytes_out INTEGER,
      raw TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS logs_ts_idx ON logs (ts DESC);
    CREATE INDEX IF NOT EXISTS logs_source_ip_idx ON logs (source_ip);

    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      mitre_key TEXT NOT NULL,
      source_ip TEXT,
      user TEXT,
      dest_ip TEXT,
      first_seen TEXT,
      last_seen TEXT,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'Open',
      log_ids TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS incidents_last_seen_idx ON incidents (last_seen DESC);
    CREATE INDEX IF NOT EXISTS incidents_severity_idx ON incidents (severity);

    CREATE TABLE IF NOT EXISTS ai_reports (
      id TEXT PRIMARY KEY,
      incident_id TEXT,
      provider TEXT NOT NULL,
      summary TEXT,
      attack_narrative TEXT,
      mitre TEXT,
      remediation TEXT,
      recommended_severity TEXT,
      raw_response TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(incident_id) REFERENCES incidents(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS ai_reports_incident_idx ON ai_reports (incident_id);
  `);

  return db;
}
