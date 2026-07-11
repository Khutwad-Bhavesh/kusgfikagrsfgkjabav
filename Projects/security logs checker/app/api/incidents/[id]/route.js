import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req, { params }) {
  try {
    const db = await getDb();
    const incident = await db.get("SELECT * FROM incidents WHERE id = ?", params.id);
    if (!incident) return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    
    if (incident.log_ids && typeof incident.log_ids === 'string') {
      try { incident.log_ids = JSON.parse(incident.log_ids); } catch(e){}
    }

    let logs = [];
    if (Array.isArray(incident.log_ids) && incident.log_ids.length) {
      const placeholders = incident.log_ids.map(() => '?').join(',');
      const logRows = await db.all(`SELECT * FROM logs WHERE id IN (${placeholders})`, ...incident.log_ids);
      logs = logRows.map(l => {
        if (l.raw && typeof l.raw === 'string') {
          try { l.raw = JSON.parse(l.raw); } catch(e){}
        }
        return l;
      });
    }

    const dataReports = await db.all("SELECT * FROM ai_reports WHERE incident_id = ? ORDER BY created_at DESC", params.id);
    const reports = dataReports.map(r => {
      if (r.mitre && typeof r.mitre === 'string') {
        try { r.mitre = JSON.parse(r.mitre); } catch(e){}
      }
      if (r.remediation && typeof r.remediation === 'string') {
        try { r.remediation = JSON.parse(r.remediation); } catch(e){}
      }
      return r;
    });

    return NextResponse.json({ incident, logs, reports });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
