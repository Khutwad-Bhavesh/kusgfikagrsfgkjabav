import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { callAI } from "@/lib/ai";
import { MITRE } from "@/lib/mitre";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { incidentId, provider } = await req.json();
    if (!incidentId) return NextResponse.json({ error: "incidentId is required" }, { status: 400 });

    const db = await getDb();
    const incident = await db.get("SELECT * FROM incidents WHERE id = ?", incidentId);
    if (!incident) return NextResponse.json({ error: "Incident not found" }, { status: 404 });

    if (incident.log_ids && typeof incident.log_ids === 'string') {
      try { incident.log_ids = JSON.parse(incident.log_ids); } catch(e){}
    }

    let logs = [];
    if (Array.isArray(incident.log_ids) && incident.log_ids.length) {
      const placeholders = incident.log_ids.slice(0, 8).map(() => '?').join(',');
      const logRows = await db.all(`SELECT * FROM logs WHERE id IN (${placeholders}) LIMIT 8`, ...incident.log_ids.slice(0, 8));
      logs = logRows.map(l => {
        if (l.raw && typeof l.raw === 'string') {
          try { l.raw = JSON.parse(l.raw); } catch(e){}
        }
        return l;
      });
    }

    const mitreDefault = MITRE[incident.mitre_key];
    const system = "You are a SOC (Security Operations Center) analyst assistant. Given structured incident data, respond with ONLY a raw JSON object (no markdown fences, no preamble) with keys: summary (2-3 sentences, plain analyst language), attack_narrative (2-3 sentences describing likely attacker intent and technique), mitre (array of {id, tactic, technique}, include the given technique plus any other clearly relevant ones), remediation (array of 3-5 short actionable strings), recommended_severity (one of Critical, High, Medium, Low).";

    const userPrompt = `Incident type: ${incident.type}
Default severity: ${incident.severity}
Source IP: ${incident.source_ip}
Affected user: ${incident.user}
Destination: ${incident.dest_ip || "n/a"}
First seen: ${incident.first_seen}
Last seen: ${incident.last_seen}
Baseline MITRE mapping: ${mitreDefault.id} ${mitreDefault.tactic} - ${mitreDefault.technique}
Description: ${incident.description}
Related log samples:
${logs.map((l) => `- [${l.ts}] ${l.source_ip} -> ${l.dest_ip || "?"} user=${l.user} event=${l.event} status=${l.status} msg="${l.message}"`).join("\n")}`;

    const { provider: usedProvider, data: report } = await callAI(provider, system, userPrompt);

    await db.run("DELETE FROM ai_reports WHERE incident_id = ?", incidentId);
    
    await db.run(
      `INSERT INTO ai_reports (id, incident_id, provider, summary, attack_narrative, mitre, remediation, recommended_severity, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      crypto.randomUUID(),
      incidentId,
      usedProvider,
      report.summary,
      report.attack_narrative,
      JSON.stringify(report.mitre),
      JSON.stringify(report.remediation),
      report.recommended_severity,
      new Date().toISOString()
    );

    return NextResponse.json({ ok: true, provider: usedProvider, report });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
