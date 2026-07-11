"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { C, SEV_ORDER } from "./ui";
import TopBar from "./TopBar";
import DashboardView from "./DashboardView";
import IncidentsView from "./IncidentsView";
import LogsView from "./LogsView";
import { Vortex } from "./ui/vortex";

export default function SocApp() {
  const searchParams = useSearchParams();
  const [logs, setLogs] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [tab, setTab] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState("All");
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [incidentLogs, setIncidentLogs] = useState({});
  const [aiReports, setAiReports] = useState({});
  const [aiLoading, setAiLoading] = useState({});
  const [aiErrors, setAiErrors] = useState({});
  const [briefing, setBriefing] = useState(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [provider, setProvider] = useState("openai");
  const [uploading, setUploading] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);
  const [globalError, setGlobalError] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const sampleLoadedRef = useRef(false);

  const fetchLogs = useCallback(async () => {
    const res = await fetch("/api/logs");
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    setLogs(data.logs || []);
  }, []);

  const fetchIncidents = useCallback(async () => {
    const res = await fetch("/api/incidents");
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    setIncidents(data.incidents || []);
  }, []);

  const refreshAll = useCallback(async () => {
    try {
      setGlobalError(null);
      await Promise.all([fetchLogs(), fetchIncidents()]);
    } catch (err) {
      setGlobalError(err.message);
    }
  }, [fetchLogs, fetchIncidents]);

  // Initial load — no auto seeding. If ?sample=1 is set, load sample data once.
  useEffect(() => {
    (async () => {
      try {
        setGlobalError(null);
        const wantSample = searchParams.get("sample") === "1";
        if (wantSample && !sampleLoadedRef.current) {
          sampleLoadedRef.current = true;
          await fetch("/api/logs/sample", { method: "POST" });
        }
        await refreshAll();
      } catch (err) {
        setGlobalError(err.message);
      } finally {
        setInitializing(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lazily fetch related logs for whichever incident is selected.
  useEffect(() => {
    if (!selectedIncident || incidentLogs[selectedIncident.id]) return;
    (async () => {
      try {
        const res = await fetch(`/api/incidents/${selectedIncident.id}`);
        const data = await res.json();
        if (data.logs) {
          setIncidentLogs((s) => ({ ...s, [selectedIncident.id]: data.logs }));
        }
      } catch {
        /* non-fatal */
      }
    })();
  }, [selectedIncident, incidentLogs]);

  const stats = useMemo(() => {
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    incidents.forEach((i) => { counts[i.severity] = (counts[i.severity] || 0) + 1; });
    return {
      total: logs.length, incidents: incidents.length, ...counts,
      open: incidents.filter((i) => i.status === "Open").length,
    };
  }, [logs, incidents]);

  const severityPieData = useMemo(() => {
    const SEVERITY_COLORS = { Critical: "#FF4D5E", High: "#FF9B45", Medium: "#FFD166", Low: "#39E6C8" };
    return SEV_ORDER
      .map((s) => ({ name: s, value: stats[s] || 0, color: SEVERITY_COLORS[s] }))
      .filter((d) => d.value > 0);
  }, [stats]);

  const timelineData = useMemo(() => {
    const buckets = {};
    logs.forEach((l) => {
      const h = new Date(l.ts);
      h.setMinutes(0, 0, 0);
      const key = h.getTime();
      buckets[key] = (buckets[key] || 0) + 1;
    });
    return Object.entries(buckets)
      .map(([k, v]) => ({ t: Number(k), count: v }))
      .sort((a, b) => a.t - b.t)
      .map((d) => ({ label: new Date(d.t).toLocaleTimeString([], { hour: "2-digit" }), count: d.count }));
  }, [logs]);

  const topIps = useMemo(() => {
    const counts = {};
    incidents.forEach((i) => { counts[i.source_ip] = (counts[i.source_ip] || 0) + (i.log_ids?.length || 1); });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([ip, count]) => ({ ip, count }));
  }, [incidents]);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (search) {
        const s = search.toLowerCase();
        const hay = `${l.source_ip} ${l.dest_ip} ${l.user} ${l.event} ${l.status} ${l.message}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    }).slice(0, 80);
  }, [logs, search]);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((i) => sevFilter === "All" || i.severity === sevFilter);
  }, [incidents, sevFilter]);

  const handleUpload = useCallback(async (file) => {
    if (!file) return;
    setUploading(true);
    setGlobalError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/logs/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSelectedIncident(null);
      setIncidentLogs({});
      setAiReports({});
      setTab("dashboard");
      await refreshAll();
    } catch (err) {
      setGlobalError(err.message);
    } finally {
      setUploading(false);
    }
  }, [refreshAll]);

  const handleLoadSample = useCallback(async () => {
    setLoadingSample(true);
    setGlobalError(null);
    try {
      const res = await fetch("/api/logs/sample", { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSelectedIncident(null);
      setIncidentLogs({});
      setAiReports({});
      await refreshAll();
    } catch (err) {
      setGlobalError(err.message);
    } finally {
      setLoadingSample(false);
    }
  }, [refreshAll]);

  const generateReport = async (incident) => {
    setAiLoading((s) => ({ ...s, [incident.id]: true }));
    setAiErrors((s) => ({ ...s, [incident.id]: null }));
    try {
      const res = await fetch("/api/ai/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId: incident.id, provider }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiReports((s) => ({ ...s, [incident.id]: { data: data.report, provider: data.provider } }));
    } catch (err) {
      setAiErrors((s) => ({ ...s, [incident.id]: err.message || "Unknown error" }));
    } finally {
      setAiLoading((s) => ({ ...s, [incident.id]: false }));
    }
  };

  const generateBriefing = async () => {
    setBriefingLoading(true);
    setBriefing(null);
    try {
      const res = await fetch("/api/ai/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setBriefing({ ...data.briefing, provider: data.provider });
    } catch (err) {
      setBriefing({ summary: "", error: err.message, priorities: [] });
    } finally {
      setBriefingLoading(false);
    }
  };

  const hasData = logs.length > 0 || incidents.length > 0;

  return (
    <div className="relative min-h-screen" style={{ background: "#020617", fontFamily: C.sans, color: C.text }}>
      {/* Vortex lives absolutely behind everything */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Vortex
          backgroundColor="#000000"
          rangeY={400}
          particleCount={350}
          baseHue={240}
          baseSpeed={0.0}
          rangeSpeed={0.8}
          baseRadius={0.8}
          rangeRadius={1.5}
          containerClassName="w-full h-full"
          className="w-full h-full"
        />
      </div>

      {/* App UI on top */}
      <div className="relative z-10">
        <TopBar
          tab={tab} setTab={setTab} incidentsCount={incidents.length}
          onUpload={handleUpload} onLoadSample={handleLoadSample}
          uploading={uploading} loadingSample={loadingSample}
          provider={provider} setProvider={setProvider}
        />

        <div style={{ padding: 22, maxWidth: 1320, margin: "0 auto" }}>
          {globalError && (
            <div style={{
              background: "rgba(255,77,94,0.1)", border: "1px solid rgba(255,77,94,0.35)",
              color: "#FF4D5E", borderRadius: 10, padding: "12px 16px", fontSize: 13, marginBottom: 18,
            }}>
              <strong>Error:</strong> {globalError}
            </div>
          )}

          {initializing ? (
            <div style={{ color: C.textFaint, fontSize: 13, padding: "60px 0", textAlign: "center" }}>
              Loading data…
            </div>
          ) : !hasData && tab === "dashboard" ? (
            /* ── Clean empty state ── */
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              minHeight: "65vh", gap: 20, textAlign: "center",
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: 18,
                background: "rgba(79,142,247,0.08)", border: "1px solid rgba(79,142,247,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4F8EF7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 8 }}>No logs loaded yet</div>
                <div style={{ fontSize: 14, color: C.textFaint, maxWidth: 380, lineHeight: 1.6 }}>
                  Upload a CSV or JSON log file, or load the built-in sample dataset to see threat detection in action.
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
                <button
                  onClick={handleLoadSample}
                  disabled={loadingSample}
                  style={{
                    padding: "10px 22px", borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: "pointer",
                    background: "rgba(79,142,247,0.1)", border: "1px solid rgba(79,142,247,0.3)", color: "#4F8EF7",
                    transition: "all 0.2s",
                  }}
                >
                  {loadingSample ? "Loading…" : "Load Sample Dataset"}
                </button>
              </div>
            </div>
          ) : (
            <>
              {tab === "dashboard" && (
                <DashboardView
                  stats={stats} severityPieData={severityPieData} timelineData={timelineData}
                  topIps={topIps} incidents={incidents} setTab={setTab} setSelectedIncident={setSelectedIncident}
                  briefing={briefing} briefingLoading={briefingLoading} generateBriefing={generateBriefing}
                />
              )}
              {tab === "incidents" && (
                <IncidentsView
                  incidents={filteredIncidents} sevFilter={sevFilter} setSevFilter={setSevFilter}
                  selected={selectedIncident} setSelected={setSelectedIncident}
                  generateReport={generateReport} aiReports={aiReports} aiLoading={aiLoading} aiErrors={aiErrors}
                  incidentLogs={incidentLogs} provider={provider === "gemini" ? "Gemini" : "OpenAI"}
                />
              )}
              {tab === "logs" && (
                <LogsView logs={filteredLogs} search={search} setSearch={setSearch} total={logs.length} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
