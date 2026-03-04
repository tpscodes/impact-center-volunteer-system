// ManagerDashboard.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const GRAY = { dark: "#1F2937", mid: "#374151", soft: "#6B7280", light: "#9CA3AF", border: "#E5E7EB", bg: "#F9FAFB" };

function StatusBadge({ status }) {
  const cfg = {
    available: { label: "Available", bg: "#F3F4F6", color: "#374151" },
    "in-progress": { label: "In Progress", bg: "#D1D5DB", color: "#1F2937" },
    complete: { label: "Complete", bg: "#374151", color: "white" },
  }[status] || { label: status, bg: "#F3F4F6", color: "#374151" };
  return (
    <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
      {cfg.label}
    </span>
  );
}

function PriorityDot({ priority }) {
  const color = priority === "Urgent" ? "#4B5563" : priority === "High" ? "#6B7280" : "#D1D5DB";
  return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: color, marginRight: 6 }} />;
}

export default function ManagerDashboard({ tasks, onDeleteTask, onResetTasks, synced, error }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const active = tasks.filter(t => t.status !== "complete");
  const completed = tasks.filter(t => t.status === "complete");
  const inProgress = tasks.filter(t => t.status === "in-progress");

  const filtered = tasks.filter(t =>
    !search || t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.item?.toLowerCase().includes(search.toLowerCase()) ||
    t.destination?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ background: GRAY.bg, minHeight: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ background: GRAY.mid, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Operations Manager</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "white" }}>Dashboard</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Welcome, Jason</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Sync indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.1)", borderRadius: 20, padding: "4px 10px" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: error ? "#EF4444" : synced ? "#86EFAC" : "#FCD34D", animation: synced && !error ? "pulse 2s infinite" : "none" }} />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>{error ? "Offline" : synced ? "Live" : "Syncing…"}</span>
          </div>
          <button onClick={() => navigate("/")} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", borderRadius: 8, padding: "7px 14px", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>Logout</button>
        </div>
      </div>

      <div style={{ padding: "20px 20px 40px" }}>

        {/* Metric cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
          {[
            { label: "Active Tasks", value: active.length, icon: "📋" },
            { label: "In Progress", value: inProgress.length, icon: "🔄" },
            { label: "Completed", value: completed.length, icon: "✅" },
          ].map(m => (
            <div key={m.label} style={{ background: "white", borderRadius: 12, padding: "14px 12px", border: `1px solid ${GRAY.border}`, textAlign: "center" }}>
              <div style={{ fontSize: 20 }}>{m.icon}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: GRAY.dark, lineHeight: 1.2 }}>{m.value}</div>
              <div style={{ fontSize: 11, color: GRAY.light, fontWeight: 600 }}>{m.label}</div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <button onClick={() => navigate("/manager/tasks")}
            style={{ flex: 2, padding: "12px 0", background: GRAY.dark, color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            + Create New Task
          </button>
          <button onClick={onResetTasks}
            style={{ flex: 1, padding: "12px 0", background: "white", color: GRAY.soft, border: `2px solid ${GRAY.border}`, borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            ↺ Reset Demo
          </button>
        </div>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 14 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: GRAY.light, fontSize: 14 }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks…"
            style={{ width: "100%", padding: "10px 12px 10px 34px", border: `1.5px solid ${GRAY.border}`, borderRadius: 8, fontSize: 14, color: GRAY.dark, background: "white", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {/* Task table */}
        <div style={{ background: "white", borderRadius: 12, border: `1px solid ${GRAY.border}`, overflow: "hidden" }}>
          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 80px", padding: "10px 14px", background: GRAY.dark, gap: 8 }}>
            {["TASK", "LOCATION", "ASSIGNED TO", "STATUS"].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "0.06em" }}>{h}</div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ padding: 32, textAlign: "center", color: GRAY.light, fontSize: 14 }}>No tasks yet — create one above!</div>
          )}

          {filtered.map((t, i) => (
            <div key={t.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 80px", padding: "12px 14px", gap: 8, borderBottom: i < filtered.length - 1 ? `1px solid ${GRAY.border}` : "none", alignItems: "center", background: t.status === "complete" ? "#FAFAFA" : "white" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.status === "complete" ? GRAY.light : GRAY.dark, display: "flex", alignItems: "center" }}>
                  <PriorityDot priority={t.priority} />
                  {t.name}
                </div>
                <div style={{ fontSize: 11, color: GRAY.light, marginTop: 1 }}>{t.estimatedTime}</div>
              </div>
              <div style={{ fontSize: 12, color: GRAY.soft }}>{t.destination || "—"}</div>
              <div style={{ fontSize: 12, color: GRAY.soft }}>{t.assignedName || "Open"}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                <StatusBadge status={t.status} />
                {t.status !== "complete" && (
                  <button onClick={() => onDeleteTask(t.id)}
                    style={{ fontSize: 10, color: GRAY.light, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Live updates note */}
        <div style={{ marginTop: 12, textAlign: "center", fontSize: 11, color: GRAY.light }}>
          🔄 Updates every 2.5 seconds across all devices
        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}
