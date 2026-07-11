import { TYPE_META } from "./mitre";
import { isLoginEvent, isFailure, isSuccess } from "./normalize";

const MALWARE_KEYWORDS = ["powershell -enc", "-encodedcommand", "mimikatz", "certutil -urlcache",
  "invoke-expression", "iex(", "wget http", "curl http://", "base64 -d", "reverse shell",
  "nc -e", "/bin/sh -i", ".onion", "cobaltstrike", "meterpreter"];
const PRIV_KEYWORDS = ["sudo su", "privilege escalation", "added to administrators group",
  "granted root", "elevation of privilege", "usermod -ag sudo", "setuid", "runas /user:administrator"];

let incCounter = 0;

function makeIncident({ type, sourceIp, user, destIp, logsInvolved, description, severity }) {
  const meta = TYPE_META[type];
  return {
    id: `INC-${String(++incCounter).padStart(4, "0")}`,
    type,
    mitreKey: meta.key,
    severity: severity || meta.severity,
    sourceIp, user, destIp,
    firstSeen: Math.min(...logsInvolved.map((l) => l.tsMs)),
    lastSeen: Math.max(...logsInvolved.map((l) => l.tsMs)),
    logs: logsInvolved,
    description,
    status: "Open",
  };
}

// logs: array of normalized log objects that MUST include a stable `id`
// (the Supabase row id) plus tsMs, sourceIp, destIp, user, event, status,
// port, message, bytesOut. Returns an array of incident objects.
export function runDetection(logs) {
  incCounter = 0;
  const sorted = [...logs].sort((a, b) => a.tsMs - b.tsMs);
  const incidents = [];

  // --- Brute force / account compromise, grouped by source IP ---
  const failsByIp = {};
  sorted.forEach((l) => {
    if (isLoginEvent(l) && isFailure(l)) (failsByIp[l.sourceIp] ||= []).push(l);
  });
  Object.entries(failsByIp).forEach(([ip, fails]) => {
    let i = 0;
    while (i < fails.length) {
      const windowEnd = fails[i].tsMs + 15 * 60000;
      const windowFails = fails.filter((f) => f.tsMs >= fails[i].tsMs && f.tsMs <= windowEnd);
      if (windowFails.length >= 5) {
        const success = sorted.find(
          (l) => l.sourceIp === ip && isLoginEvent(l) && isSuccess(l) &&
            l.tsMs >= windowFails[0].tsMs && l.tsMs <= windowFails[windowFails.length - 1].tsMs + 30 * 60000
        );
        const involved = success ? [...windowFails, success] : windowFails;
        incidents.push(makeIncident({
          type: success ? "Account Compromise" : "Brute Force Attack",
          sourceIp: ip, user: windowFails[0].user, destIp: windowFails[0].destIp,
          logsInvolved: involved,
          description: success
            ? `${windowFails.length} failed login attempts from ${ip} targeting "${windowFails[0].user}" were followed by a successful authentication — a strong indicator of credential compromise.`
            : `${windowFails.length} failed login attempts detected from ${ip} against account "${windowFails[0].user}" within a 15-minute window.`,
        }));
        i += windowFails.length;
      } else i++;
    }
  });

  // --- Port scan, grouped by source IP + dest IP ---
  const connByPair = {};
  sorted.forEach((l) => {
    if (l.port !== undefined && l.port !== null && !isNaN(l.port)) {
      const key = `${l.sourceIp}|${l.destIp}`;
      (connByPair[key] ||= []).push(l);
    }
  });
  Object.entries(connByPair).forEach(([key, entries]) => {
    const [ip, dest] = key.split("|");
    let i = 0;
    while (i < entries.length) {
      const windowEnd = entries[i].tsMs + 10 * 60000;
      const windowEntries = entries.filter((e) => e.tsMs >= entries[i].tsMs && e.tsMs <= windowEnd);
      const distinctPorts = new Set(windowEntries.map((e) => e.port));
      if (distinctPorts.size >= 8) {
        incidents.push(makeIncident({
          type: "Port Scan", sourceIp: ip, user: windowEntries[0].user, destIp: dest,
          logsInvolved: windowEntries,
          description: `${ip} probed ${distinctPorts.size} distinct ports on ${dest || "internal hosts"} within 10 minutes, consistent with network reconnaissance.`,
        }));
        i += windowEntries.length;
      } else i++;
    }
  });

  // --- Privilege escalation & malware execution keyword scans ---
  sorted.forEach((l) => {
    const msg = (l.message || "").toLowerCase();
    if (PRIV_KEYWORDS.some((k) => msg.includes(k))) {
      incidents.push(makeIncident({
        type: "Privilege Escalation", sourceIp: l.sourceIp, user: l.user, destIp: l.destIp,
        logsInvolved: [l], description: l.message,
      }));
    }
    if (MALWARE_KEYWORDS.some((k) => msg.includes(k))) {
      incidents.push(makeIncident({
        type: "Malware Execution", sourceIp: l.sourceIp, user: l.user, destIp: l.destIp,
        logsInvolved: [l], description: l.message,
      }));
    }
  });

  // --- Off-hours access for privileged accounts ---
  sorted.forEach((l) => {
    if (isLoginEvent(l) && isSuccess(l) && /^(admin|root|administrator)/i.test(l.user || "")) {
      const hour = new Date(l.tsMs).getHours();
      if (hour >= 0 && hour < 5) {
        incidents.push(makeIncident({
          type: "Off-Hours Access", sourceIp: l.sourceIp, user: l.user, destIp: l.destIp,
          logsInvolved: [l],
          description: `Privileged account "${l.user}" authenticated at ${new Date(l.tsMs).toLocaleTimeString()} from ${l.sourceIp}, outside normal business hours.`,
        }));
      }
    }
  });

  // --- Data exfiltration via large outbound transfer ---
  sorted.forEach((l) => {
    if (l.bytesOut && l.bytesOut > 1_000_000_000) {
      incidents.push(makeIncident({
        type: "Data Exfiltration", sourceIp: l.sourceIp, user: l.user, destIp: l.destIp,
        logsInvolved: [l],
        description: `${(l.bytesOut / 1e9).toFixed(1)} GB transferred from ${l.sourceIp} to external host ${l.destIp}, well above baseline outbound volume.`,
      }));
    }
  });

  return incidents.sort((a, b) => b.lastSeen - a.lastSeen);
}
