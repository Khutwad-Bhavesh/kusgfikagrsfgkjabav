import {
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar,
} from "recharts";
import {
  Activity, ShieldAlert, AlertOctagon, AlertTriangle, ShieldCheck,
  ChevronRight, Sparkles, Loader2,
} from "lucide-react";
import { C, SEVERITY, SEV_ORDER, StatCard, Panel, SeverityPill, IconBtn } from "./ui";
import { TYPE_ICON } from "./icons";

export default function DashboardView({
  stats, severityPieData, timelineData, topIps, incidents, setTab, setSelectedIncident,
  briefing, briefingLoading, generateBriefing,
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <StatCard label="Events Ingested" value={stats.total} Icon={Activity} />
        <StatCard label="Incidents Detected" value={stats.incidents} color={C.accent2} Icon={ShieldAlert} />
        <StatCard label="Critical" value={stats.Critical} color={SEVERITY.Critical.color} Icon={AlertOctagon} />
        <StatCard label="High" value={stats.High} color={SEVERITY.High.color} Icon={AlertTriangle} />
        <StatCard label="Open Incidents" value={stats.open} color={C.accent} Icon={ShieldCheck} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18 }}>
        <Panel title="Event Volume">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={timelineData}>
              <defs>
                <linearGradient id="vol" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4F8EF7" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#9B6DFF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={C.borderSoft} vertical={false} />
              <XAxis dataKey="label" stroke={C.textFaint} fontSize={10} tickLine={false} axisLine={{ stroke: C.border }} />
              <YAxis stroke={C.textFaint} fontSize={10} tickLine={false} axisLine={false} width={28} />
              <Tooltip contentStyle={{ background: C.panelAlt, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: C.textMuted }} />
              <Area type="monotone" dataKey="count" stroke="#4F8EF7" strokeWidth={2} fill="url(#vol)" />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Severity Breakdown">
          {severityPieData.length === 0 ? (
            <div style={{ color: C.textFaint, fontSize: 13, padding: "40px 0", textAlign: "center" }}>No incidents detected</div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <ResponsiveContainer width={150} height={150}>
                <PieChart>
                  <Pie data={severityPieData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={65} paddingAngle={3}>
                    {severityPieData.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {severityPieData.map((d) => (
                  <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 2, background: d.color }} />
                    <span style={{ color: C.textMuted }}>{d.name}</span>
                    <span style={{ color: C.text, fontFamily: C.mono, marginLeft: "auto" }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Panel title="Top Source IPs (by activity)">
          {topIps.length === 0 ? (
            <div style={{ color: C.textFaint, fontSize: 13, padding: "20px 0", textAlign: "center" }}>No flagged sources</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={topIps} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="ip" stroke={C.textMuted} fontSize={11} fontFamily={C.mono} tickLine={false} axisLine={false} width={110} />
                <Tooltip contentStyle={{ background: C.panelAlt, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="count" fill={C.accent2} radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="AI SOC Briefing" right={
          <IconBtn onClick={generateBriefing} disabled={briefingLoading} style={{ borderColor: "#9B6DFF", color: "#9B6DFF" }}>
            <Sparkles size={13} />{briefing ? "Refresh" : "Generate"}
          </IconBtn>
        }>
          {briefingLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.textMuted, fontSize: 13 }}>
              <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Drafting shift briefing…
            </div>
          )}
          {!briefingLoading && !briefing && (
            <div style={{ color: C.textFaint, fontSize: 12.5, lineHeight: 1.6 }}>
              Generate an AI-written summary of current threat posture and investigation priorities across all detected incidents.
            </div>
          )}
          {!briefingLoading && briefing && (
            <div>
              {briefing.error ? (
                <div style={{ color: SEVERITY.High.color, fontSize: 13 }}>{briefing.error}</div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 10, color: C.textFaint, fontFamily: C.mono, textTransform: "uppercase" }}>
                      via {briefing.provider}
                    </span>
                  </div>
                  <div style={{ color: C.text, fontSize: 13, lineHeight: 1.6, marginBottom: 10 }}>{briefing.summary}</div>
                  {briefing.priorities?.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {briefing.priorities.map((p, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, fontSize: 12.5, color: C.textMuted }}>
                          <span style={{ color: C.accent2, fontFamily: C.mono }}>{String(i + 1).padStart(2, "0")}</span>{p}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Incident Timeline" right={
        <button onClick={() => setTab("incidents")} style={{ background: "none", border: "none", color: C.accent, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
          View all <ChevronRight size={13} />
        </button>
      }>
        {incidents.length === 0 ? (
          <div style={{ color: C.textFaint, fontSize: 13, padding: "20px 0", textAlign: "center" }}>No incidents detected in current logs.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {incidents.slice(0, 6).map((inc, idx) => {
              const Icon = TYPE_ICON[inc.type];
              return (
                <div key={inc.id} onClick={() => { setSelectedIncident(inc); setTab("incidents"); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "10px 4px",
                    borderBottom: idx < 5 ? `1px solid ${C.borderSoft}` : "none", cursor: "pointer",
                  }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: SEVERITY[inc.severity].bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={14} color={SEVERITY[inc.severity].color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{inc.type}</div>
                    <div style={{ fontSize: 11.5, color: C.textFaint, fontFamily: C.mono }}>
                      {inc.source_ip} → {inc.dest_ip || "internal"} · {new Date(inc.last_seen).toLocaleString()}
                    </div>
                  </div>
                  <SeverityPill severity={inc.severity} />
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
