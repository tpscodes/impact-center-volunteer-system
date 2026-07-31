// ExperiencedVolunteer flows: ID entry → Task Pool → My Task → Complete
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { VOLUNTEER_PROFILES, useSharedTasks } from "../hooks/useSharedTasks";
import { useIsTablet } from "../hooks/useBreakpoint";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import MobileHeroShell from "../components/MobileHeroShell";

const GRAY = { dark: "#1e1e1e", mid: "#09665e", soft: "#6B7280", light: "#9CA3AF", border: "#E5E7EB", bg: "#f5f5f5" };

// ── ID Entry Screen ──────────────────────────────────────────────────────────
export function VolunteerIdEntry() {
  const [id, setId] = useState("");
  const [error, setError] = useState("");
  const [firebaseVolunteers, setFirebaseVolunteers] = useState(null);
  const navigate = useNavigate();

  // Load the live volunteer roster from Firebase (populated by ManagerVolunteers)
  useEffect(() => {
    const unsub = onValue(ref(db, 'volunteers'), (snap) => {
      const data = snap.val();
      if (data) setFirebaseVolunteers(Object.values(data));
    });
    return () => unsub();
  }, []);

  function handleSubmit(e) {
    if (e) e.preventDefault();
    if (id.length < 4) { setError("Please enter all 4 digits."); return; }
    // Check Firebase volunteers first, fall back to hardcoded profiles
    const roster = firebaseVolunteers || VOLUNTEER_PROFILES;
    const profile = roster.find(p => String(p.id) === String(id));
    if (!profile) {
      setError("ID not recognized. Please check with your session coordinator.");
      return;
    }
    sessionStorage.setItem("volunteerId", String(profile.id));
    sessionStorage.setItem("volunteerName", profile.name);
    if (profile.isDriver === true) {
      navigate("/volunteer-mode-select", { state: { volunteer: profile } });
    } else {
      navigate("/experienced/tasks");
    }
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
            <label className="text-base text-[#1e1e1e]">Enter your 4-digit ID of your phone number</label>
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

  const volunteerId = sessionStorage.getItem("volunteerId") || "";
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
  const location = useLocation();
  const pantryId = new URLSearchParams(location.search).get('pantry') || 'jason';
  const { tasks, completeTask, clearShiftLeader, markTaskIncomplete, shiftLeader } = useSharedTasks(pantryId);
  const [completing, setCompleting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showUnclaimModal, setShowUnclaimModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '' });

  const volunteerId = sessionStorage.getItem("volunteerId") || "";
  const myTask = tasks.find(t => t.assignedTo === volunteerId && t.status === "in-progress");

  const isShiftLeader = !!myTask && shiftLeader?.taskId === myTask.id;

  const newVolTasks = tasks.filter(t => {
    if (t.status === "in-progress" && (t.assignedTo || "").startsWith("new-")) return true;
    if ((t.status === "available" || t.status === "incomplete") &&
        (!t.assignedTo || t.assignedTo === "" || t.assignedTo === "new")) return true;
    return false;
  });

  useEffect(() => {
    if (!myTask) return;
    const start = myTask.claimedAt || Date.now();
    setElapsed(Math.floor((Date.now() - start) / 1000));
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [myTask?.id]);

  function showToastMsg(message) {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 2200);
  }

  async function handleConfirmUnclaim() {
    if (!myTask) return;
    setShowUnclaimModal(false);
    await markTaskIncomplete(myTask.id);
    navigate(`/task-pool?pantry=${pantryId}`);
  }

  async function handleConfirmComplete() {
    if (!myTask) return;
    setShowCompleteModal(false);
    setCompleting(true);
    const isShiftLeaderTask = (myTask.tags || []).includes("Shift Leader");
    const completedBy = myTask.assignedName || sessionStorage.getItem("volunteerName") || volunteerId;
    await completeTask(myTask.id, completedBy);
    if (isShiftLeaderTask) await clearShiftLeader();
    showToastMsg('Task marked complete ✓');
    setTimeout(() => navigate(`/task-pool?pantry=${pantryId}`), 1200);
  }

  const isTablet = useIsTablet();

  if (isTablet) {
    return (
      <div style={{ minHeight: '100vh', background: '#D3EDE9', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif", padding: 20 }}>
        <div style={{ width: '100%', maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, padding: '0 8px 0 24px', borderRadius: 9999, background: '#0A2A3A', boxShadow: '0 8px 20px rgba(10,42,58,0.18)', flexShrink: 0 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', margin: 0 }}>Experienced Volunteer</p>
              <p style={{ fontSize: 16, fontWeight: 600, color: '#fff', margin: 0 }}>My Task</p>
            </div>
            <button
              onClick={() => { sessionStorage.removeItem("volunteerId"); navigate("/"); }}
              style={{ height: 44, padding: '0 20px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
              Exit
            </button>
          </div>

          {!myTask ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>{completing ? "✅" : "📭"}</div>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#0A2A3A', margin: '0 0 8px' }}>
                {completing ? "Task Complete!" : "No active task"}
              </p>
              <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 24px' }}>
                {completing ? "Heading back to task pool…" : "Head back to pick a new one!"}
              </p>
              {!completing && (
                <button onClick={() => navigate(`/task-pool?pantry=${pantryId}`)}
                  style={{ padding: '12px 24px', background: '#09665e', color: '#fff', borderRadius: 9999, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                  ← Back to Tasks
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Status banner */}
              <div style={{ background: '#0A2A3A', borderRadius: 20, padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFA726', display: 'inline-block', animation: 'pulseOrange 2s infinite', flexShrink: 0 }} />
                  In Progress
                </p>
                <p style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>{myTask.name || myTask.item}</p>
              </div>

              {/* Shift leader badge */}
              {(myTask.tags || []).includes("Shift Leader") && (
                <div style={{ padding: '12px 16px', background: '#fff7ed', borderRadius: 12, borderLeft: '4px solid #ff9500' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#ff9500', margin: 0 }}>🟠 You are the Shift Leader — new volunteers can find you for help</p>
                </div>
              )}

              {/* Cards row */}
              <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

                {/* Detail card */}
                <div style={{ flex: 1.4, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: 28, boxShadow: '0 8px 20px rgba(10,42,58,0.05)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px 20px', alignContent: 'start' }}>
                  {[["Action", myTask.action], ["Item", myTask.item], ["Source", myTask.source], ["To", myTask.destination]].filter(([, v]) => v).map(([label, val]) => (
                    <div key={label}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 6 }}>{label}</label>
                      <div style={{ fontSize: 16, fontWeight: 600, color: '#0A2A3A' }}>{val}</div>
                    </div>
                  ))}
                  {(myTask.specialInstructions || myTask.comments) && (
                    <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #E5E7EB', paddingTop: 20 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 6 }}>Special Instructions</label>
                      <p style={{ fontSize: 14, color: '#6B7280', margin: 0, lineHeight: 1.5, fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
                        {myTask.specialInstructions || myTask.comments}
                      </p>
                    </div>
                  )}
                  {myTask.tags && myTask.tags.length > 0 && (
                    <div style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {myTask.tags.map(tag => (
                        <span key={tag} style={{ background: '#E6F5F3', color: '#09665e', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 8 }}>{tag}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Side panel */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: 24, boxShadow: '0 8px 20px rgba(10,42,58,0.05)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#0A2A3A' }}>Finished this task?</h4>
                    <p style={{ margin: 0, fontSize: 13, color: '#6B7280', lineHeight: 1.5 }}>Mark it complete once done, or unclaim it to release it back to the pool.</p>
                    <button
                      onClick={() => setShowCompleteModal(true)}
                      disabled={completing}
                      style={{ height: 50, borderRadius: 9999, border: 'none', background: '#0D9488', color: '#fff', fontSize: 14, fontWeight: 600, cursor: completing ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: completing ? 0.5 : 1 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      {completing ? "Saving…" : "Mark Complete"}
                    </button>
                    <button
                      onClick={() => setShowUnclaimModal(true)}
                      disabled={completing}
                      style={{ height: 50, borderRadius: 9999, border: '1px solid #DC2626', background: '#FFF0F0', color: '#DC2626', fontSize: 14, fontWeight: 600, cursor: completing ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: completing ? 0.5 : 1 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                      Unclaim
                    </button>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <button onClick={() => navigate(`/task-pool?pantry=${pantryId}`)}
                      style={{ fontSize: 13, color: '#6B7280', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                      ← Back to Task Pool
                    </button>
                  </div>
                </div>
              </div>

              {/* Shift Leader: new volunteer tasks panel (tablet — below cards row) */}
              {isShiftLeader && (
                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: 24, boxShadow: '0 8px 20px rgba(10,42,58,0.05)' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#ff9500', margin: '0 0 16px' }}>
                    🟠 New Volunteer Tasks ({newVolTasks.length})
                  </p>
                  {newVolTasks.length === 0 ? (
                    <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', margin: 0 }}>No new volunteers working right now</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {newVolTasks.map(t => {
                        const isActive = t.status === "in-progress";
                        const isIncomplete = t.status === "incomplete";
                        return (
                          <div key={t.id} style={{ borderRadius: 16, border: `1px solid ${isActive ? '#fed7aa' : isIncomplete ? '#fecaca' : '#E5E7EB'}`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <p style={{ fontSize: 14, fontWeight: 600, color: '#0A2A3A', margin: 0 }}>{t.name}</p>
                                <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 9999, padding: '1px 8px', flexShrink: 0, background: isActive ? '#fff7ed' : isIncomplete ? '#fee2e2' : '#f0fdf4', color: isActive ? '#ff9500' : isIncomplete ? '#dc2626' : '#16a34a' }}>
                                  {isActive ? "In Progress" : isIncomplete ? "Incomplete" : "Available"}
                                </span>
                              </div>
                              <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>📍 {t.destination}</p>
                            </div>
                            {isActive && (
                              <button onClick={() => markTaskIncomplete(t.id)}
                                style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: '#ef4444', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', flexShrink: 0, marginLeft: 12, fontFamily: 'inherit' }}>
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

        {/* Shared modals + toast — same as mobile */}
        {showUnclaimModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,42,58,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 100 }}
            onClick={e => { if (e.target === e.currentTarget) setShowUnclaimModal(false); }}>
            <div style={{ background: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h4 style={{ margin: 0, fontSize: 17, color: '#0A2A3A' }}>Unclaim this task?</h4>
              <p style={{ margin: 0, fontSize: 14, color: '#6B7280', lineHeight: 1.5 }}>It'll go back into the available pool for another volunteer to pick up.</p>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button onClick={() => setShowUnclaimModal(false)}
                  style={{ flex: 1, height: 44, borderRadius: 9999, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', border: 'none', background: '#F3F5F6', color: '#0A2A3A' }}>Cancel</button>
                <button onClick={handleConfirmUnclaim}
                  style={{ flex: 1, height: 44, borderRadius: 9999, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', border: 'none', background: '#DC2626', color: '#fff' }}>Unclaim</button>
              </div>
            </div>
          </div>
        )}
        {showCompleteModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,42,58,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 100 }}
            onClick={e => { if (e.target === e.currentTarget) setShowCompleteModal(false); }}>
            <div style={{ background: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h4 style={{ margin: 0, fontSize: 17, color: '#0A2A3A' }}>Mark task complete?</h4>
              <p style={{ margin: 0, fontSize: 14, color: '#6B7280', lineHeight: 1.5 }}>{myTask?.name || 'This task'} will be removed from your active tasks.</p>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button onClick={() => setShowCompleteModal(false)}
                  style={{ flex: 1, height: 44, borderRadius: 9999, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', border: 'none', background: '#F3F5F6', color: '#0A2A3A' }}>Cancel</button>
                <button onClick={handleConfirmComplete}
                  style={{ flex: 1, height: 44, borderRadius: 9999, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', border: 'none', background: '#0D9488', color: '#fff' }}>Mark Complete</button>
              </div>
            </div>
          </div>
        )}
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: `translateX(-50%) translateY(${toast.show ? 0 : 20}px)`, background: '#0A2A3A', color: '#fff', padding: '12px 20px', borderRadius: 9999, fontSize: 13, fontWeight: 600, opacity: toast.show ? 1 : 0, pointerEvents: 'none', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)', zIndex: 200 }}>
          {toast.message}
        </div>
        <style>{`
          @keyframes pulseOrange { 0% { box-shadow: 0 0 0 0 rgba(255,167,38,0.55); } 70% { box-shadow: 0 0 0 9px rgba(255,167,38,0); } 100% { box-shadow: 0 0 0 0 rgba(255,167,38,0); } }
          @media (prefers-reduced-motion: reduce) { *, .pulse-dot { animation: none !important; transition: none !important; } }
        `}</style>
      </div>
    );
  }

  const S = { fontFamily: "'Inter', sans-serif" };

  return (
    <div style={{ minHeight: '100vh', background: '#F3F5F6', display: 'flex', flexDirection: 'column', ...S }}>

      {/* ── Gradient hero ───────────────────────────────────────────────────── */}
      <MobileHeroShell as="header" style={{ padding: '20px 20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.66)', margin: '0 0 2px' }}>Experienced Volunteer</p>
          <p style={{ fontSize: 19, fontWeight: 700, color: '#fff', margin: 0 }}>My Task</p>
        </div>
        <button
          onClick={() => { sessionStorage.removeItem("volunteerId"); navigate("/"); }}
          style={{ height: 36, padding: '0 16px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.4)', background: 'transparent', color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
          Exit
        </button>
      </MobileHeroShell>

      {/* ── Scrollable content ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 24 }}>

        {!myTask ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>{completing ? "✅" : "📭"}</div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#0A2A3A', margin: '0 0 8px' }}>
              {completing ? "Task Complete!" : "No active task"}
            </p>
            <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 24px' }}>
              {completing ? "Heading back to task pool…" : "Head back to pick a new one!"}
            </p>
            {!completing && (
              <button onClick={() => navigate(`/task-pool?pantry=${pantryId}`)}
                style={{ padding: '12px 24px', background: '#09665e', color: '#fff', borderRadius: 9999, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                ← Back to Tasks
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Status banner with pulse dot */}
            <div style={{ background: '#0A2A3A', borderRadius: 16, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', margin: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#FFA726', display: 'inline-block', animation: 'pulseOrange 2s infinite', flexShrink: 0 }} />
                In Progress
              </p>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.3 }}>{myTask.name || myTask.item}</p>
            </div>

            {/* Shift leader badge */}
            {(myTask.tags || []).includes("Shift Leader") && (
              <div style={{ padding: '12px 16px', background: '#fff7ed', borderRadius: 12, borderLeft: '4px solid #ff9500' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#ff9500', margin: 0 }}>🟠 You are the Shift Leader — new volunteers can find you for help</p>
              </div>
            )}

            {/* Task details card */}
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: 20, boxShadow: '0 8px 20px rgba(10,42,58,0.05)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 16px' }}>
              {[["Action", myTask.action], ["Item", myTask.item], ["Source", myTask.source], ["To", myTask.destination]].filter(([, v]) => v).map(([label, val]) => (
                <div key={label}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 5 }}>{label}</label>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: '#0A2A3A' }}>{val}</div>
                </div>
              ))}
              {(myTask.specialInstructions || myTask.comments) && (
                <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #E5E7EB', paddingTop: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 5 }}>Special Instructions</label>
                  <p style={{ fontSize: 14, color: '#6B7280', margin: 0, lineHeight: 1.5, fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
                    {myTask.specialInstructions || myTask.comments}
                  </p>
                </div>
              )}
              {myTask.tags && myTask.tags.length > 0 && (
                <div style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {myTask.tags.map(tag => (
                    <span key={tag} style={{ background: '#E6F5F3', color: '#09665e', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 8 }}>{tag}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                onClick={() => setShowUnclaimModal(true)}
                disabled={completing}
                style={{ flex: 1, height: 50, borderRadius: 9999, border: '1px solid #DC2626', background: '#FFF0F0', color: '#DC2626', fontSize: 14, fontWeight: 600, cursor: completing ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: completing ? 0.5 : 1 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                Unclaim
              </button>
              <button
                onClick={() => setShowCompleteModal(true)}
                disabled={completing}
                style={{ flex: 1, height: 50, borderRadius: 9999, border: 'none', background: '#0D9488', color: '#fff', fontSize: 14, fontWeight: 600, cursor: completing ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: completing ? 0.5 : 1 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {completing ? "Saving…" : "Mark Complete"}
              </button>
            </div>

            {/* Back to Task Pool */}
            <div style={{ textAlign: 'center', marginTop: 6 }}>
              <button onClick={() => navigate(`/task-pool?pantry=${pantryId}`)}
                style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                ← Back to Task Pool
              </button>
            </div>

            {/* Shift Leader: new volunteer tasks panel */}
            {isShiftLeader && (
              <div style={{ marginTop: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#ff9500', margin: '0 0 12px' }}>
                  🟠 New Volunteer Tasks ({newVolTasks.length})
                </p>
                {newVolTasks.length === 0 ? (
                  <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 16, fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>
                    No new volunteers working right now
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {newVolTasks.map(t => {
                      const isActive = t.status === "in-progress";
                      const isIncomplete = t.status === "incomplete";
                      return (
                        <div key={t.id} style={{ background: '#fff', borderRadius: 16, border: `1px solid ${isActive ? '#fed7aa' : isIncomplete ? '#fecaca' : '#E5E7EB'}`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <p style={{ fontSize: 14, fontWeight: 600, color: '#0A2A3A', margin: 0 }}>{t.name}</p>
                              <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 9999, padding: '1px 8px', flexShrink: 0, background: isActive ? '#fff7ed' : isIncomplete ? '#fee2e2' : '#f0fdf4', color: isActive ? '#ff9500' : isIncomplete ? '#dc2626' : '#16a34a' }}>
                                {isActive ? "In Progress" : isIncomplete ? "Incomplete" : "Available"}
                              </span>
                            </div>
                            <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>📍 {t.destination}</p>
                            <p style={{ fontSize: 11, color: '#9CA3AF', margin: '4px 0 0' }}>
                              {isActive ? (t.assignedName || "New Volunteer") : "Unassigned"} · {t.estimatedTime}
                            </p>
                          </div>
                          {isActive && (
                            <button onClick={() => markTaskIncomplete(t.id)}
                              style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: '#ef4444', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', flexShrink: 0, marginLeft: 12, fontFamily: 'inherit' }}>
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

      {/* ── Bottom tab bar ─────────────────────────────────────────────────── */}
      <nav style={{ background: '#D3EDE9', display: 'flex', padding: '6px 16px 10px', borderTop: '1px solid rgba(10,42,58,0.06)', flexShrink: 0 }}>
        <button onClick={() => navigate(`/task-pool?pantry=${pantryId}`)}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '8px 0', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', color: '#8B95A1', fontSize: 12.5, fontWeight: 500 }}>
          Available
        </button>
        <button
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '8px 0', background: 'transparent', border: 'none', cursor: 'default', fontFamily: 'inherit', color: '#0A2A3A', fontSize: 12.5, fontWeight: 700, position: 'relative' }}>
          <span style={{ position: 'absolute', top: -6, left: '20%', right: '20%', height: 3, background: '#0D9488', borderRadius: 2 }} />
          My Task
        </button>
      </nav>

      {/* ── Unclaim confirm modal ───────────────────────────────────────────── */}
      {showUnclaimModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,42,58,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 100 }}
          onClick={e => { if (e.target === e.currentTarget) setShowUnclaimModal(false); }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h4 style={{ margin: 0, fontSize: 17, color: '#0A2A3A' }}>Unclaim this task?</h4>
            <p style={{ margin: 0, fontSize: 14, color: '#6B7280', lineHeight: 1.5 }}>It'll go back into the available pool for another volunteer to pick up.</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button onClick={() => setShowUnclaimModal(false)}
                style={{ flex: 1, height: 44, borderRadius: 9999, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', border: 'none', background: '#F3F5F6', color: '#0A2A3A' }}>
                Cancel
              </button>
              <button onClick={handleConfirmUnclaim}
                style={{ flex: 1, height: 44, borderRadius: 9999, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', border: 'none', background: '#DC2626', color: '#fff' }}>
                Unclaim
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mark complete confirm modal ─────────────────────────────────────── */}
      {showCompleteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,42,58,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 100 }}
          onClick={e => { if (e.target === e.currentTarget) setShowCompleteModal(false); }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h4 style={{ margin: 0, fontSize: 17, color: '#0A2A3A' }}>Mark task complete?</h4>
            <p style={{ margin: 0, fontSize: 14, color: '#6B7280', lineHeight: 1.5 }}>
              {myTask?.name || 'This task'} will be removed from your active tasks.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button onClick={() => setShowCompleteModal(false)}
                style={{ flex: 1, height: 44, borderRadius: 9999, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', border: 'none', background: '#F3F5F6', color: '#0A2A3A' }}>
                Cancel
              </button>
              <button onClick={handleConfirmComplete}
                style={{ flex: 1, height: 44, borderRadius: 9999, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', border: 'none', background: '#0D9488', color: '#fff' }}>
                Mark Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ───────────────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 24, left: '50%',
        transform: `translateX(-50%) translateY(${toast.show ? 0 : 20}px)`,
        background: '#0A2A3A', color: '#fff', padding: '12px 20px', borderRadius: 9999,
        fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8,
        opacity: toast.show ? 1 : 0, pointerEvents: 'none',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)', zIndex: 200,
      }}>
        {toast.message}
      </div>

      <style>{`
        @keyframes pulseOrange {
          0%   { box-shadow: 0 0 0 0 rgba(255,167,38,0.55); }
          70%  { box-shadow: 0 0 0 8px rgba(255,167,38,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,167,38,0); }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
      `}</style>
    </div>
  );
}
