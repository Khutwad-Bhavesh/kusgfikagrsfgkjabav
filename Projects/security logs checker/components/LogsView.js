import { Search } from "lucide-react";
import { C, SEVERITY, Panel } from "./ui";
import { isFailure } from "@/lib/normalize";

export default function LogsView({ logs, search, setSearch, total }) {
  return (
    <Panel title="Log Search & Filter" right={<span style={{ color: C.textFaint, fontSize: 11, fontFamily: C.mono }}>Showing {logs.length} of {total}</span>}>
      <div style={{ position: "relative", marginBottom: 14 }}>
        <Search size={15} color={C.textFaint} style={{ position: "absolute", left: 12, top: 11 }} />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by IP, user, event, message…"
          style={{
            width: "100%", background: C.panelAlt, border: `1px solid ${C.border}`, borderRadius: 8,
            padding: "9px 12px 9px 34px", color: C.text, fontSize: 13, fontFamily: "inherit",
          }} />
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {["Time", "Source IP", "Destination", "User", "Event", "Status", "Message"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: C.textFaint, fontFamily: C.mono, fontSize: 10.5, textTransform: "uppercase", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
                <td style={{ padding: "8px 10px", color: C.textFaint, fontFamily: C.mono, whiteSpace: "nowrap" }}>{new Date(l.ts).toLocaleString()}</td>
                <td style={{ padding: "8px 10px", color: C.accent, fontFamily: C.mono, whiteSpace: "nowrap" }}>{l.source_ip}</td>
                <td style={{ padding: "8px 10px", color: C.textMuted, fontFamily: C.mono, whiteSpace: "nowrap" }}>{l.dest_ip || "—"}</td>
                <td style={{ padding: "8px 10px", color: C.text, whiteSpace: "nowrap" }}>{l.user}</td>
                <td style={{ padding: "8px 10px", color: C.textMuted, whiteSpace: "nowrap" }}>{l.event || "—"}</td>
                <td style={{ padding: "8px 10px" }}>
                  <span style={{
                    fontSize: 10.5, fontFamily: C.mono, padding: "2px 7px", borderRadius: 999,
                    background: isFailure(l) ? SEVERITY.High.bg : "rgba(57,230,200,0.08)",
                    color: isFailure(l) ? SEVERITY.High.color : C.accent,
                  }}>{l.status || "—"}</span>
                </td>
                <td style={{ padding: "8px 10px", color: C.textMuted, maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <div style={{ color: C.textFaint, fontSize: 13, padding: "30px 0", textAlign: "center" }}>No logs match your search.</div>}
      </div>
    </Panel>
  );
}
