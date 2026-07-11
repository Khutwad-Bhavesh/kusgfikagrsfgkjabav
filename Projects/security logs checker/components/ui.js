export const C = {
  bg: "#000000",
  panel: "rgba(8,10,28,0.78)",
  panelAlt: "rgba(12,14,36,0.88)",
  border: "rgba(79,142,247,0.14)",
  borderSoft: "rgba(79,142,247,0.07)",
  text: "#E8EEFF",
  textMuted: "#8090B8",
  textFaint: "#46527A",
  accent: "#4F8EF7",
  accent2: "#9B6DFF",
  mono: "'Fira Code', 'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace",
  sans: "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
};

export const SEVERITY = {
  Critical: { color: "#FF4D6A", bg: "rgba(255,77,106,0.12)", ring: "rgba(255,77,106,0.35)" },
  High:     { color: "#FF8C42", bg: "rgba(255,140,66,0.12)",  ring: "rgba(255,140,66,0.35)" },
  Medium:   { color: "#FFCC5C", bg: "rgba(255,204,92,0.12)",  ring: "rgba(255,204,92,0.35)" },
  Low:      { color: "#4F8EF7", bg: "rgba(79,142,247,0.12)",  ring: "rgba(79,142,247,0.35)" },
};
export const SEV_ORDER = ["Critical", "High", "Medium", "Low"];

export function SeverityPill({ severity, size = "sm" }) {
  const s = SEVERITY[severity] || SEVERITY.Low;
  const pad = size === "sm" ? "2px 9px" : "4px 12px";
  const fs = size === "sm" ? 11 : 12;
  return (
    <span style={{
      color: s.color, background: s.bg, border: `1px solid ${s.ring}`,
      borderRadius: 999, padding: pad, fontSize: fs, fontFamily: C.mono,
      fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase",
      display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
    }}>
      {severity === "Critical" && (
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.color, animation: "pulseDot 1.4s infinite" }} />
      )}
      {severity}
    </span>
  );
}

export function StatCard({ label, value, sub, color, Icon }) {
  return (
    <div style={{
      background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14,
      backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
      padding: "16px 18px", flex: 1, minWidth: 150, position: "relative", overflow: "hidden",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ color: C.textFaint, fontSize: 11, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
          <div style={{ color: color || C.text, fontSize: 28, fontWeight: 700, fontFamily: C.sans, marginTop: 4, letterSpacing: "-0.02em" }}>{value}</div>
          {sub && <div style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>{sub}</div>}
        </div>
        {Icon && <Icon size={18} color={color || C.textFaint} style={{ opacity: 0.8 }} />}
      </div>
    </div>
  );
}

export function Panel({ title, right, children, style }) {
  return (
    <div style={{
      background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14,
      backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
      padding: 18, ...style
    }}>
      {(title || right) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ color: C.text, fontSize: 13, fontWeight: 600, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: "0.06em" }}>{title}</div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function IconBtn({ children, onClick, active, disabled, style }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
      borderRadius: 8, border: `1px solid ${active ? C.accent : C.border}`,
      background: active ? "rgba(57,230,200,0.08)" : "transparent",
      color: active ? C.accent : C.textMuted, fontFamily: C.sans, fontSize: 13,
      fontWeight: 500, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.6 : 1,
      transition: "all 0.15s", ...style,
    }}>
      {children}
    </button>
  );
}
