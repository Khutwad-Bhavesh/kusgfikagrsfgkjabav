import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = await getDb();
    const data = await db.all("SELECT * FROM logs ORDER BY ts DESC LIMIT 1000");
    const logs = data.map(l => {
      if (l.raw && typeof l.raw === 'string') {
        try { l.raw = JSON.parse(l.raw); } catch(e){}
      }
      return l;
    });
    return NextResponse.json({ logs });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const db = await getDb();
    await db.run("DELETE FROM ai_reports");
    await db.run("DELETE FROM incidents");
    await db.run("DELETE FROM logs");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
