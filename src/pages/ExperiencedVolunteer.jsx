// ExperiencedVolunteer flows: ID entry → Task Pool → My Task → Complete
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { VOLUNTEER_PROFILES, useSharedTasks } from "../hooks/useSharedTasks";

const GRAY = { dark: "#1e1e1e", mid: "#09665e", soft: "#6B7280", light: "#9CA3AF", border: "#E5E7EB", bg: "#f5f5f5" };

// ── ID Entry Screen ──────────────────────────────────────────────────────────
export function VolunteerIdEntry() {
  const [id, setId] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  function handleSubmit(e) {
    if (e) e.preventDefault();
    if (id.length < 4) { setError("Please enter all 4 digits."); return; }
    const profile = VOLUNTEER_PROFILES.find(p => p.id === id);
    if (!profile) {
      setError("ID not recognized. Please check with your session coordinator.");
      return;
    }
    sessionStorage.setItem("volunteerId", profile.id);
    sessionStorage.setItem("volunteerName", profile.name);
    navigate("/experienced/tasks");
  }

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row" style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* LEFT PANEL — desktop only */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#F0FAFA] flex-col items-center justify-center p-16 min-h-screen">
        <div className="w-full max-w-[420px]">
          <h1 className="text-4xl font-bold text-[#1e1e1e] mb-1">IMPACT CENTER</h1>
          <p className="text-lg text-[#0d9488] mb-4">Volunteer Task Management</p>
          <div className="w-12 h-0.5 bg-[#0d9488] mb-10" />
          <img src="/illustration-group.png" alt="Volunteers" className="w-[360px] h-auto mb-10" />
          <p className="text-xl font-semibold text-[#1e1e1e] text-center leading-snug">
            Coordinating volunteers,<br />one task at a time
          </p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 lg:px-16 py-12 min-h-screen">

        {/* Mobile header */}
        <div className="lg:hidden text-center mb-8">
          <h1 className="text-2xl font-normal text-[#1e1e1e] tracking-wide">IMPACT CENTER</h1>
          <p className="text-sm text-[#757575] mt-1">Volunteer Task Management</p>
          <div className="w-12 h-0.5 bg-[#0d9488] mx-auto mt-3" />
        </div>

        {/* Login card */}
        <form onSubmit={handleSubmit} className="w-full max-w-[360px] bg-white border border-[#d9d9d9] rounded-lg p-8">
          <h2 className="text-2xl font-semibold text-[#1e1e1e] text-center mb-1 tracking-tight">
            Experienced Volunteer
          </h2>
          <p className="text-lg text-[#757575] text-center mb-8">Sign in to continue</p>

          <div className="flex flex-col gap-2 mb-6">
            <label className="text-base text-[#1e1e1e]">Enter your 4-digit ID</label>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="e.g. 1234"
              value={id}
              onChange={e => { setId(e.target.value.replace(/\D/g, "").slice(0, 4)); setError(""); }}
              maxLength={4}
              autoFocus
              className="w-full border border-[#d9d9d9] rounded-lg px-4 py-3 text-base text-[#1e1e1e] placeholder-[#b3b3b3] outline-none focus:border-[#0d9488] transition-colors"
            />
          </div>

          {error && (
            <p className="text-sm font-medium text-center rounded-lg py-2 px-3 mb-4 bg-[#fee2e2] text-[#dc2626]">
              {error}
            </p>
          )}

          <div className="flex gap-4 mb-6">
            <button
              type="button"
              onClick={() => { setId(""); setError(""); }}
              className="flex-1 py-3 rounded-lg text-base text-[#303030] border border-[#d9d9d9] hover:bg-gray-50 cursor-pointer bg-white"
            >
              Clear
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-lg text-base bg-[#09665e] border border-[#09665e] text-[#f0fafa] hover:opacity-90 cursor-pointer"
            >
              Login
            </button>
          </div>

          <p className="text-base text-[#1e1e1e]">
            Not Exp. Volunteer?{" "}
            <span onClick={() => navigate("/")} className="text-[#0d9488] cursor-pointer hover:underline">
              Go back to home
            </span>
          </p>
        </form>

        <p className="text-base italic text-[#757575] text-center mt-8">
          Impact Center | Greenwood, IN
        </p>
      </div>
    </div>
  );
}

// ── Task Pool ────────────────────────────────────────────────────────────────
export function ExperiencedTaskPool({ tasks, onClaimTask, synced, error }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const volunteerId = sessionStorage.getItem("volunteerId") || "1234";
  const volunteerName = sessionStorage.getItem("volunteerName") || `Vol #${volunteerId}`;

  // Show: available tasks + tasks assigned to me
  const myTask = tasks.find(t => t.assignedTo === volunteerId && t.status === "in-progress");
  const available = tasks.filter(t =>
    t.status === "available" &&
    (!t.assignedTo || t.assignedTo === "experienced" || t.assignedTo === volunteerId) &&
    (!search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.item?.toLowerCase().includes(search.toLowerCase()))
  );

  async function handleClaim(task) {
    await onClaimTask(task.id, volunteerId, volunteerName);
    navigate("/experienced/mytask");
  }

  return (
    <div style={{ background: GRAY.bg, minHeight: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif", paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ background: GRAY.mid, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Experienced Volunteer</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "white" }}>Welcome, {volunteerName}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: error ? "#EF4444" : synced ? "#86EFAC" : "#FCD34D", animation: "pulse 2s infinite" }} />
          <button onClick={() => navigate("/")} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>Exit</button>
        </div>
      </div>

      {/* My active task banner */}
      {myTask && (
        <div style={{ background: GRAY.dark, margin: "16px 16px 0", borderRadius: 12, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>You're working on</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginTop: 2 }}>{myTask.name}</div>
          </div>
          <button onClick={() => navigate("/experienced/mytask")}
            style={{ background: "white", color: GRAY.dark, border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            View →
          </button>
        </div>
      )}

      <div style={{ padding: "16px 16px 0" }}>
        {/* Search */}
        <div style={{ position: "relative", marginBottom: 12 }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks…"
            style={{ width: "100%", padding: "10px 12px 10px 32px", border: `1.5px solid ${GRAY.border}`, borderRadius: 8, fontSize: 14, color: GRAY.dark, background: "white", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: GRAY.light, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
          Available Tasks ({available.length})
        </div>

        {available.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: GRAY.light, fontSize: 14 }}>
            {myTask ? "You have an active task — complete it first!" : "No tasks available right now"}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {available.map(t => (
            <div key={t.id} style={{ background: "white", borderRadius: 12, border: `1.5px solid ${GRAY.border}`, overflow: "hidden" }}>
              <div style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: GRAY.dark, flex: 1 }}>{t.name}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: t.priority === "Urgent" ? "#374151" : t.priority === "High" ? "#6B7280" : "#9CA3AF", background: t.priority === "Urgent" ? "#E5E7EB" : "#F3F4F6", borderRadius: 20, padding: "2px 8px", marginLeft: 8 }}>
                    {t.priority}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: GRAY.soft, marginBottom: 4 }}>
                  {t.source} → {t.destination}
                </div>
                <div style={{ fontSize: 11, color: GRAY.light }}>{t.estimatedTime}</div>
                {t.comments && <div style={{ fontSize: 12, color: GRAY.soft, marginTop: 6, fontStyle: "italic" }}>📌 {t.comments}</div>}
              </div>
              <button
                onClick={() => !myTask && handleClaim(t)}
                disabled={!!myTask}
                style={{ width: "100%", padding: "12px 0", background: myTask ? "#F3F4F6" : GRAY.dark, color: myTask ? GRAY.light : "white", border: "none", fontSize: 13, fontWeight: 700, cursor: myTask ? "not-allowed" : "pointer" }}>
                {myTask ? "Complete your current task first" : "CLAIM TASK"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 480, margin: "0 auto", background: "white", borderTop: `1px solid ${GRAY.border}`, display: "flex" }}>
        <button style={{ flex: 1, padding: "14px 0", background: "none", border: "none", fontSize: 12, fontWeight: 700, color: GRAY.dark, cursor: "pointer", borderBottom: `2px solid ${GRAY.dark}` }}>
          📋 Available ({available.length})
        </button>
        <button onClick={() => navigate("/experienced/mytask")} style={{ flex: 1, padding: "14px 0", background: "none", border: "none", fontSize: 12, fontWeight: 600, color: GRAY.soft, cursor: "pointer" }}>
          ✅ My Task {myTask ? "(1)" : ""}
        </button>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}

// ── My Task Screen ───────────────────────────────────────────────────────────
export function MyTask() {
  const navigate = useNavigate();
  const { tasks, synced, completeTask, clearShiftLeader, markTaskIncomplete, shiftLeader } = useSharedTasks();
  const [completing, setCompleting] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const volunteerId = sessionStorage.getItem("volunteerId") || "1234";
  const myTask = tasks.find(t => t.assignedTo === volunteerId && t.status === "in-progress");

  // Only show shift leader panel if they have actively claimed the Shift Leader task
  const isShiftLeader = !!myTask && shiftLeader?.taskId === myTask.id;

  const newVolTasks = tasks.filter(t => {
    if (t.status === "in-progress" && (t.assignedTo || "").startsWith("new-")) return true;
    if ((t.status === "available" || t.status === "incomplete") &&
        (!t.assignedTo || t.assignedTo === "" || t.assignedTo === "new")) return true;
    return false;
  });

  // Timer
  useEffect(() => {
    if (!myTask) return;
    const start = myTask.claimedAt || Date.now();
    setElapsed(Math.floor((Date.now() - start) / 1000));
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [myTask?.id]);

  const mins = Math.floor(elapsed / 60).toString().padStart(2, "0");
  const secs = (elapsed % 60).toString().padStart(2, "0");

  async function handleUnclaim() {
    if (!myTask) return;
    await markTaskIncomplete(myTask.id);
    navigate("/experienced/tasks");
  }

  async function handleComplete() {
    if (!myTask) return;
    setCompleting(true);
    const isShiftLeaderTask = (myTask.tags || []).includes("Shift Leader");
    const completedBy = myTask.assignedName || sessionStorage.getItem("volunteerName") || volunteerId;
    await completeTask(myTask.id, completedBy);
    if (isShiftLeaderTask) await clearShiftLeader();
    setTimeout(() => navigate("/experienced/tasks"), 1200);
  }

  return (
    <div style={{ background: GRAY.bg, minHeight: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif", paddingBottom: 80 }}>

      <div style={{ background: GRAY.mid, padding: "16px 20px" }}>
        <div style={{ maxWidth: 672, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Experienced Volunteer</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "white" }}>My Task</div>
          </div>
          <button onClick={() => { sessionStorage.removeItem("volunteerId"); navigate("/"); }} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>Exit</button>
        </div>
      </div>

      <div style={{ maxWidth: 672, margin: "0 auto", padding: "20px 16px" }}>
        {!myTask ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{completing ? "✅" : "📭"}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: GRAY.dark, marginBottom: 4 }}>
              {completing ? "Task Complete!" : "No active task"}
            </div>
            <div style={{ fontSize: 13, color: GRAY.soft, marginBottom: 20 }}>
              {completing ? "Heading back to task pool…" : "Head back to pick a new one!"}
            </div>
            {!completing && (
              <button onClick={() => navigate("/experienced/tasks")}
                style={{ padding: "12px 24px", background: GRAY.dark, color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                ← Back to Tasks
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Task card */}
            <div style={{ background: "white", borderRadius: 14, border: `2px solid ${GRAY.dark}`, overflow: "hidden", marginBottom: 16 }}>
              <div style={{ background: GRAY.dark, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.06em" }}>In Progress</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: "white" }}>{myTask.name}</div>
                </div>
                <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 14, color: "rgba(255,255,255,0.7)" }}>⏱ {mins}:{secs}</span>
              </div>

              <div style={{ padding: "16px 18px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px", marginBottom: myTask.comments ? 14 : 0 }}>
                  {[["ACTION", myTask.action], ["ITEM", myTask.item], ["SOURCE", myTask.source], ["TO", myTask.destination], ["EST. TIME", myTask.estimatedTime]].filter(([, v]) => v).map(([label, val]) => (
                    <div key={label}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: GRAY.light, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                      <div style={{ fontSize: 14, color: GRAY.dark, fontWeight: 600, marginTop: 2 }}>{val}</div>
                    </div>
                  ))}
                </div>
                {myTask.comments && (
                  <div style={{ background: "#F9FAFB", borderRadius: 8, padding: "10px 12px", borderLeft: `3px solid ${GRAY.light}` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: GRAY.light, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Special Instructions</div>
                    <div style={{ fontSize: 13, color: GRAY.soft }}>{myTask.comments}</div>
                  </div>
                )}
                {(myTask.tags || []).includes("Shift Leader") && (
                  <div style={{ marginTop: 12, padding: "8px 12px", background: "#FFF7ED", borderRadius: 8, borderLeft: "3px solid #FF9500", fontSize: 12, color: "#FF9500", fontWeight: 700 }}>
                    🟠 You are the Shift Leader — new volunteers can find you for help
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <button onClick={handleUnclaim} disabled={completing}
                style={{ flex: 1, padding: "14px 0", background: completing ? "#D1D5DB" : "#EF4444", color: "white", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: completing ? "not-allowed" : "pointer" }}>
                Unclaim
              </button>
              <button onClick={handleComplete} disabled={completing}
                style={{ flex: 2, padding: "14px 0", background: completing ? "#D1D5DB" : GRAY.dark, color: "white", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: completing ? "not-allowed" : "pointer" }}>
                {completing ? "Marking complete…" : "✓ MARK COMPLETE"}
              </button>
            </div>

            <button onClick={() => navigate("/experienced/tasks")}
              style={{ width: "100%", padding: "12px 0", background: "white", color: GRAY.soft, border: `2px solid ${GRAY.border}`, borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              ← Back to Task Pool
            </button>
          </>
        )}

        {/* Shift Leader: new volunteer tasks panel — always visible when shift leader */}
        {isShiftLeader && (
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#FF9500", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
              🟠 New Volunteer Tasks ({newVolTasks.length})
            </div>
            {newVolTasks.length === 0 ? (
              <div style={{ background: "white", borderRadius: 12, border: `1.5px solid ${GRAY.border}`, padding: "14px 16px", fontSize: 13, color: GRAY.light, textAlign: "center" }}>
                No new volunteers working right now
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {newVolTasks.map(t => {
                  const isActive = t.status === "in-progress";
                  const isIncomplete = t.status === "incomplete";
                  return (
                    <div key={t.id} style={{ background: "white", borderRadius: 12, border: `1.5px solid ${isActive ? "#FED7AA" : isIncomplete ? "#FECACA" : GRAY.border}`, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: GRAY.dark }}>{t.name}</div>
                          <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "2px 7px", flexShrink: 0,
                            background: isActive ? "#FFF7ED" : isIncomplete ? "#FEE2E2" : "#F0FDF4",
                            color: isActive ? "#FF9500" : isIncomplete ? "#DC2626" : "#16A34A" }}>
                            {isActive ? "In Progress" : isIncomplete ? "Incomplete" : "Available"}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: GRAY.soft }}>📍 {t.destination}</div>
                        <div style={{ fontSize: 11, color: GRAY.light, marginTop: 2 }}>
                          {isActive ? (t.assignedName || "New Volunteer") : "Unassigned"} · {t.estimatedTime}
                        </div>
                      </div>
                      {isActive && (
                        <button
                          onClick={() => markTaskIncomplete(t.id)}
                          style={{ fontSize: 12, fontWeight: 700, color: "white", background: "#EF4444", border: "none", borderRadius: 8, padding: "7px 12px", cursor: "pointer", flexShrink: 0, marginLeft: 12 }}>
                          Mark Incomplete
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "white", borderTop: `1px solid ${GRAY.border}` }}>
        <div style={{ maxWidth: 672, margin: "0 auto", display: "flex" }}>
          <button onClick={() => navigate("/experienced/tasks")} style={{ flex: 1, padding: "14px 0", background: "none", border: "none", fontSize: 12, fontWeight: 600, color: GRAY.soft, cursor: "pointer" }}>
            📋 Available Tasks
          </button>
          <button style={{ flex: 1, padding: "14px 0", background: "none", border: "none", fontSize: 12, fontWeight: 700, color: GRAY.dark, cursor: "pointer", borderBottom: `2px solid ${GRAY.dark}` }}>
            ✅ My Task
          </button>
        </div>
      </div>
    </div>
  );
}
