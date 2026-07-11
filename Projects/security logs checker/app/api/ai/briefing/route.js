import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { callAI } from "@/lib/ai";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { provider } = await req.json().catch(() => ({}));
    const db = await getDb();
    const data = await db.all("SELECT * FROM incidents ORDER BY last_seen DESC LIMIT 15");
    const incidents = data.map(i => {
      if (i.log_ids && typeof i.log_ids === 'string') {
        try { i.log_ids = JSON.parse(i.log_ids); } catch(e){}
      }
      return i;
    });

    const system = "You are a senior SOC lead producing a shift-handover briefing. Respond with ONLY raw JSON (no markdown fences): keys: summary (3-4 sentence executive overview of current threat posture), priorities (array of up to 4 short strings naming which incidents/IPs to investigate first and why).";
    const userPrompt = `Open incidents (${incidents.length} total):
${incidents.map((i) => `- ${i.id} [${i.severity}] ${i.type} from ${i.source_ip} affecting ${i.user}`).join("\n")}`;

    const { provider: usedProvider, data: briefing } = await callAI(provider, system, userPrompt);
    return NextResponse.json({ ok: true, provider: usedProvider, briefing });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
