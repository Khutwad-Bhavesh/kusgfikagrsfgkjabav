import { Crosshair, AlertOctagon, Radio, ShieldAlert, Zap, Clock, Database } from "lucide-react";

// Incident type name -> icon component (kept out of lib/detection.js since
// that module also runs server-side, where lucide-react/React aren't used).
export const TYPE_ICON = {
  "Brute Force Attack": Crosshair,
  "Account Compromise": AlertOctagon,
  "Port Scan": Radio,
  "Privilege Escalation": ShieldAlert,
  "Malware Execution": Zap,
  "Off-Hours Access": Clock,
  "Data Exfiltration": Database,
};
