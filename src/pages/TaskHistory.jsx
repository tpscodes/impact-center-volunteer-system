// TaskHistory.jsx — Operations Manager: completed task log
import { useNavigate } from "react-router-dom";
import { useSharedTasks } from "../hooks/useSharedTasks";

const GRAY = { dark: "#1F2937", mid: "#374151", soft: "#6B7280", light: "#9CA3AF", border: "#E5E7EB", bg: "#F9FAFB" };

export default function TaskHistory() {
  const navigate = useNavigate();
  const { completedTasks, clearCompletedTasks, synced, error } = useSharedTasks();

  // Sort newest first using the ms timestamp
  const sorted = [...completedTasks].sort((a, b) => (b.completedAtMs || 0) - (a.completedAtMs || 0));

  async function handleClear() {
    if (!window.confirm("Clear all task history? This cannot be undone.")) return;
    await clearCompletedTasks();
  }

  return (
    <div style={{ background: GRAY.bg, minHeight: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ background: GRAY.mid, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => navigate("/manager/dashboard")}
            style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", borderRadius: 8, padding: "6px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            ← Back
          </button>
          <div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Operations Manager</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "white" }}>Task History</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Sync indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.1)", borderRadius: 20, padding: "4px 10px" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: error ? "#EF4444" : synced ? "#86EFAC" : "#FCD34D", animation: synced && !error ? "pulse 2s infinite" : "none" }} />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>{error ? "Offline" : synced ? "Live" : "Syncing…"}</span>
          </div>
          {sorted.length > 0 && (
            <button
              onClick={handleClear}
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.65)", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              Clear History
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: "20px 20px 40px" }}>

        {/* Summary chip */}
        {sorted.length > 0 && (
          <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ background: GRAY.dark, color: "white", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>
              {sorted.length} task{sorted.length !== 1 ? "s" : ""} completed
            </span>
          </div>
        )}

        {sorted.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: GRAY.dark, marginBottom: 6 }}>No completed tasks yet</div>
            <div style={{ fontSize: 13, color: GRAY.light }}>Completed tasks will appear here once volunteers mark them done.</div>
          </div>
        ) : (
          <div style={{ background: "white", borderRadius: 12, border: `1px solid ${GRAY.border}`, overflow: "hidden" }}>

            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1.2fr 72px", padding: "10px 14px", background: GRAY.dark, gap: 8 }}>
              {["TASK", "TAGS", "COMPLETED BY", "TIME"].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "0.06em" }}>{h}</div>
              ))}
            </div>

            {sorted.map((entry, i) => (
              <div
                key={`${entry.id}-${entry.completedAtMs || i}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1.5fr 1.2fr 72px",
                  padding: "12px 14px",
                  gap: 8,
                  borderBottom: i < sorted.length - 1 ? `1px solid ${GRAY.border}` : "none",
                  alignItems: "center",
                  background: i % 2 === 0 ? "white" : "#FAFAFA",
                }}
              >
                {/* Task name */}
                <div style={{ fontSize: 13, fontWeight: 600, color: GRAY.dark, lineHeight: 1.3 }}>
                  {entry.name}
                </div>

                {/* Tags as chips */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {(entry.tags || []).length > 0
                    ? entry.tags.map(tag => (
                        <span
                          key={tag}
                          style={{ background: "#F3F4F6", color: GRAY.soft, borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}
                        >
                          {tag}
                        </span>
                      ))
                    : <span style={{ color: GRAY.light, fontSize: 12 }}>—</span>
                  }
                </div>

                {/* Completed by */}
                <div style={{ fontSize: 12, color: GRAY.soft, fontWeight: 500 }}>
                  {entry.completedBy || "—"}
                </div>

                {/* Time completed */}
                <div style={{ fontSize: 12, color: GRAY.light, fontWeight: 600, whiteSpace: "nowrap" }}>
                  {entry.completedAt || "—"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}
