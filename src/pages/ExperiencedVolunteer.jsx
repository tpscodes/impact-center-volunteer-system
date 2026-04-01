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
  const { tasks, completeTask, clearShiftLeader, markTaskIncomplete, shiftLeader } = useSharedTasks();
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
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col" style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* Header — Dark Teal */}
      <div className="bg-[#09665e] px-6 py-5 flex items-center justify-between">
        <div>
          <p className="text-[#ccedeb] text-[11px] uppercase tracking-widest font-normal">Experienced Volunteer</p>
          <p className="text-white text-[22px] font-semibold leading-tight mt-1">My Task</p>
        </div>
        <button
          onClick={() => { sessionStorage.removeItem("volunteerId"); navigate("/"); }}
          className="border border-white text-white px-4 py-2 rounded-lg text-base hover:opacity-80 bg-transparent cursor-pointer"
        >
          Exit
        </button>
      </div>

      {/* Status bar — Dark Navy */}
      {myTask && (
        <div className="bg-[#0a2a3a] px-6 py-4">
          <p className="text-[#6b7280] text-[11px] uppercase tracking-widest mb-1">In Progress</p>
          <p className="text-white text-[18px] font-semibold">{myTask.name || myTask.item}</p>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 pb-20">

        {!myTask ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">{completing ? "✅" : "📭"}</div>
            <p className="text-[16px] font-bold text-[#0a2a3a] mb-2">
              {completing ? "Task Complete!" : "No active task"}
            </p>
            <p className="text-[13px] text-[#6b7280] mb-6">
              {completing ? "Heading back to task pool…" : "Head back to pick a new one!"}
            </p>
            {!completing && (
              <button
                onClick={() => navigate("/experienced/tasks")}
                className="px-6 py-3 bg-[#09665e] text-white rounded-xl text-[14px] font-semibold border-none cursor-pointer hover:opacity-90"
              >
                ← Back to Tasks
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Shift leader badge */}
            {(myTask.tags || []).includes("Shift Leader") && (
              <div className="px-4 py-3 bg-[#fff7ed] rounded-lg border-l-4 border-[#ff9500]">
                <p className="text-[#ff9500] text-[13px] font-bold">🟠 You are the Shift Leader — new volunteers can find you for help</p>
              </div>
            )}

            {/* Task details card */}
            <div className="bg-white border border-[#e5e7eb] rounded-xl p-6">
              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                {[["Action", myTask.action], ["Item", myTask.item], ["Source", myTask.source], ["To", myTask.destination], ["Est. Time", null]].filter(([, v]) => v).map(([label, val]) => (
                  <div key={label}>
                    <p className="text-[#6b7280] text-[11px] uppercase tracking-widest mb-1">{label}</p>
                    <p className="text-[#0a2a3a] text-[16px]">{val}</p>
                  </div>
                ))}
              </div>

              {(myTask.specialInstructions || myTask.comments) && (
                <div className="border-l-2 border-[#e5e7eb] pl-4 mt-6">
                  <p className="text-[#6b7280] text-[11px] uppercase tracking-widest mb-1">Special Instructions</p>
                  <p className="text-[#6b7280] text-[14px] italic leading-relaxed">
                    {myTask.specialInstructions || myTask.comments}
                  </p>
                </div>
              )}

              {myTask.tags && myTask.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {myTask.tags.map(tag => (
                    <span key={tag} className="bg-[#ccedeb] text-[#09665e] text-[12px] font-semibold px-3 py-1 rounded-lg">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex">
              <button
                onClick={handleUnclaim}
                disabled={completing}
                className="flex-1 bg-[#dc2626] text-white py-4 rounded-l-xl text-[16px] font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 border-none"
              >
                Unclaim
              </button>
              <button
                onClick={handleComplete}
                disabled={completing}
                className="flex-1 bg-[#09665e] text-white py-4 rounded-r-xl text-[16px] font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 border-none"
              >
                ✓ {completing ? "Saving…" : "Mark Complete"}
              </button>
            </div>

            {/* Back link */}
            <button
              onClick={() => navigate("/experienced/tasks")}
              className="text-center text-[#6b7280] text-[14px] py-2 hover:underline bg-transparent border-none cursor-pointer"
            >
              ← Back to Task Pool
            </button>

            {/* Shift Leader: new volunteer tasks panel */}
            {isShiftLeader && (
              <div className="mt-2">
                <p className="text-[#ff9500] text-[11px] font-bold uppercase tracking-widest mb-3">
                  🟠 New Volunteer Tasks ({newVolTasks.length})
                </p>
                {newVolTasks.length === 0 ? (
                  <div className="bg-white border border-[#e5e7eb] rounded-xl px-4 py-4 text-[13px] text-[#9ca3af] text-center">
                    No new volunteers working right now
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {newVolTasks.map(t => {
                      const isActive = t.status === "in-progress";
                      const isIncomplete = t.status === "incomplete";
                      return (
                        <div key={t.id} className={`bg-white rounded-xl border px-4 py-3 flex items-center justify-between ${isActive ? "border-[#fed7aa]" : isIncomplete ? "border-[#fecaca]" : "border-[#e5e7eb]"}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-[14px] font-semibold text-[#0a2a3a]">{t.name}</p>
                              <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 shrink-0 ${isActive ? "bg-[#fff7ed] text-[#ff9500]" : isIncomplete ? "bg-[#fee2e2] text-[#dc2626]" : "bg-[#f0fdf4] text-[#16a34a]"}`}>
                                {isActive ? "In Progress" : isIncomplete ? "Incomplete" : "Available"}
                              </span>
                            </div>
                            <p className="text-[12px] text-[#6b7280]">📍 {t.destination}</p>
                            <p className="text-[11px] text-[#9ca3af] mt-1">
                              {isActive ? (t.assignedName || "New Volunteer") : "Unassigned"} · {t.estimatedTime}
                            </p>
                          </div>
                          {isActive && (
                            <button
                              onClick={() => markTaskIncomplete(t.id)}
                              className="text-[12px] font-bold text-white bg-[#ef4444] border-none rounded-lg px-3 py-1.5 cursor-pointer shrink-0 ml-3"
                            >
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
          </>
        )}
      </div>

      {/* Bottom tab bar */}
      <div className="bg-white border-t border-[#e5e7eb] h-14 flex items-center shrink-0">
        <button
          onClick={() => navigate("/experienced/tasks")}
          className="flex-1 h-full flex flex-col items-center justify-center gap-1 text-[#6b7280] bg-transparent border-none cursor-pointer"
        >
          <span className="text-[18px]">📋</span>
          <span className="text-[12px]">Available</span>
        </button>
        <button
          className="flex-1 h-full flex flex-col items-center justify-center gap-1 text-[#09665e] border-b-2 border-[#09665e] bg-transparent border-l-0 border-r-0 border-t-0 cursor-default"
        >
          <span className="text-[18px]">✓</span>
          <span className="text-[12px] font-medium">My task</span>
        </button>
      </div>
    </div>
  );
}
