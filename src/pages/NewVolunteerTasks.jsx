// NewVolunteerTasks.jsx — Simple tap-to-claim interface, no login required
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSharedTasks } from "../hooks/useSharedTasks";

const GRAY = { dark: "#1F2937", mid: "#4B5563", soft: "#6B7280", light: "#9CA3AF", border: "#E5E7EB", bg: "#F9FAFB" };

// New volunteers only see "available" tasks not specifically assigned to a named volunteer
export default function NewVolunteerTasks({ tasks, onClaimTask, onCompleteTask, synced, error }) {
  const navigate = useNavigate();
  const { shiftLeader } = useSharedTasks();
  const [myTaskId, setMyTaskId] = useState(null);
  const [completing, setCompleting] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const anonId = "new-" + (sessionStorage.getItem("anonId") || (() => {
    const id = Math.random().toString(36).slice(2, 6);
    sessionStorage.setItem("anonId", id);
    return id;
  })());

  // Show available tasks that are open (no specific named assignment)
  const openTasks = tasks.filter(t =>
    t.status === "available" && (!t.assignedTo || t.assignedTo === "" || t.assignedTo === "new")
  );

  const myTask = tasks.find(t => t.id === myTaskId && t.status === "in-progress");
  const taskToShow = myTaskId ? myTask : null;

  async function handleClaim(task) {
    if (myTaskId) return;
    setMyTaskId(task.id);
    await onClaimTask(task.id, anonId, "New Volunteer");
  }

  async function handleComplete() {
    if (!myTaskId) return;
    setCompleting(true);
    await onCompleteTask(myTaskId);
    setMyTaskId(null);
    setCompleting(false);
    if (openTasks.length <= 1) setAllDone(true);
  }

  if (allDone && openTasks.length === 0) {
    return (
      <div style={{ background: "white", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 32, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <div style={{ fontSize: 56 }}>🎉</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: GRAY.dark, textAlign: "center" }}>All done!</div>
        <div style={{ fontSize: 14, color: GRAY.soft, textAlign: "center" }}>Great work today. All tasks are complete!</div>
        <button onClick={() => { setAllDone(false); navigate("/"); }}
          style={{ padding: "12px 28px", background: GRAY.dark, color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          ← Back to Home
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: GRAY.bg, minHeight: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ background: GRAY.mid, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>New Volunteer</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "white" }}>Welcome!</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Tap a task to get started</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: error ? "#EF4444" : synced ? "#86EFAC" : "#FCD34D", animation: "pulse 2s infinite" }} />
          <button onClick={() => navigate("/")} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>Exit</button>
        </div>
      </div>

      <div style={{ padding: "16px 16px 40px" }}>

        {/* My active task */}
        {taskToShow && (
          <div style={{ background: GRAY.dark, borderRadius: 14, padding: "16px", marginBottom: 16, border: "2px solid #374151" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>🔄 You're working on</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "white", marginBottom: 4 }}>{taskToShow.name}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 12 }}>
              {taskToShow.source} → {taskToShow.destination}
            </div>
            {taskToShow.comments && (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 14, fontStyle: "italic" }}>📌 {taskToShow.comments}</div>
            )}
            <button onClick={handleComplete} disabled={completing}
              style={{ width: "100%", padding: "14px 0", background: completing ? "#6B7280" : "white", color: completing ? "white" : GRAY.dark, border: "none", borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: completing ? "not-allowed" : "pointer" }}>
              {completing ? "Saving…" : "TAP WHEN DONE ✓"}
            </button>
          </div>
        )}

        {/* Task count */}
        <div style={{ fontSize: 11, fontWeight: 700, color: GRAY.light, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
          {openTasks.length} Tasks Remaining
        </div>

        {/* Open task list */}
        {openTasks.length === 0 && !taskToShow && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: GRAY.light, fontSize: 14 }}>
            {myTaskId ? "Complete your task to see more!" : "No open tasks right now — check back soon!"}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {openTasks.map(t => {
            const isMyActive = t.id === myTaskId;
            return (
              <div key={t.id}
                onClick={() => !myTaskId && !isMyActive && handleClaim(t)}
                style={{
                  background: isMyActive ? "#E5E7EB" : "white",
                  borderRadius: 12,
                  border: `2px solid ${isMyActive ? GRAY.mid : GRAY.border}`,
                  padding: "16px",
                  cursor: myTaskId ? "default" : "pointer",
                  opacity: myTaskId && !isMyActive ? 0.5 : 1,
                  transition: "all 0.15s"
                }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: GRAY.dark, marginBottom: 4 }}>{t.name}</div>
                <div style={{ fontSize: 12, color: GRAY.soft, display: "flex", alignItems: "center", gap: 4 }}>
                  <span>📍</span> {t.destination}
                </div>
                {t.estimatedTime && (
                  <div style={{ fontSize: 11, color: GRAY.light, marginTop: 4 }}>⏱ {t.estimatedTime}</div>
                )}
                {!myTaskId && (
                  <div style={{ fontSize: 11, color: GRAY.light, marginTop: 6 }}>Tap to claim →</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>

      {/* Floating help button — only shown when a Shift Leader is on duty */}
      {shiftLeader && (
        <button
          onClick={() => setHelpOpen(true)}
          style={{
            position: "fixed", bottom: 28, right: 20, width: 54, height: 54,
            borderRadius: "50%", background: "#34C759", border: "none",
            color: "white", fontSize: 26, fontWeight: 900, cursor: "pointer",
            boxShadow: "0 4px 18px rgba(52,199,89,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 50, lineHeight: 1,
          }}
        >
          ?
        </button>
      )}

      {/* Shift Leader help modal */}
      {helpOpen && shiftLeader && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 16px 36px" }}>
          <div style={{ background: "white", borderRadius: 20, padding: "24px", width: "100%", maxWidth: 400, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#34C759", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Need Help?</div>
            <div style={{ fontSize: 19, fontWeight: 800, color: GRAY.dark, marginBottom: 16 }}>Find your Shift Leader:</div>
            <div style={{ background: "#F0FDF4", borderRadius: 12, padding: "16px 18px", marginBottom: 16, borderLeft: "4px solid #34C759" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: GRAY.dark }}>{shiftLeader.name}</div>
              <div style={{ fontSize: 13, color: GRAY.soft, marginTop: 5 }}>They're wearing an orange lanyard</div>
            </div>
            <button
              onClick={() => setHelpOpen(false)}
              style={{ width: "100%", padding: "13px 0", background: GRAY.dark, color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              Got it ✓
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
