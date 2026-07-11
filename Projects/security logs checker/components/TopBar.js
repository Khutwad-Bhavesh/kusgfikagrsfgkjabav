"use client";
import { useRef } from "react";
import { Shield, Upload, RefreshCw, LayoutDashboard, ShieldAlert, Terminal, Loader2 } from "lucide-react";
import { C } from "./ui";

export default function TopBar({
  tab, setTab, incidentsCount, onUpload, onLoadSample, uploading, loadingSample,
  provider, setProvider,
}) {
  const fileRef = useRef(null);

  return (
    <div style={{ borderBottom: `1px solid rgba(79,142,247,0.15)`, background: "rgba(3,3,8,0.80)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, height: 2, width: "40%", background: "linear-gradient(90deg, transparent, #4F8EF7, #9B6DFF, transparent)", animation: "sweep 4s linear infinite" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 22px", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: "linear-gradient(135deg, rgba(79,142,247,0.15), rgba(155,109,255,0.15))", border: `1px solid rgba(155,109,255,0.35)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Shield size={18} color="#9B6DFF" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>SENTINEL <span style={{ color: "#4F8EF7", fontWeight: 700 }}>SOC</span></div>
            <div style={{ fontSize: 10.5, color: C.textFaint, fontFamily: C.mono, letterSpacing: "0.04em" }}>AI THREAT ANALYSIS PLATFORM</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#4F8EF7", fontSize: 11, fontFamily: C.mono, padding: "5px 10px", border: `1px solid rgba(79,142,247,0.25)`, borderRadius: 999 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#9B6DFF", animation: "pulseDot 1.6s infinite" }} />
            LIVE MONITORING
          </div>

          <select value={provider} onChange={(e) => setProvider(e.target.value)} style={{
            background: C.panelAlt, border: `1px solid ${C.border}`, color: C.text, fontSize: 12.5,
            borderRadius: 8, padding: "7px 10px", fontFamily: C.mono, cursor: "pointer",
          }}>
            <option value="openai">OpenAI</option>
            <option value="gemini">Gemini (Google)</option>
          </select>

          <button onClick={onLoadSample} disabled={loadingSample} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 8,
            border: `1px solid ${C.border}`, background: "transparent", color: C.textMuted,
            fontSize: 13, fontWeight: 500, cursor: loadingSample ? "default" : "pointer",
          }}>
            {loadingSample ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <RefreshCw size={14} />}
            Reload Sample
          </button>

          <input ref={fileRef} type="file" accept=".csv,.json" style={{ display: "none" }}
            onChange={(e) => { onUpload(e.target.files[0]); e.target.value = ""; }} />
          <button onClick={() => fileRef.current.click()} disabled={uploading} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 8,
            border: "none", background: "linear-gradient(135deg, #4F8EF7 0%, #9B6DFF 100%)", color: "#fff",
            fontSize: 13, fontWeight: 600, cursor: uploading ? "default" : "pointer",
            boxShadow: "0 0 20px rgba(79,142,247,0.35)",
          }}>
            {uploading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Upload size={14} />}
            Upload Logs
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, padding: "0 22px" }}>
        {[
          { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
          { id: "incidents", label: "Incidents", Icon: ShieldAlert },
          { id: "logs", label: "Logs", Icon: Terminal },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "10px 14px",
            background: "transparent", border: "none", cursor: "pointer",
            color: tab === t.id ? C.text : C.textFaint, fontSize: 13, fontWeight: 500,
            borderBottom: tab === t.id ? `2px solid #4F8EF7` : "2px solid transparent",
          }}>
            <t.Icon size={14} />{t.label}
            {t.id === "incidents" && incidentsCount > 0 && (
              <span style={{ background: "rgba(155,109,255,0.15)", color: "#9B6DFF", fontSize: 10, padding: "1px 6px", borderRadius: 999, fontFamily: C.mono }}>{incidentsCount}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
