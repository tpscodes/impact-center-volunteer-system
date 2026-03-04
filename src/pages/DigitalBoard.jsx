// DigitalBoard.jsx — Prof. Amy's TV display
// Shows all tasks live, auto-refreshing. Optimized for large screen / projector.
import { useEffect, useState } from "react";

const GRAY = { dark: "#1F2937", mid: "#374151", soft: "#6B7280", light: "#9CA3AF", border: "#E5E7EB", bg: "#F3F4F6" };

function TaskCard({ task }) {
  const [flash, setFlash] = useState(false);

  // Flash animation when status changes
  useEffect(() => {
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 600);
    return () => clearTimeout(t);
  }, [task.status]);

  const statusStyle = {
    available: { border: "2px solid #E5E7EB", bg: "white", badge: "#F3F4F6", badgeText: "#374151", label: "Available" },
    "in-progress": { border: "2px solid #9CA3AF", bg: "#F9FAFB", badge: "#374151", badgeText: "white", label: "In Progress" },
    complete: { border: "2px solid #374151", bg: "#1F2937", badge: "#374151", badgeText: "white", label: "Complete" },
  }[task.status] || { border: "2px solid #E5E7EB", bg: "white", badge: "#F3F4F6", badgeText: "#374151", label: task.status };

  const isComplete = task.status === "complete";

  return (
    <div style={{
      background: statusStyle.bg,
      border: statusStyle.border,
      borderRadius: 14,
      padding: "16px 18px",
      transition: "all 0.4s ease",
      opacity: isComplete ? 0.6 : 1,
      transform: flash ? "scale(1.02)" : "scale(1)",
      boxShadow: task.status === "in-progress" ? "0 4px 16px rgba(0,0,0,0.12)" : "0 1px 4px rgba(0,0,0,0.06)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: isComplete ? GRAY.light : GRAY.dark, lineHeight: 1.3, flex: 1 }}>
          {task.name}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, marginLeft: 8 }}>
          <span style={{ background: statusStyle.badge, color: statusStyle.badgeText, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
            {statusStyle.label}
          </span>
          <span style={{ fontSize: 10, color: GRAY.light, fontWeight: 600 }}>
            {task.priority === "Urgent" ? "🔴 Urgent" : task.priority === "High" ? "🟡 High" : "⚪ Normal"}
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px" }}>
        {[["FROM", task.source], ["TO", task.destination], ["ACTION", task.action], ["TIME", task.estimatedTime]].filter(([, v]) => v).map(([label, val]) => (
          <div key={label}>
            <div style={{ fontSize: 9, fontWeight: 700, color: GRAY.light, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
            <div style={{ fontSize: 12, color: isComplete ? GRAY.light : GRAY.soft, fontWeight: 500 }}>{val}</div>
          </div>
        ))}
      </div>

      {task.comments && (
        <div style={{ marginTop: 8, fontSize: 11, color: GRAY.soft, borderTop: `1px solid ${GRAY.border}`, paddingTop: 8, fontStyle: "italic" }}>
          📌 {task.comments}
        </div>
      )}

      {task.assignedName && (
        <div style={{ marginTop: 8, fontSize: 11, color: GRAY.soft }}>
          👤 {task.assignedName}
        </div>
      )}
    </div>
  );
}

export default function DigitalBoard({ tasks, synced, error }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const available = tasks.filter(t => t.status === "available");
  const inProgress = tasks.filter(t => t.status === "in-progress");
  const complete = tasks.filter(t => t.status === "complete");

  const columns = [
    { label: "Available", tasks: available, count: available.length },
    { label: "In Progress", tasks: inProgress, count: inProgress.length },
    { label: "Complete", tasks: complete, count: complete.length },
  ];

  return (
    <div style={{ background: GRAY.bg, minHeight: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* Header bar */}
      <div style={{ background: GRAY.dark, padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>IMPACT CENTER</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "white", letterSpacing: "-0.02em" }}>Volunteer Task Board</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Stats */}
          <div style={{ display: "flex", gap: 20 }}>
            {[
              { label: "Available", val: available.length },
              { label: "In Progress", val: inProgress.length },
              { label: "Complete", val: complete.length },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "white" }}>{s.val}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Clock + sync */}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "white" }}>
              {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: error ? "#EF4444" : "#86EFAC", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>{error ? "Offline" : "Live"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* QR code strip */}
      <div style={{ background: GRAY.mid, padding: "8px 28px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, background: "white", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>▦</div>
        <div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.9)", fontWeight: 700 }}>Scan to access on your phone</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>impact-center-volunteer-system.vercel.app</div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
          Refreshes every 2.5s · {tasks.length} total tasks
        </div>
      </div>

      {/* Kanban columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, padding: "20px 24px 40px" }}>
        {columns.map(col => (
          <div key={col.label}>
            {/* Column header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "0 4px" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: GRAY.mid, textTransform: "uppercase", letterSpacing: "0.06em" }}>{col.label}</span>
              <span style={{ background: GRAY.dark, color: "white", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>{col.count}</span>
            </div>

            {/* Task cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {col.tasks.length === 0 ? (
                <div style={{ padding: "24px 16px", textAlign: "center", color: GRAY.light, fontSize: 13, background: "white", borderRadius: 12, border: `2px dashed ${GRAY.border}` }}>
                  {col.label === "Available" ? "All tasks assigned!" : col.label === "In Progress" ? "No active tasks" : "None completed yet"}
                </div>
              ) : (
                col.tasks.map(t => <TaskCard key={t.id} task={t} />)
              )}
            </div>
          </div>
        ))}
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}
