// NewVolunteerTasks.jsx — Simple tap-to-claim interface, no login required
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSharedTasks } from "../hooks/useSharedTasks";
import { MapPin, ChevronRight } from "lucide-react";

const GRAY = { dark: "#1e1e1e", mid: "#09665e", soft: "#6B7280", light: "#9CA3AF", border: "#E5E7EB", bg: "#f5f5f5" };

function formatDisplayName(first, last) {
  return `${first.trim()} ${last.trim().charAt(0).toUpperCase()}.`;
}

// New volunteers only see "available" tasks not specifically assigned to a named volunteer
// Self-contained: uses its own hook so slRef.current is always fresh and won't
// accidentally overwrite shiftLeader when claiming/completing tasks.
export default function NewVolunteerTasks() {
  const navigate = useNavigate();
  const { tasks, synced, error, session, claimTask, completeTask, shiftLeader } = useSharedTasks();

  // ── Name entry state ─────────────────────────────────────────────────────────
  const savedName = (() => {
    try { return JSON.parse(localStorage.getItem("newVolunteerName")) || null; } catch { return null; }
  })();
  const [firstName, setFirstName] = useState(savedName?.firstName || "");
  const [lastName, setLastName] = useState(savedName?.lastName || "");
  const [nameSubmitted, setNameSubmitted] = useState(!!savedName);
  const [submitting, setSubmitting] = useState(false);

  // ── Session token ─────────────────────────────────────────────────────────────
  // Reuse existing token if already saved; a new one is only generated on fresh name submit
  const [sessionToken] = useState(
    () => localStorage.getItem("newVolunteerSession") || null
  );
  const [mySessionToken, setMySessionToken] = useState(sessionToken);

  // ── Task state ───────────────────────────────────────────────────────────────
  const [myTaskId, setMyTaskId] = useState(null);
  const [completing, setCompleting] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [detailTask, setDetailTask] = useState(null);
  const [claimBlocked, setClaimBlocked] = useState(false);

  // Show available + incomplete tasks that are open (no specific named assignment)
  const openTasks = tasks.filter(t =>
    (t.status === "available" || t.status === "incomplete") &&
    (!t.assignedTo || t.assignedTo === "" || t.assignedTo === "new")
  );

  const myTask = tasks.find(t => t.id === myTaskId && t.status === "in-progress");

  // ── Name submit ──────────────────────────────────────────────────────────────
  function handleNameSubmit() {
    if (!firstName.trim() || !lastName.trim()) return;
    setSubmitting(true);
    const token = crypto.randomUUID();
    localStorage.setItem("newVolunteerName", JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim() }));
    localStorage.setItem("newVolunteerSession", token);
    setMySessionToken(token);
    setNameSubmitted(true);
    setSubmitting(false);
  }

  // ── Claim / complete ─────────────────────────────────────────────────────────
  async function handleClaim(task) {
    // One-task-at-a-time: check if this session already holds an active task
    if (myTaskId) return;
    if (mySessionToken) {
      const alreadyActive = tasks.find(
        t => t.sessionToken === mySessionToken && t.status === "in-progress"
      );
      if (alreadyActive) {
        setMyTaskId(alreadyActive.id);
        setClaimBlocked(true);
        return;
      }
    }
    setClaimBlocked(false);
    setMyTaskId(task.id);
    setDetailTask(task);
    const displayName = nameSubmitted ? formatDisplayName(firstName, lastName) : "New Volunteer";
    const token = mySessionToken || crypto.randomUUID();
    await claimTask(task.id, "new-" + token.slice(0, 8), displayName, {
      claimedByName: displayName,
      claimedByType: "new",
      sessionToken: token,
    });
  }

  async function handleComplete() {
    if (!myTaskId) return;
    setCompleting(true);
    const displayName = nameSubmitted ? formatDisplayName(firstName, lastName) : "New Volunteer";
    await completeTask(myTaskId, displayName);
    setMyTaskId(null);
    setDetailTask(null);
    setCompleting(false);
    if (openTasks.length <= 1) setAllDone(true);
  }

  // ── Session lock ─────────────────────────────────────────────────────────────
  const isSessionActive = session?.isActive && (
    session.type !== "timed" || !session.endTime || Date.now() < session.endTime
  );
  if (session !== null && session !== undefined && !isSessionActive) {
    return (
      <div style={{ background: GRAY.bg, minHeight: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <div style={{ background: GRAY.mid, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>New Volunteer</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "white" }}>Welcome!</div>
          </div>
          <button onClick={() => navigate("/")} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>Exit</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 80px)", padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: GRAY.dark, marginBottom: 8 }}>No active session right now</div>
          <div style={{ fontSize: 15, color: GRAY.soft }}>Check back when the pantry opens</div>
        </div>
      </div>
    );
  }

  // ── Name entry screen ────────────────────────────────────────────────────────
  if (!nameSubmitted) {
    const canSubmit = firstName.trim().length > 0 && lastName.trim().length > 0;
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

          {/* Form card */}
          <div className="w-full max-w-[360px] bg-white border border-[#d9d9d9] rounded-lg p-8">
            <h2 className="text-2xl font-semibold text-[#1e1e1e] text-center mb-1 tracking-tight">
              New Volunteer
            </h2>
            <p className="text-lg text-[#757575] text-center mb-8">Enter your information</p>

            {/* First name */}
            <div className="flex flex-col gap-2 mb-6">
              <label className="text-base text-[#1e1e1e]">First name</label>
              <input
                type="text"
                placeholder="name"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && canSubmit) handleNameSubmit(); }}
                autoFocus
                className="w-full border border-[#d9d9d9] rounded-lg px-4 py-3 text-base text-[#1e1e1e] placeholder-[#b3b3b3] outline-none focus:border-[#0d9488] transition-colors"
              />
            </div>

            {/* Last name */}
            <div className="flex flex-col gap-2 mb-6">
              <label className="text-base text-[#1e1e1e]">Last Name</label>
              <input
                type="text"
                placeholder="Name"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && canSubmit) handleNameSubmit(); }}
                className="w-full border border-[#d9d9d9] rounded-lg px-4 py-3 text-base text-[#1e1e1e] placeholder-[#b3b3b3] outline-none focus:border-[#0d9488] transition-colors"
              />
            </div>

            {/* Login button */}
            <button
              onClick={handleNameSubmit}
              disabled={!canSubmit || submitting}
              className="w-full bg-[#09665e] border border-[#09665e] text-[#f0fafa] rounded-lg py-3 text-base hover:opacity-90 transition-opacity mb-6 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Login
            </button>

            {/* Back link */}
            <p className="text-base text-[#1e1e1e]">
              Not a Volunteer?{" "}
              <span onClick={() => navigate("/")} className="text-[#0d9488] cursor-pointer hover:underline">
                Go back to home
              </span>
            </p>
          </div>

          <p className="text-base italic text-[#757575] text-center mt-8">
            Impact Center | Greenwood, IN
          </p>
        </div>
      </div>
    );
  }

  // ── Task Detail overlay ──────────────────────────────────────────────────────
  const activeTaskForDetail = detailTask
    ? (tasks.find(t => t.id === detailTask.id) || detailTask)
    : null;

  if (activeTaskForDetail) {
    const isActive = activeTaskForDetail.id === myTaskId;
    return (
      <div style={{ background: GRAY.bg, minHeight: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif", paddingBottom: 100 }}>
        <div style={{ background: GRAY.mid, padding: "16px 20px" }}>
          <div style={{ marginBottom: 10 }}>
            <button
              onClick={() => setDetailTask(null)}
              style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              ← Back
            </button>
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
            {isActive ? "Your Task" : "Task Details"}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "white", lineHeight: 1.3 }}>{activeTaskForDetail.name}</div>
        </div>

        <div style={{ padding: "20px 16px" }}>
          {activeTaskForDetail.action && (
            <div style={{ background: "white", borderRadius: 14, border: `1.5px solid ${GRAY.border}`, padding: "16px 18px", marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: GRAY.light, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>What to do</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: GRAY.dark }}>{activeTaskForDetail.action}</div>
            </div>
          )}
          {activeTaskForDetail.destination && (
            <div style={{ background: GRAY.dark, borderRadius: 14, padding: "16px 18px", marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>📍 Where to go</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "white" }}>{activeTaskForDetail.destination}</div>
            </div>
          )}
          {activeTaskForDetail.item && (
            <div style={{ background: "white", borderRadius: 14, border: `1.5px solid ${GRAY.border}`, padding: "14px 18px", marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: GRAY.light, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Item</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: GRAY.dark }}>{activeTaskForDetail.item}</div>
            </div>
          )}
          {activeTaskForDetail.comments && (
            <div style={{ background: "white", borderRadius: 14, border: `1.5px solid ${GRAY.border}`, padding: "14px 18px", marginBottom: 12, borderLeft: `4px solid ${GRAY.mid}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: GRAY.light, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>📌 Instructions</div>
              <div style={{ fontSize: 15, color: GRAY.dark, lineHeight: 1.6 }}>{activeTaskForDetail.comments}</div>
            </div>
          )}
          {shiftLeader && (
            <div style={{ background: "#F0FDF4", borderRadius: 14, padding: "14px 18px", marginBottom: 12, borderLeft: "4px solid #34C759" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#16A34A", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Need help? Find your point of contact</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: GRAY.dark }}>{shiftLeader.name}</div>
              <div style={{ fontSize: 12, color: GRAY.soft, marginTop: 4 }}>They're wearing an orange lanyard</div>
            </div>
          )}
        </div>

        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 480, margin: "0 auto", background: "white", borderTop: `1px solid ${GRAY.border}`, padding: "14px 16px" }}>
          {isActive ? (
            <button
              onClick={handleComplete}
              disabled={completing}
              style={{ width: "100%", padding: "18px 0", background: completing ? "#D1D5DB" : "#34C759", color: "white", border: "none", borderRadius: 14, fontSize: 18, fontWeight: 800, cursor: completing ? "not-allowed" : "pointer", letterSpacing: "0.02em" }}
            >
              {completing ? "Saving…" : "✓ MARK DONE"}
            </button>
          ) : (
            <button
              onClick={() => handleClaim(activeTaskForDetail)}
              disabled={!!myTaskId}
              style={{ width: "100%", padding: "18px 0", background: myTaskId ? "#F3F4F6" : "#34C759", color: myTaskId ? GRAY.light : "white", border: "none", borderRadius: 14, fontSize: 18, fontWeight: 800, cursor: myTaskId ? "not-allowed" : "pointer" }}
            >
              {myTaskId ? "Complete your current task first" : "TAP TO CLAIM"}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── All Done screen ──────────────────────────────────────────────────────────
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

  // ── Main task list ───────────────────────────────────────────────────────────
  const displayName = formatDisplayName(firstName, lastName);
  const incompleteTasks = openTasks.filter(t => t.status === "incomplete");
  const availableTasks = openTasks.filter(t => t.status === "available");

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col" style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* Header */}
      <div className="bg-[#09665e] px-5 py-5 flex items-center justify-between">
        <div>
          <p className="text-[#f3f3f3] text-base font-normal">Welcome</p>
          <p className="text-[#f3f3f3] text-base font-semibold">{displayName}</p>
        </div>
        <div className="flex items-center gap-3">
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: error ? "#EF4444" : synced ? "#86EFAC" : "#FCD34D" }} />
          <button
            onClick={() => navigate("/")}
            className="border border-[#f3f3f3] text-[#f0fafa] px-4 py-2 rounded-lg text-base bg-transparent cursor-pointer"
          >
            Exit
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-4">
      <div className="px-5 py-4 flex flex-col gap-3">

        {/* Concurrency block warning */}
        {claimBlocked && (
          <div className="bg-[#fff3cd] border border-[#fcd34d] rounded-lg px-4 py-3">
            <p className="text-[13px] font-bold text-[#92400E]">You already have an active task — complete it first</p>
          </div>
        )}

        {/* Active task banner */}
        {myTask && (
          <div
            onClick={() => setDetailTask(myTask)}
            className="bg-[#0a2a3a] rounded-lg p-4 cursor-pointer"
          >
            <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest mb-1">🔄 You're working on</p>
            <p className="text-white text-base font-bold mb-1">{myTask.name}</p>
            <div className="flex items-center gap-1 mb-2">
              <MapPin size={12} className="text-white/60 shrink-0" />
              <p className="text-white/60 text-[12px]">{myTask.source}</p>
              {myTask.destination && <><ChevronRight size={12} className="text-white/60" /><p className="text-white/60 text-[12px]">{myTask.destination}</p></>}
            </div>
            {myTask.comments && <p className="text-white/70 text-[12px] italic mb-2">📌 {myTask.comments}</p>}
            <p className="text-white/50 text-[12px] font-semibold">Tap for details →</p>
          </div>
        )}

        {/* Empty state */}
        {openTasks.length === 0 && !myTask && (
          <p className="text-center text-[#9ca3af] text-[14px] py-10">
            {myTaskId ? "Complete your task to see more!" : "No open tasks right now — check back soon!"}
          </p>
        )}

        {/* Incomplete section */}
        {incompleteTasks.length > 0 && (
          <div>
            <p className="text-[#900b09] text-base mb-2">Incomplete</p>
            {incompleteTasks.map(task => (
              <div key={task.id} className="bg-[#fdefec] border border-[#757575] rounded-lg p-3 mb-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[#900b09] text-base font-semibold flex-1">{task.name || task.item}</p>
                  <span className="bg-[#fcb3ad] text-[#900b09] text-[14px] font-semibold px-3 py-1 rounded-lg shrink-0">
                    Incomplete
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <MapPin size={14} className="text-[#6b7280] shrink-0" />
                  <p className="text-[#6b7280] text-[12px]">{task.source}</p>
                  {task.destination && <><ChevronRight size={14} className="text-[#6b7280]" /><p className="text-[#0a2a3a] text-[12px]">{task.destination}</p></>}
                </div>
                <div className="border-t border-[#e5e7eb] mt-2 pt-2">
                  <button
                    onClick={() => handleClaim(task)}
                    disabled={!!myTaskId}
                    className="flex items-center gap-1 text-[#0a2a3a] text-[12px] bg-transparent border-none cursor-pointer disabled:opacity-40"
                  >
                    Tap to claim and finish <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Available Tasks section */}
        {availableTasks.length > 0 && (
          <div>
            <p className="text-[#1e1e1e] text-base mb-2">Available Tasks</p>
            {availableTasks.map(task => (
              <div key={task.id} className={`bg-white border border-[#757575] rounded-lg p-3 mb-3 ${myTaskId ? "opacity-50" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[#303030] text-base font-semibold flex-1">{task.name || task.item}</p>
                  {task.priority && (
                    <span className={`text-[14px] font-semibold px-3 py-1 rounded-lg shrink-0 ${
                      task.priority === "High"   ? "bg-[#ffe8a3] text-[#682d03]" :
                      task.priority === "Urgent" ? "bg-[#fcb3ad] text-[#900b09]" :
                      "bg-[#e6e6e6] text-[#757575]"
                    }`}>{task.priority}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <MapPin size={14} className="text-[#6b7280] shrink-0" />
                  <p className="text-[#6b7280] text-[12px]">{task.source}</p>
                  {task.destination && <><ChevronRight size={14} className="text-[#6b7280]" /><p className="text-[#0a2a3a] text-[12px]">{task.destination}</p></>}
                </div>
                <div className="border-t border-[#e5e7eb] mt-2 pt-2">
                  <button
                    onClick={() => setDetailTask(task)}
                    disabled={!!myTaskId}
                    className="flex items-center gap-1 text-[#0a2a3a] text-[12px] bg-transparent border-none cursor-pointer disabled:opacity-40"
                  >
                    Tap for details <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>

      {/* Bottom tab bar */}
      <div className="bg-[#ccedeb] shrink-0 border-t border-[#09665e] h-14 flex">
        <button className="flex-1 h-full flex items-center justify-center border-b-2 border-[#09665e] text-[#303030] text-base bg-transparent border-none cursor-pointer font-semibold">
          Available
        </button>
        <button
          onClick={() => myTask ? setDetailTask(myTask) : undefined}
          className="flex-1 h-full flex items-center justify-center text-[#767676] text-base bg-transparent border-none cursor-pointer"
        >
          My task {myTask ? "(1)" : ""}
        </button>
      </div>

      {/* Shift leader help FAB */}
      {shiftLeader && (
        <button
          onClick={() => setHelpOpen(true)}
          style={{ position: "fixed", bottom: 80, right: 20, width: 54, height: 54, borderRadius: "50%", background: "#34C759", border: "none", color: "white", fontSize: 26, fontWeight: 900, cursor: "pointer", boxShadow: "0 4px 18px rgba(52,199,89,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}
        >
          ?
        </button>
      )}

      {/* Shift leader help modal */}
      {helpOpen && shiftLeader && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 16px 36px" }}>
          <div style={{ background: "white", borderRadius: 20, padding: "24px", width: "100%", maxWidth: 400 }}>
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

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}
