import { NextResponse } from "next/server";
import Papa from "papaparse";
import { ingestLogs } from "@/lib/ingest";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const text = await file.text();
    const isJson = file.name.toLowerCase().endsWith(".json");
    let rows = [];

    if (isJson) {
      const parsed = JSON.parse(text);
      rows = Array.isArray(parsed) ? parsed : parsed.logs || [];
    } else {
      const result = Papa.parse(text, { header: true, skipEmptyLines: true });
      if (result.errors?.length) {
        return NextResponse.json({ error: `CSV parse error: ${result.errors[0].message}` }, { status: 400 });
      }
      rows = result.data;
    }

    if (!rows.length) {
      return NextResponse.json({ error: "No log rows found in the uploaded file." }, { status: 400 });
    }

    const summary = await ingestLogs(rows);
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
