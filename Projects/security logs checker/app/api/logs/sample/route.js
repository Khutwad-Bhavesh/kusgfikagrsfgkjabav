import { NextResponse } from "next/server";
import { genSampleLogs } from "@/lib/sampleData";
import { ingestLogs } from "@/lib/ingest";

export const runtime = "nodejs";

export async function POST() {
  try {
    const rows = genSampleLogs();
    const summary = await ingestLogs(rows);
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
