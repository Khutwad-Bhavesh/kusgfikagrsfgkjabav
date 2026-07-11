export const MITRE = {
  brute_force:           { id: "T1110", tactic: "Credential Access", technique: "Brute Force" },
  credential_compromise: { id: "T1078", tactic: "Initial Access / Defense Evasion", technique: "Valid Accounts" },
  port_scan:             { id: "T1046", tactic: "Discovery", technique: "Network Service Discovery" },
  privilege_escalation:  { id: "T1068", tactic: "Privilege Escalation", technique: "Exploitation for Privilege Escalation" },
  malware_execution:     { id: "T1059", tactic: "Execution", technique: "Command and Scripting Interpreter" },
  off_hours_access:      { id: "T1078.004", tactic: "Initial Access", technique: "Valid Accounts: Cloud/Local Accounts" },
  data_exfiltration:     { id: "T1041", tactic: "Exfiltration", technique: "Exfiltration Over C2 Channel" },
};

// type name -> { mitreKey, severity } (icon mapping lives client-side in components/icons.js)
export const TYPE_META = {
  "Brute Force Attack":  { key: "brute_force", severity: "High" },
  "Account Compromise":  { key: "credential_compromise", severity: "Critical" },
  "Port Scan":            { key: "port_scan", severity: "Medium" },
  "Privilege Escalation": { key: "privilege_escalation", severity: "Critical" },
  "Malware Execution":    { key: "malware_execution", severity: "Critical" },
  "Off-Hours Access":     { key: "off_hours_access", severity: "Low" },
  "Data Exfiltration":    { key: "data_exfiltration", severity: "High" },
};

export const SEV_ORDER = ["Critical", "High", "Medium", "Low"];
