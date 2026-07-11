import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = await getDb();
    const data = await db.all("SELECT * FROM incidents ORDER BY last_seen DESC");
    const incidents = data.map(i => {
      if (i.log_ids && typeof i.log_ids === 'string') {
        try { i.log_ids = JSON.parse(i.log_ids); } catch(e){}
      }
      return i;
    });
    return NextResponse.json({ incidents });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
