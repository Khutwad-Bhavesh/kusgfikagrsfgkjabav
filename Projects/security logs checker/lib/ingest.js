import { getDb } from "./db";
import { normalizeLog } from "./normalize";
import { runDetection } from "./detection";
import crypto from "crypto";

// Clears existing logs/incidents/ai_reports and ingests a fresh batch of
// raw log rows: normalizes them, stores them in SQLite, runs the
// detection engine, and stores any resulting incidents.
export async function ingestLogs(rawRows) {
  const normalized = rawRows.map(normalizeLog);
  const db = await getDb();

  await db.run("DELETE FROM ai_reports");
  await db.run("DELETE FROM incidents");
  await db.run("DELETE FROM logs");

  const logRows = normalized.map((l) => ({
    id: crypto.randomUUID(),
    ts: new Date(l.tsMs).toISOString(),
    source_ip: l.sourceIp,
    dest_ip: l.destIp,
    user: l.user,
    event: l.event,
    status: l.status,
    port: Number.isFinite(l.port) ? l.port : null,
    message: l.message,
    bytes_out: Number.isFinite(l.bytesOut) ? l.bytesOut : null,
    raw: JSON.stringify(l.raw),
    created_at: new Date().toISOString()
  }));

  // Batch insert logs
  if (logRows.length > 0) {
    const stmt = await db.prepare(
      `INSERT INTO logs (id, ts, source_ip, dest_ip, user, event, status, port, message, bytes_out, raw, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const row of logRows) {
      await stmt.run(
        row.id, row.ts, row.source_ip, row.dest_ip, row.user, row.event,
        row.status, row.port, row.message, row.bytes_out, row.raw, row.created_at
      );
    }
    await stmt.finalize();
  }

  const forDetection = logRows.map((row) => ({
    id: row.id,
    tsMs: new Date(row.ts).getTime(),
    tsLabel: new Date(row.ts).toLocaleString(),
    sourceIp: row.source_ip,
    destIp: row.dest_ip,
    user: row.user,
    event: row.event,
    status: row.status,
    port: row.port,
    message: row.message,
    bytesOut: row.bytes_out,
  }));

  const incidents = runDetection(forDetection);
  const incidentRows = incidents.map((inc) => ({
    id: inc.id,
    type: inc.type,
    severity: inc.severity,
    mitre_key: inc.mitreKey,
    source_ip: inc.sourceIp,
    user: inc.user,
    dest_ip: inc.destIp,
    first_seen: new Date(inc.firstSeen).toISOString(),
    last_seen: new Date(inc.lastSeen).toISOString(),
    description: inc.description,
    status: "Open",
    log_ids: JSON.stringify(inc.logs.map((l) => l.id)),
    created_at: new Date().toISOString()
  }));

  if (incidentRows.length > 0) {
    const stmt = await db.prepare(
      `INSERT INTO incidents (id, type, severity, mitre_key, source_ip, user, dest_ip, first_seen, last_seen, description, status, log_ids, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const row of incidentRows) {
      await stmt.run(
        row.id, row.type, row.severity, row.mitre_key, row.source_ip, row.user,
        row.dest_ip, row.first_seen, row.last_seen, row.description, row.status, row.log_ids, row.created_at
      );
    }
    await stmt.finalize();
  }

  return { logsInserted: logRows.length, incidentsFound: incidentRows.length };
}
