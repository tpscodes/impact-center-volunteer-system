// NewVolunteerTasks.jsx — Simple tap-to-claim interface, no login required
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSharedTasks } from "../hooks/useSharedTasks";
import { MapPin, ChevronRight, ClipboardList } from "lucide-react";
import { PANTRY_ID } from "../config";

const GRAY = { dark: "#1e1e1e", mid: "#09665e", soft: "#6B7280", light: "#9CA3AF", border: "#E5E7EB", bg: "#f5f5f5" };

function formatDisplayName(first, last) {
  return `${first.trim()} ${last.trim().charAt(0).toUpperCase()}.`;
}

// New volunteers only see "available" tasks not specifically assigned to a named volunteer
// Self-contained: uses its own hook so slRef.current is always fresh and won't
// accidentally overwrite shiftLeader when claiming/completing tasks.
export default function NewVolunteerTasks() {
  const navigate = useNavigate();
  const { tasks, synced, error, session, claimTask, completeTask, shiftLeader, completedTasks } = useSharedTasks(PANTRY_ID);

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
  const [toast, setToast] = useState({ show: false, message: '' });

  // Show available + incomplete tasks that are open (no specific named assignment)
  const openTasks = tasks.filter(t =>
    (t.status === "available" || t.status === "incomplete") &&
    (!t.assignedTo || t.assignedTo === "" || t.assignedTo === "new")
  );

  const myTask = tasks.find(t => t.id === myTaskId && t.status === "in-progress");

  function showToastMsg(message) {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 2200);
  }

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
    showToastMsg('Task claimed ✓');
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
      <div style={{ minHeight: '100vh', background: '#F3F5F6', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
        <header style={{ background: 'linear-gradient(144.76deg, #0f7a70 14.286%, #0a2a3a 85.714%)', padding: '20px 20px 24px', borderRadius: '0 0 24px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.66)', margin: '0 0 2px' }}>Welcome</p>
            <p style={{ fontSize: 19, fontWeight: 700, color: '#fff', margin: 0 }}>New Volunteer</p>
          </div>
          <button onClick={() => navigate("/")} style={{ height: 36, padding: '0 16px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.4)', background: 'transparent', color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>Exit</button>
        </header>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#0A2A3A', margin: '0 0 8px' }}>No active session right now</p>
          <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>Check back when the pantry opens</p>
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
      <div style={{ minHeight: '100vh', background: '#F3F5F6', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>

        {/* Gradient hero */}
        <header style={{ background: 'linear-gradient(144.76deg, #0f7a70 14.286%, #0a2a3a 85.714%)', padding: '16px 20px 22px', borderRadius: '0 0 24px 24px', display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
          <button
            onClick={() => setDetailTask(null)}
            style={{ alignSelf: 'flex-start', height: 36, padding: '0 16px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M15 5L8 12L15 19" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Back
          </button>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.66)', margin: 0 }}>
              {isActive ? "Your Task" : "Task Details"}
            </p>
            <p style={{ fontSize: 19, fontWeight: 700, color: '#fff', margin: '4px 0 0', lineHeight: 1.3 }}>{activeTaskForDetail.name}</p>
          </div>
        </header>

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, padding: 16, paddingBottom: 88 }}>

          {activeTaskForDetail.action && (
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 18, boxShadow: '0 8px 20px rgba(10,42,58,0.05)' }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 6 }}>What to do</label>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#0A2A3A' }}>{activeTaskForDetail.action}</div>
            </div>
          )}

          {activeTaskForDetail.destination && (
            <div style={{ background: '#0A2A3A', border: '1px solid #0A2A3A', borderRadius: 16, padding: 18, boxShadow: '0 8px 20px rgba(10,42,58,0.05)' }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0119 9.5C19 14.8 12 21 12 21z" stroke="#FF8A8A" strokeWidth="1.8" strokeLinejoin="round"/><circle cx="12" cy="9.5" r="2.2" stroke="#FF8A8A" strokeWidth="1.6"/></svg>
                Where to go
              </label>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>{activeTaskForDetail.destination}</div>
            </div>
          )}

          {activeTaskForDetail.item && (
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 18, boxShadow: '0 8px 20px rgba(10,42,58,0.05)' }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 6 }}>Item</label>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#0A2A3A' }}>{activeTaskForDetail.item}</div>
            </div>
          )}

          {activeTaskForDetail.comments && (
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderLeft: '4px solid #0F7A70', borderRadius: 16, padding: 18, boxShadow: '0 8px 20px rgba(10,42,58,0.05)' }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 6 }}>Instructions</label>
              <div style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{activeTaskForDetail.comments}</div>
            </div>
          )}

          {shiftLeader && (
            <div style={{ background: '#F0FDF4', border: '1px solid #E5E7EB', borderLeft: '4px solid #34C759', borderRadius: 16, padding: 18 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#16A34A', marginBottom: 6 }}>Need help? Find your point of contact</label>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#0A2A3A' }}>{shiftLeader.name}</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>They're wearing an orange lanyard</div>
            </div>
          )}
        </div>

        {/* Fixed claim / done bar */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #E5E7EB', padding: '14px 16px', zIndex: 50 }}>
          {isActive ? (
            <button
              onClick={handleComplete}
              disabled={completing}
              style={{ width: '100%', height: 54, borderRadius: 9999, border: 'none', background: completing ? '#D1D5DB' : '#0D9488', color: '#fff', fontSize: 15, fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase', cursor: completing ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'background 0.15s' }}>
              {completing ? 'Saving…' : '✓ Mark Done'}
            </button>
          ) : (
            <button
              onClick={() => handleClaim(activeTaskForDetail)}
              disabled={!!myTaskId}
              style={{ width: '100%', height: 54, borderRadius: 9999, border: 'none', background: myTaskId ? '#F3F4F6' : '#0D9488', color: myTaskId ? '#9CA3AF' : '#fff', fontSize: 15, fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase', cursor: myTaskId ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'background 0.15s' }}>
              {myTaskId ? 'Complete your current task first' : 'Tap to Claim'}
            </button>
          )}
        </div>

        {/* Toast */}
        <div style={{ position: 'fixed', bottom: 88, left: '50%', transform: `translateX(-50%) translateY(${toast.show ? 0 : 20}px)`, background: '#0A2A3A', color: '#fff', padding: '12px 20px', borderRadius: 9999, fontSize: 13, fontWeight: 600, opacity: toast.show ? 1 : 0, pointerEvents: 'none', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)', zIndex: 200 }}>
          {toast.message}
        </div>

        <style>{`@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }`}</style>
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
  const allInProgressCount = tasks.filter(t => t.status === 'in-progress').length;

  return (
    <div style={{ minHeight: '100vh', background: '#F3F5F6', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>

      {/* ── Gradient hero ─────────────────────────────────────────────────── */}
      <header style={{ background: 'linear-gradient(144.76deg, #0f7a70 14.286%, #0a2a3a 85.714%)', padding: '20px 20px 24px', borderRadius: '0 0 24px 24px', display: 'flex', flexDirection: 'column', gap: 16, flexShrink: 0 }}>

        {/* Name + exit */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.66)', margin: '0 0 2px' }}>Welcome</p>
            <p style={{ fontSize: 19, fontWeight: 700, color: '#fff', margin: 0 }}>{displayName}</p>
          </div>
          <button
            onClick={() => navigate("/")}
            style={{ height: 36, padding: '0 16px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.4)', background: 'transparent', color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
            Exit
          </button>
        </div>

        {/* Working-on glass card — claimed task: shown here, removed from list below */}
        {myTask && (
          <div
            onClick={() => setDetailTask(myTask)}
            style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: 16, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6, cursor: 'pointer' }}>
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ADE80', display: 'inline-block', animation: 'pulseGreen 2s infinite', flexShrink: 0 }} />
              You're working on
            </p>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: 0 }}>{myTask.name}</p>
            {myTask.destination && (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.66)', margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                <MapPin size={12} style={{ flexShrink: 0 }} />
                {myTask.destination}
              </p>
            )}
            <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
              Tap for details
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </p>
          </div>
        )}

        {/* Stat row */}
        <div style={{ display: 'flex' }}>
          {[
            [myTask ? availableTasks.length : openTasks.length, 'Available'],
            [allInProgressCount, 'In Progress'],
            [(completedTasks || []).filter(t => t.completedBy === displayName).length, 'Completed'],
          ].map(([num, label], i, arr) => (
            <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, paddingRight: i < arr.length - 1 ? 12 : 0, borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.18)' : 'none' }}>
              <p style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1 }}>{num}</p>
              <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.72)', margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>
      </header>

      {/* ── Scrollable content ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 24px' }}>

        {/* Concurrency block warning */}
        {claimBlocked && (
          <div style={{ background: '#FFF3E0', border: '1px solid #FCD34D', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#92400E', margin: 0 }}>You already have an active task — complete it first</p>
          </div>
        )}

        {/* Empty state */}
        {openTasks.length === 0 && !myTask && (
          <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 14, padding: '40px 0' }}>
            {myTaskId ? 'Complete your task to see more!' : 'No open tasks right now — check back soon!'}
          </p>
        )}

        {/* Incomplete section */}
        {incompleteTasks.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: '#DC2626', margin: '0 0 12px' }}>Incomplete</p>
            {incompleteTasks.map(task => (
              <NvTaskCard
                key={task.id}
                task={task}
                statusLabel="Incomplete"
                statusBg="#FFF0F0"
                statusFg="#DC2626"
                disabled={!!myTask}
                ctaText="Tap to claim and finish"
                onClick={() => setDetailTask(task)}
              />
            ))}
          </div>
        )}

        {/* Available tasks */}
        {(myTask ? availableTasks : availableTasks).length > 0 || (!myTask && availableTasks.length > 0) ? (
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: '#6B7280', margin: '0 0 12px' }}>Available Tasks</p>
            {availableTasks.map(task => (
              <NvTaskCard
                key={task.id}
                task={task}
                statusLabel={task.priority || 'Normal'}
                statusBg={task.priority === 'Urgent' ? '#FFF0F0' : task.priority === 'High' ? '#FFF3E0' : '#F3F4F6'}
                statusFg={task.priority === 'Urgent' ? '#DC2626' : task.priority === 'High' ? '#9A5000' : '#6B7280'}
                disabled={!!myTask}
                ctaText="Tap for details"
                onClick={() => setDetailTask(task)}
              />
            ))}
          </div>
        ) : null}

      </div>

      {/* Shift leader help FAB */}
      {shiftLeader && (
        <button
          onClick={() => setHelpOpen(true)}
          style={{ position: 'fixed', bottom: 24, right: 20, width: 54, height: 54, borderRadius: '50%', background: '#34C759', border: 'none', color: 'white', fontSize: 26, fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 18px rgba(52,199,89,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          ?
        </button>
      )}

      {/* Shift leader help modal */}
      {helpOpen && shiftLeader && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 16px 36px' }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#34C759', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Need Help?</div>
            <div style={{ fontSize: 19, fontWeight: 700, color: '#0A2A3A', marginBottom: 16 }}>Find your Shift Leader:</div>
            <div style={{ background: '#F0FDF4', borderRadius: 12, padding: '16px 18px', marginBottom: 16, borderLeft: '4px solid #34C759' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0A2A3A' }}>{shiftLeader.name}</div>
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 5 }}>They're wearing an orange lanyard</div>
            </div>
            <button
              onClick={() => setHelpOpen(false)}
              style={{ width: '100%', padding: '13px 0', background: '#0A2A3A', color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Got it ✓
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: `translateX(-50%) translateY(${toast.show ? 0 : 20}px)`, background: '#0A2A3A', color: '#fff', padding: '12px 20px', borderRadius: 9999, fontSize: 13, fontWeight: 600, opacity: toast.show ? 1 : 0, pointerEvents: 'none', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)', zIndex: 200 }}>
        {toast.message}
      </div>

      <style>{`
        @keyframes pulseGreen {
          0%   { box-shadow: 0 0 0 0 rgba(74,222,128,0.55); }
          70%  { box-shadow: 0 0 0 8px rgba(74,222,128,0); }
          100% { box-shadow: 0 0 0 0 rgba(74,222,128,0); }
        }
        @media (prefers-reduced-motion: reduce) { *, .pulse-dot { animation: none !important; transition: none !important; } }
      `}</style>
    </div>
  );
}

// ── New Volunteer task card ───────────────────────────────────────────────────
function NvTaskCard({ task, statusLabel, statusBg, statusFg, disabled, ctaText, onClick }) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        background: disabled ? '#FAFBFB' : '#fff',
        border: '1px solid #E5E7EB',
        borderRadius: 16,
        padding: 16,
        display: 'flex',
        gap: 12,
        marginBottom: 10,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.borderColor = '#0D9488'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; }}
    >
      <div style={{ width: 38, height: 38, borderRadius: 10, background: disabled ? '#F0F1F2' : '#E6F5F3', color: disabled ? '#B0B7BF' : '#0F7A70', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <ClipboardList size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <p style={{ fontSize: 14.5, fontWeight: 600, color: disabled ? '#B0B7BF' : '#0A2A3A', margin: 0, lineHeight: 1.35 }}>{task.name || task.item}</p>
          <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 9999, background: disabled ? '#F0F1F2' : statusBg, color: disabled ? '#B0B7BF' : statusFg, whiteSpace: 'nowrap' }}>{statusLabel}</span>
        </div>
        {(task.source || task.destination) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: disabled ? '#B0B7BF' : '#6B7280' }}>
            <MapPin size={12} style={{ flexShrink: 0 }} />
            <span>{[task.source, task.destination].filter(Boolean).join(' → ')}</span>
          </div>
        )}
        <div style={{ fontSize: 12.5, fontWeight: 600, color: disabled ? '#B0B7BF' : '#0F7A70', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
          {ctaText}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </div>
    </div>
  );
}
