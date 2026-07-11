// Generates a synthetic log set (benign traffic + 6 seeded attack patterns,
// one per detection rule) so the app is demoable without an upload.
export function genSampleLogs() {
  const now = Date.now();
  const logs = [];
  const users = ["jsmith", "amehta", "rpatel", "svc_backup", "kwong", "admin", "dnair", "tholt"];
  const normalIps = ["10.0.2.14", "10.0.2.31", "10.0.2.55", "192.168.1.20", "192.168.1.44", "10.0.3.9"];
  const hosts = ["prod-web-01", "prod-db-01", "fin-ws-02", "hr-ws-04", "dev-ci-03"];

  const push = (offsetMin, obj) => logs.push({ timestamp: new Date(now - offsetMin * 60000).toISOString(), ...obj });

  for (let i = 0; i < 160; i++) {
    const offset = Math.random() * 60 * 24;
    const user = users[Math.floor(Math.random() * users.length)];
    const ip = normalIps[Math.floor(Math.random() * normalIps.length)];
    const host = hosts[Math.floor(Math.random() * hosts.length)];
    const kind = Math.random();
    if (kind < 0.4) {
      push(offset, { source_ip: ip, dest_ip: host, user, event_type: "login", status: "success",
        message: `User ${user} authenticated successfully on ${host}`, port: 443 });
    } else if (kind < 0.7) {
      push(offset, { source_ip: ip, dest_ip: host, user, event_type: "file_access", status: "success",
        message: `${user} accessed /shared/reports on ${host}`, port: 445 });
    } else {
      push(offset, { source_ip: ip, dest_ip: "0.0.0.0", user, event_type: "firewall", status: "allow",
        message: `Outbound connection allowed from ${ip}`, port: 80 });
    }
  }

  const bfStart = 340;
  for (let i = 0; i < 7; i++) {
    push(bfStart - i * 1.2, { source_ip: "203.0.113.55", dest_ip: "prod-db-01", user: "svc_backup",
      event_type: "login", status: "failed", message: "Authentication failed: invalid password for svc_backup", port: 22 });
  }
  push(bfStart - 9, { source_ip: "203.0.113.55", dest_ip: "prod-db-01", user: "svc_backup",
    event_type: "login", status: "success", message: "User svc_backup authenticated successfully on prod-db-01", port: 22 });

  const psStart = 210;
  const ports = [21, 22, 23, 25, 53, 80, 110, 139, 143, 443, 445, 3306, 3389, 8080];
  ports.forEach((p, idx) => {
    push(psStart - idx * 0.3, { source_ip: "198.51.100.23", dest_ip: "10.0.0.5",
      user: "unknown", event_type: "firewall", status: "deny",
      message: `Connection attempt from 198.51.100.23 to port ${p} blocked`, port: p });
  });

  push(150, { source_ip: "10.0.2.14", dest_ip: "prod-db-01", user: "jsmith",
    event_type: "privilege_change", status: "success",
    message: "User jsmith executed sudo su - to gain root privileges on prod-db-01", port: 22 });

  push(95, { source_ip: "10.0.3.9", dest_ip: "fin-ws-02", user: "kwong",
    event_type: "process_execution", status: "success",
    message: "powershell.exe -enc JABzAGUAYwB1AHIAaQB0AHkA launched, downloading payload from external host", port: 445 });

  const offHoursDate = new Date(now);
  offHoursDate.setHours(3, 14, 0, 0);
  logs.push({ timestamp: offHoursDate.toISOString(), source_ip: "45.33.12.9", dest_ip: "prod-web-01",
    user: "admin", event_type: "login", status: "success",
    message: "User admin authenticated successfully on prod-web-01 from new geolocation", port: 22 });

  push(40, { source_ip: "10.0.2.31", dest_ip: "203.0.113.201", user: "dnair",
    event_type: "file_transfer", status: "success",
    message: "Large outbound file transfer initiated to external host", port: 21, bytes_out: 5_400_000_000 });

  return logs;
}
