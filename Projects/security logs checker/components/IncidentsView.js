import { useState } from "react";
import { X, Sparkles, CheckCircle2, Loader2 } from "lucide-react";
import { C, SEVERITY, SEV_ORDER, Panel, SeverityPill } from "./ui";
import { TYPE_ICON } from "./icons";
import { MITRE } from "@/lib/mitre";

function AIReportCard({ report, error, loading }) {
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: C.textMuted, fontSize: 13, padding: "14px 0" }}>
        <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
        Analyzing incident…
      </div>
    );
  }
  if (error) {
    return <div style={{ color: SEVERITY.High.color, fontSize: 13, padding: "10px 0" }}>AI analysis failed: {error}</div>;
  }
  if (!report) return null;
  const { data, provider } = report;
  return (
    <div style={{ marginTop: 14, borderTop: `1px solid ${C.borderSoft}`, paddingTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
        <Sparkles size={14} color={C.accent2} />
        <span style={{ color: C.accent2, fontSize: 12, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
          AI Analysis · {provider}
        </span>
      </div>
      <div style={{ color: C.text, fontSize: 13.5, lineHeight: 1.6, marginBottom: 10 }}>{data.summary}</div>
      {data.attack_narrative && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: C.textFaint, fontSize: 11, fontFamily: C.mono, textTransform: "uppercase", marginBottom: 4 }}>Attack Pattern</div>
          <div style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.6 }}>{data.attack_narrative}</div>
        </div>
      )}
      {Array.isArray(data.mitre) && data.mitre.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: C.textFaint, fontSize: 11, fontFamily: C.mono, textTransform: "uppercase", marginBottom: 6 }}>MITRE ATT&CK</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {data.mitre.map((m, i) => (
              <div key={i} style={{ background: C.panelAlt, border: `1px solid ${C.borderSoft}`, borderRadius: 8, padding: "6px 10px", fontSize: 12 }}>
                <span style={{ color: C.accent, fontFamily: C.mono, fontWeight: 700 }}>{m.id}</span>
                <span style={{ color: C.textMuted }}> · {m.tactic} — {m.technique}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {Array.isArray(data.remediation) && data.remediation.length > 0 && (
        <div>
          <div style={{ color: C.textFaint, fontSize: 11, fontFamily: C.mono, textTransform: "uppercase", marginBottom: 6 }}>Recommended Remediation</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {data.remediation.map((r, i) => (
              <div key={i} style={{ display: "flex", gap: 8, fontSize: 13, color: C.text }}>
                <CheckCircle2 size={14} color={C.accent} style={{ marginTop: 2, flexShrink: 0 }} />
                <span>{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function IncidentsView({
  incidents, sevFilter, setSevFilter, selected, setSelected,
  generateReport, aiReports, aiLoading, aiErrors, incidentLogs, provider,
}) {
  const active = selected && incidents.find((i) => i.id === selected.id);
  const activeLogs = active ? (incidentLogs[active.id] || []) : [];

  return (
    <div style={{ display: "grid", gridTemplateColumns: active ? "1fr 1.1fr" : "1fr", gap: 18 }}>
      <Panel title="Incidents" right={
        <div style={{ display: "flex", gap: 6 }}>
          {["All", ...SEV_ORDER].map((s) => (
            <button key={s} onClick={() => setSevFilter(s)} style={{
              fontSize: 11, padding: "4px 10px", borderRadius: 999, cursor: "pointer",
              border: `1px solid ${sevFilter === s ? (SEVERITY[s]?.color || C.accent) : C.border}`,
              background: sevFilter === s ? (SEVERITY[s]?.bg || "rgba(57,230,200,0.08)") : "transparent",
              color: sevFilter === s ? (SEVERITY[s]?.color || C.accent) : C.textMuted, fontFamily: C.mono,
            }}>{s}</button>
          ))}
        </div>
      }>
        {incidents.length === 0 ? (
          <div style={{ color: C.textFaint, fontSize: 13, padding: "30px 0", textAlign: "center" }}>No incidents match this filter.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 640, overflowY: "auto" }}>
            {incidents.map((inc) => {
              const Icon = TYPE_ICON[inc.type];
              return (
                <div key={inc.id} onClick={() => setSelected(inc)} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px",
                  borderRadius: 10, cursor: "pointer",
                  border: `1px solid ${active?.id === inc.id ? SEVERITY[inc.severity].ring : C.borderSoft}`,
                  background: active?.id === inc.id ? C.panelAlt : "transparent",
                  borderLeft: `3px solid ${SEVERITY[inc.severity].color}`,
                }}>
                  <Icon size={16} color={SEVERITY[inc.severity].color} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{inc.type}</span>
                      <span style={{ fontSize: 10.5, color: C.textFaint, fontFamily: C.mono, flexShrink: 0 }}>{inc.id}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: C.textFaint, fontFamily: C.mono, marginTop: 2 }}>{inc.source_ip} · {inc.user}</div>
                  </div>
                  <SeverityPill severity={inc.severity} />
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {active && (
        <Panel title={active.id} right={
          <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textFaint }}>
            <X size={16} />
          </button>
        }>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 9, background: SEVERITY[active.severity].bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {(() => { const Icon = TYPE_ICON[active.type]; return <Icon size={19} color={SEVERITY[active.severity].color} />; })()}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{active.type}</div>
              <SeverityPill severity={active.severity} size="md" />
            </div>
          </div>

          <div style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.6, marginBottom: 14 }}>{active.description}</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {[
              ["Source IP", active.source_ip], ["Destination", active.dest_ip || "internal"],
              ["Affected User", active.user], ["Related Events", (active.log_ids || []).length],
              ["First Seen", new Date(active.first_seen).toLocaleString()],
              ["Last Seen", new Date(active.last_seen).toLocaleString()],
            ].map(([label, val]) => (
              <div key={label} style={{ background: C.panelAlt, border: `1px solid ${C.borderSoft}`, borderRadius: 8, padding: "8px 10px" }}>
                <div style={{ fontSize: 10, color: C.textFaint, fontFamily: C.mono, textTransform: "uppercase" }}>{label}</div>
                <div style={{ fontSize: 12.5, color: C.text, fontFamily: C.mono, marginTop: 2, wordBreak: "break-all" }}>{val}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: C.textFaint, fontFamily: C.mono, textTransform: "uppercase", marginBottom: 6 }}>Baseline MITRE ATT&CK</div>
            <div style={{ background: C.panelAlt, border: `1px solid ${C.borderSoft}`, borderRadius: 8, padding: "8px 10px", display: "inline-flex", gap: 6, fontSize: 12 }}>
              <span style={{ color: C.accent, fontFamily: C.mono, fontWeight: 700 }}>{MITRE[active.mitre_key].id}</span>
              <span style={{ color: C.textMuted }}>{MITRE[active.mitre_key].tactic} — {MITRE[active.mitre_key].technique}</span>
            </div>
          </div>

          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 10, color: C.textFaint, fontFamily: C.mono, textTransform: "uppercase", marginBottom: 6 }}>Related Log Events</div>
            <div style={{ maxHeight: 130, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
              {activeLogs.length === 0 && (
                <div style={{ fontSize: 11.5, color: C.textFaint, fontFamily: C.mono }}>Loading related events…</div>
              )}
              {activeLogs.slice(0, 12).map((l) => (
                <div key={l.id} style={{ fontSize: 11, fontFamily: C.mono, color: C.textMuted, background: C.panelAlt, borderRadius: 6, padding: "5px 8px" }}>
                  <span style={{ color: C.textFaint }}>{new Date(l.ts).toLocaleString()}</span> · {l.message || l.event}
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => generateReport(active)} disabled={aiLoading[active.id]} style={{
            marginTop: 14, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            background: "rgba(124,140,255,0.1)", border: `1px solid ${C.accent2}`, color: C.accent2,
            borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 600, cursor: aiLoading[active.id] ? "default" : "pointer",
          }}>
            <Sparkles size={14} />
            {aiReports[active.id] ? `Regenerate AI Report (${provider})` : `Generate AI Incident Report (${provider})`}
          </button>

          <AIReportCard report={aiReports[active.id]} error={aiErrors[active.id]} loading={aiLoading[active.id]} />
        </Panel>
      )}
    </div>
  );
}
