const KEY_MAP = {
  ts: ["timestamp", "time", "date", "datetime", "@timestamp"],
  sourceIp: ["source_ip", "src_ip", "ip", "client_ip", "sourceaddress", "srcip"],
  destIp: ["dest_ip", "destination_ip", "dst_ip", "dstip"],
  user: ["user", "username", "account", "user_name", "actor"],
  event: ["event", "event_type", "action", "activity", "eventtype"],
  status: ["status", "result", "outcome"],
  port: ["port", "dest_port", "dst_port", "destination_port"],
  message: ["message", "msg", "description", "details", "log"],
  bytesOut: ["bytes_out", "bytesout", "bytes_sent", "outbound_bytes"],
};

function findKey(obj, candidates) {
  const keys = Object.keys(obj);
  for (const c of candidates) {
    const hit = keys.find((k) => k.toLowerCase() === c);
    if (hit) return hit;
  }
  return null;
}

// Normalizes one raw uploaded log row (any reasonable field naming) into a
// consistent shape used by the detection engine and stored in Supabase.
export function normalizeLog(raw) {
  const out = { raw };
  for (const [field, candidates] of Object.entries(KEY_MAP)) {
    const k = findKey(raw, candidates);
    out[field] = k ? raw[k] : undefined;
  }
  const parsed = out.ts ? new Date(out.ts) : null;
  out.tsMs = parsed && !isNaN(parsed.getTime()) ? parsed.getTime() : Date.now();
  out.sourceIp = out.sourceIp || "unknown";
  out.destIp = out.destIp || "";
  out.user = out.user || "unknown";
  out.event = (out.event || "").toString();
  out.status = (out.status || "").toString();
  out.message = (out.message || "").toString();
  out.port = out.port !== undefined && out.port !== "" ? Number(out.port) : undefined;
  out.bytesOut = out.bytesOut !== undefined && out.bytesOut !== "" ? Number(out.bytesOut) : undefined;
  return out;
}

export const isLoginEvent = (l) => /login|auth|signin|logon/i.test(l.event) || /login|auth|signin|logon/i.test(l.message);
export const isFailure = (l) => /fail|denied|invalid|reject/i.test(l.status) || /fail|denied|invalid|reject/i.test(l.message);
export const isSuccess = (l) => /success|accept|allow|granted/i.test(l.status) || /success|accept|allow|granted/i.test(l.message);
