// ManagerDashboard.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { ref, get } from "firebase/database";
import { Plus, Menu } from "lucide-react";

function fmtTime(ms) {
  if (!ms) return "";
  return new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function timeStrToMs(str) {
  if (!str) return null;
  const [h, m] = str.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

function StatusBadge({ status }) {
  const cfg = {
    available:     { label: "Available",   bg: "#e6e6e6", color: "#757575" },
    "in-progress": { label: "In Progress", bg: "rgba(255,149,0,0.15)", color: "#ff9500" },
    complete:      { label: "Complete",    bg: "rgba(52,199,89,0.15)",  color: "#34c759" },
    incomplete:    { label: "Incomplete",  bg: "rgba(220,38,38,0.15)", color: "#dc2626" },
  }[status] || { label: status, bg: "#e6e6e6", color: "#757575" };
  return (
    <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 8, padding: "3px 10px", fontSize: 14, fontWeight: 600 }}>
      {cfg.label}
    </span>
  );
}

const GRAY = { dark: "#1F2937", soft: "#6B7280", light: "#9CA3AF", border: "#E5E7EB" };

export default function ManagerDashboard({ tasks, onDeleteTask, onMarkIncomplete, onResetTasks, onCompleteTask, synced, error, session, onStartSession, onEndSession }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("All");

  // Session modal state
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("open");
  const [startTimeStr, setStartTimeStr] = useState("");
  const [endTimeStr, setEndTimeStr] = useState("");
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [starting, setStarting] = useState(false);

  // End session confirmation
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [ending, setEnding] = useState(false);

  // Load saved session settings when modal opens
  useEffect(() => {
    if (!showModal) return;
    const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
    const now = new Date();
    const nowStr = now.toTimeString().slice(0, 5);
    setStartTimeStr(nowStr);
    setEndTimeStr("");
    setLoadingSettings(true);
    get(ref(db, `sessionSettings/${dayOfWeek}`)).then(snap => {
      const s = snap.val();
      if (s) {
        setStartTimeStr(s.defaultStartTime || nowStr);
        setEndTimeStr(s.defaultEndTime || "");
      }
    }).catch(() => {}).finally(() => setLoadingSettings(false));
  }, [showModal]);

  async function handleStartSession() {
    setStarting(true);
    try {
      const startMs = modalType === "timed" ? timeStrToMs(startTimeStr) : Date.now();
      const endMs = modalType === "timed" ? timeStrToMs(endTimeStr) : null;
      await onStartSession({ type: modalType, startTime: startMs, endTime: endMs });
      setShowModal(false);
    } finally {
      setStarting(false);
    }
  }

  async function handleEndSession() {
    setEnding(true);
    try {
      await onEndSession();
      setShowEndConfirm(false);
    } finally {
      setEnding(false);
    }
  }

  const isSessionActive = session?.isActive && (
    session.type !== "timed" || !session.endTime || Date.now() < session.endTime
  );

  const active = tasks.filter(t => t.status !== "complete");
  const inProgress = tasks.filter(t => t.status === "in-progress");
  const completed = tasks.filter(t => t.status === "complete");
  const incomplete = tasks.filter(t => t.status === "incomplete");
  const rolledOver = tasks.filter(t => t.rolledOver === true);
  const volunteersActive = [...new Set(tasks.filter(t => t.assignedTo).map(t => t.assignedTo))].length;

  const todayStr = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

  const TAG_FILTERS = ["All", "Warehouse", "Kitchen", "Clothing"];

  let filtered = tasks.filter(t =>
    !search ||
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.item?.toLowerCase().includes(search.toLowerCase()) ||
    t.destination?.toLowerCase().includes(search.toLowerCase())
  );
  if (activeTag !== "All") {
    filtered = filtered.filter(t => (t.tags || []).includes(activeTag));
  }

  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* ══════════════════════════════════════════
          MOBILE LAYOUT — screens under lg (1024px)
      ══════════════════════════════════════════ */}
      <div className="lg:hidden min-h-screen bg-[#f5f5f5]">

        {/* Mobile top bar */}
        <div className="bg-[#0a2a3a] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0d9488] flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-semibold">JB</span>
            </div>
            <div>
              <p className="text-[#b3b3b3] text-[16px] font-semibold leading-tight">Jason Bratina</p>
              <p className="text-[#757575] text-[14px] leading-tight">Operations Manager</p>
            </div>
          </div>
          <button className="text-white" onClick={() => navigate("/")}>
            <Menu size={24} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="px-4 py-5 flex flex-col gap-4">

          {/* Greeting + session status */}
          <div className="flex items-start justify-between">
            <h1 className="text-[22px] font-semibold text-[#1e1e1e] tracking-tight leading-tight">
              Good Morning,<br />Operations Manager
            </h1>
            {isSessionActive ? (
              <span className="bg-[#dcfce7] text-[#16a34a] text-[12px] font-semibold px-3 py-1.5 rounded-full shrink-0">
                ● Active
              </span>
            ) : (
              <span className="bg-[#f3f4f6] text-[#6b7280] text-[12px] font-semibold px-3 py-1.5 rounded-full shrink-0">
                ○ No Session
              </span>
            )}
          </div>

          {/* Metrics — 2×2 grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Active Tasks",      value: active.length,      color: "#0d9488" },
              { label: "In Progress",       value: inProgress.length,  color: "#bf6a02" },
              { label: "Completed Today",   value: completed.length,   color: "#0d9488" },
              { label: "Volunteers Active", value: volunteersActive,   color: "#1e1e1e" },
            ].map(m => (
              <div key={m.label} className="bg-white border border-[#e5e7ea] rounded-lg h-[90px] flex flex-col items-center justify-center gap-1">
                <p className="text-[#6b7280] text-[12px] font-semibold text-center px-2">{m.label}</p>
                <p className="text-[24px] font-semibold tracking-tight" style={{ color: m.color }}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            {isSessionActive ? (
              <button onClick={() => setShowEndConfirm(true)}
                className="flex-1 border border-[#900b09] bg-[#fdd3d0] text-[#900b09] py-3 rounded-lg text-[15px] font-semibold cursor-pointer">
                End Session
              </button>
            ) : (
              <button onClick={() => { setModalType("open"); setShowModal(true); }}
                className="flex-1 border border-[#16a34a] bg-[#dcfce7] text-[#16a34a] py-3 rounded-lg text-[15px] font-semibold cursor-pointer">
                ▶ Start Session
              </button>
            )}
            <button onClick={() => navigate("/manager/tasks")}
              className="flex-1 bg-[#09665e] text-[#f0fafa] py-3 rounded-lg text-[15px] font-semibold flex items-center justify-center gap-2 cursor-pointer">
              Create Task <Plus size={16} />
            </button>
          </div>

          {/* Active Tasks section */}
          <div className="bg-white rounded-lg overflow-hidden border border-[#e5e7ea]">
            {/* Header */}
            <div className="px-4 pt-4 pb-2">
              <p className="text-[16px] font-semibold text-[#1e1e1e] mb-3">Active Tasks</p>
              {/* Tag filters */}
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {TAG_FILTERS.map(tag => (
                  <button key={tag} onClick={() => setActiveTag(tag)}
                    className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold shrink-0 cursor-pointer border-none ${
                      activeTag === tag ? "bg-[#09665e] text-[#f0fafa]" : "bg-[#f0fafa] text-[#09665e]"
                    }`}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Task cards */}
            <div className="flex flex-col gap-3 px-3 pb-4 pt-2">
              {filtered.filter(t => t.status !== "complete").length === 0 && (
                <p className="text-center text-[#9ca3af] text-[14px] py-6">No active tasks</p>
              )}
              {filtered.filter(t => t.status !== "complete").map(task => (
                <div key={task.id} className="bg-[#f0fafa] border border-[#d1d5db] rounded-lg p-3">
                  {/* Row 1: name + status */}
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[#0a2a3a] text-[15px] font-medium flex-1">{task.name || task.item}</p>
                    <span className={`px-2 py-0.5 rounded-lg text-[12px] font-semibold shrink-0 ${
                      task.status === "in-progress" ? "bg-orange-100 text-[#ff9500]" :
                      task.status === "incomplete"  ? "bg-red-100 text-[#dc2626]" :
                      "bg-[#e6e6e6] text-[#757575]"
                    }`}>
                      {task.status === "in-progress" ? "In Progress" :
                       task.status === "incomplete"  ? "Incomplete"  : "Available"}
                    </span>
                  </div>
                  {/* Row 2: location */}
                  <p className="text-[#6b7280] text-[12px] mt-1">{task.source || task.destination || "—"}</p>
                  {/* Row 3: assigned + actions */}
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[#0a2a3a] text-[12px]">
                      {task.claimedByName || task.assignedName || "Unassigned"}
                    </p>
                    <div className="flex gap-3">
                      <button onClick={() => onCompleteTask(task.id, "Manager")}
                        className="text-[#303030] text-[12px] font-semibold bg-transparent border-none cursor-pointer">
                        Mark Complete
                      </button>
                      <button onClick={() => onDeleteTask(task.id)}
                        className="text-[#900b09] text-[12px] bg-transparent border-none cursor-pointer">
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ══════════════════════════════════════════
          DESKTOP LAYOUT — screens lg (1024px) and up
      ══════════════════════════════════════════ */}
      <div className="hidden lg:flex min-h-screen bg-[#f5f5f5]">

      {/* ── Sidebar ── */}
      <div className="w-[240px] min-h-screen bg-[#0a2a3a] flex flex-col fixed left-0 top-0 overflow-y-auto z-20">
        {/* Logo */}
        <div className="px-6 pt-8 pb-4">
          <p className="text-white text-[20px] font-normal leading-tight">IMPACT CENTER</p>
          <p className="text-[#0d9488] text-[14px] mt-1 leading-tight">Volunteer Task<br />Management</p>
          <div className="w-[40px] h-[2px] bg-[#0d9488] mt-3" />
        </div>

        {/* Nav */}
        <nav className="flex flex-col mt-4">
          <div className="flex items-center border-l-[3px] border-[#0d9488] px-6 py-3">
            <span className="text-[#0d9488] text-[16px] font-semibold">Dashboard</span>
          </div>
          {["Tasks", "Volunteers", "History"].map(item => (
            <div key={item} className="flex items-center px-6 py-3 cursor-pointer hover:bg-white/5"
              onClick={() => item === "History" ? navigate("/manager/history") : item === "Tasks" ? navigate("/manager/tasks") : undefined}>
              <span className="text-[#767676] text-[16px] font-semibold">{item}</span>
            </div>
          ))}
        </nav>

        {/* User info */}
        <div className="mt-auto px-4 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0d9488] flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-semibold">JB</span>
            </div>
            <div>
              <p className="text-[#b3b3b3] text-[16px] font-semibold leading-tight">Jason Bratina</p>
              <p className="text-[#757575] text-[14px] leading-tight">Operations Manager</p>
            </div>
          </div>
          <button onClick={() => navigate("/")} className="text-[#dc2626] text-[10px] mt-2 ml-[52px] hover:underline bg-transparent border-none cursor-pointer">
            Logout
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="ml-[240px] flex-1 flex flex-col min-h-screen">

        {/* Top bar */}
        <div className="bg-white border-b border-[#e5e7eb] h-[69px] flex items-center justify-between px-8 sticky top-0 z-10">
          <h1 className="text-[24px] font-semibold text-[#1e1e1e] tracking-tight">
            Good Morning, Operations Manager
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-[#6b7280] text-[14px]">{todayStr}</span>
            {isSessionActive ? (
              <span className="bg-[#dcfce7] text-[#16a34a] text-[12px] font-semibold px-3 py-1.5 rounded-full">
                ● Session Active
              </span>
            ) : (
              <span className="bg-[#f3f4f6] text-[#6b7280] text-[12px] font-semibold px-3 py-1.5 rounded-full">
                ○ No Session
              </span>
            )}
            <div className="flex items-center gap-2">
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: error ? "#ef4444" : synced ? "#34c759" : "#fcd34d" }} />
              <span className="text-[12px] text-[#6b7280]">{error ? "Offline" : synced ? "Live" : "Syncing…"}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-3 px-8 py-4">
          {isSessionActive ? (
            <button onClick={() => setShowEndConfirm(true)}
              className="border border-[#900b09] bg-[#fdd3d0] text-[#900b09] px-4 py-2 rounded-lg text-[14px] hover:opacity-90 cursor-pointer">
              End Session
            </button>
          ) : (
            <button onClick={() => { setModalType("open"); setShowModal(true); }}
              className="border border-[#16a34a] bg-[#dcfce7] text-[#16a34a] px-4 py-2 rounded-lg text-[14px] hover:opacity-90 cursor-pointer">
              ▶ Start Session
            </button>
          )}
          <button onClick={() => navigate("/manager/tasks")}
            className="bg-[#09665e] border border-[#09665e] text-[#f0fafa] px-4 py-2 rounded-lg text-[14px] flex items-center gap-2 hover:opacity-90 cursor-pointer">
            Create Task <Plus size={16} />
          </button>
          <button onClick={onResetTasks}
            className="border border-[#e5e7eb] bg-white text-[#6b7280] px-4 py-2 rounded-lg text-[14px] hover:opacity-90 cursor-pointer">
            ↺ Reset
          </button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-4 gap-3 px-8 pb-4">
          {[
            { label: "Active Tasks",      value: active.length,       color: "#0d9488" },
            { label: "In Progress",       value: inProgress.length,   color: "#bf6a02" },
            { label: "Completed Today",   value: completed.length,    color: "#0d9488" },
            { label: "Volunteers Active", value: volunteersActive,     color: "#1e1e1e" },
          ].map(m => (
            <div key={m.label} className="bg-white border border-[#e5e7ea] rounded-lg p-4 h-[84px] flex flex-col justify-center gap-1">
              <p className="text-[#6b7280] text-[14px] font-semibold">{m.label}</p>
              <p className="text-[24px] font-semibold tracking-tight" style={{ color: m.color }}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Rolled-over tasks */}
        {rolledOver.length > 0 && (
          <div className="mx-8 mb-4 bg-[#fff5f5] rounded-lg border border-[#fecaca] overflow-hidden">
            <div className="px-6 py-3 border-b border-[#fecaca]">
              <span className="text-[14px] font-semibold text-[#dc2626]">⚠️ Leftover from Previous Session ({rolledOver.length})</span>
            </div>
            {rolledOver.map((t, i) => (
              <div key={t.id} className={`px-6 py-3 flex items-center justify-between border-t border-[#fecaca] ${i === 0 ? "border-t-0" : ""}`}>
                <div>
                  <p className="text-[14px] font-semibold text-[#dc2626]">{t.name}</p>
                  <p className="text-[12px] text-[#9ca3af]">Rolled over from {t.rolledOverFrom} · {t.estimatedTime}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onCompleteTask(t.id, "Manager")}
                    className="text-[#16a34a] text-[14px] font-semibold hover:underline bg-transparent border-none cursor-pointer">
                    Mark Complete
                  </button>
                  <button onClick={() => onDeleteTask(t.id)}
                    className="text-[#900b09] text-[14px] hover:underline bg-transparent border-none cursor-pointer">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Task table */}
        <div className="mx-8 mb-8 bg-white rounded-lg border border-black overflow-hidden">
          {/* Table header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
            <h2 className="text-[24px] font-semibold text-[#1e1e1e] tracking-tight">Active Tasks</h2>
            <div className="flex items-center gap-3">
              {/* Search */}
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks…"
                className="border border-[#e5e7eb] rounded-lg px-3 py-1.5 text-[14px] text-[#1e1e1e] outline-none focus:border-[#0d9488]"
                style={{ width: 180 }} />
              {/* Tag filters */}
              <div className="flex gap-2">
                {TAG_FILTERS.map(tag => (
                  <button key={tag} onClick={() => setActiveTag(tag)}
                    className={`px-3 py-1.5 rounded-lg text-[14px] font-semibold cursor-pointer border-none ${
                      activeTag === tag ? "bg-[#09665e] text-[#f0fafa]" : "bg-[#f0fafa] text-[#09665e]"
                    }`}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Column headers */}
          <div className="grid px-6 py-3 bg-[#f5f5f5] text-[14px] font-semibold text-[#1e1e1e]"
            style={{ gridTemplateColumns: "1fr 1fr 100px 1fr 120px 200px" }}>
            <span>Tasks</span>
            <span>Locations</span>
            <span>Priority</span>
            <span>Assigned To</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          {filtered.length === 0 && (
            <div className="px-6 py-10 text-center text-[#9ca3af] text-[14px]">No tasks yet — create one above!</div>
          )}

          {filtered.map((t, i) => (
            <div key={t.id}
              className={`grid px-6 py-3 border-t border-[#e5e7ea] items-center text-[14px] ${i % 2 === 0 ? "bg-white" : "bg-[#fafafa]"}`}
              style={{ gridTemplateColumns: "1fr 1fr 100px 1fr 120px 200px" }}>
              <span className="text-[#0a2a3a] font-medium">{t.name || t.item}</span>
              <span className="text-[#6b7280]">{t.source || t.destination || "—"}</span>
              <span>
                {t.priority && (
                  <span className={`px-2 py-1 rounded-lg text-[12px] font-semibold ${
                    t.priority === "Urgent" || t.priority === "High" ? "bg-[#ec221f] text-[#fee9e7]" :
                    t.priority === "Normal" ? "bg-[#d9d9d9] text-[#1e1e1e]" :
                    "bg-[#d9d9d9] text-[#1e1e1e]"
                  }`}>{t.priority}</span>
                )}
              </span>
              <span className="text-[#1e1e1e]">
                {t.claimedByName || t.assignedName || "—"}
                {t.claimedByType === "new" && <span className="text-[#9ca3af] text-[12px] ml-1">(new)</span>}
              </span>
              <span><StatusBadge status={t.status} /></span>
              <span className="flex gap-3 items-center flex-wrap">
                {t.status !== "complete" && (
                  <button onClick={() => onCompleteTask(t.id, "Manager")}
                    className="text-[#303030] text-[14px] font-semibold hover:text-[#0d9488] bg-transparent border-none cursor-pointer">
                    Mark Complete
                  </button>
                )}
                {t.status === "in-progress" && (
                  <button onClick={() => onMarkIncomplete(t.id)}
                    className="text-[#bf6a02] text-[14px] hover:underline bg-transparent border-none cursor-pointer">
                    Incomplete
                  </button>
                )}
                {t.status !== "complete" && (
                  <button onClick={() => onDeleteTask(t.id)}
                    className="text-[#900b09] text-[14px] hover:underline bg-transparent border-none cursor-pointer">
                    Remove
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      </div>{/* end desktop layout */}

      {/* ── Start Session Modal ── */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "white", borderRadius: 16, overflow: "hidden", width: "100%", maxWidth: 380 }}>
            <div style={{ background: "#16A34A", padding: "18px 20px" }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.8)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Operations Manager</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "white", marginTop: 2 }}>Start Session</div>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ display: "flex", background: "#F3F4F6", borderRadius: 10, padding: 3, marginBottom: 20 }}>
                {["open", "timed"].map(t => (
                  <button key={t} onClick={() => setModalType(t)}
                    style={{ flex: 1, padding: "9px 0", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
                      background: modalType === t ? "white" : "transparent",
                      color: modalType === t ? GRAY.dark : GRAY.soft,
                      boxShadow: modalType === t ? "0 1px 4px rgba(0,0,0,0.12)" : "none" }}>
                    {t === "open" ? "Open Session" : "Timed Session"}
                  </button>
                ))}
              </div>
              {modalType === "timed" && (
                <div style={{ marginBottom: 16 }}>
                  {loadingSettings && <div style={{ fontSize: 12, color: GRAY.light, marginBottom: 8 }}>Loading saved times…</div>}
                  <div style={{ display: "flex", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: GRAY.soft, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Start Time</label>
                      <input type="time" value={startTimeStr} onChange={e => setStartTimeStr(e.target.value)}
                        style={{ width: "100%", padding: "9px 10px", border: `1.5px solid ${GRAY.border}`, borderRadius: 8, fontSize: 14, color: GRAY.dark, background: "white", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: GRAY.soft, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>End Time</label>
                      <input type="time" value={endTimeStr} onChange={e => setEndTimeStr(e.target.value)}
                        style={{ width: "100%", padding: "9px 10px", border: `1.5px solid ${GRAY.border}`, borderRadius: 8, fontSize: 14, color: GRAY.dark, background: "white", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: GRAY.light, marginTop: 6 }}>Times are saved as defaults for {new Date().toLocaleDateString("en-US", { weekday: "long" })}s</div>
                </div>
              )}
              <button onClick={handleStartSession}
                disabled={starting || (modalType === "timed" && (!startTimeStr || !endTimeStr))}
                style={{ width: "100%", padding: "13px 0", background: (starting || (modalType === "timed" && (!startTimeStr || !endTimeStr))) ? "#D1D5DB" : "#16A34A", color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 8 }}>
                {starting ? "Starting…" : "▶ Start Session"}
              </button>
              <button onClick={() => setShowModal(false)}
                style={{ width: "100%", padding: "10px 0", background: "none", color: GRAY.light, border: "none", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── End Session Confirmation ── */}
      {showEndConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "white", borderRadius: 16, padding: 24, width: "100%", maxWidth: 360 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: GRAY.dark, marginBottom: 10 }}>End Session Early?</div>
            <div style={{ fontSize: 14, color: GRAY.soft, lineHeight: 1.6, marginBottom: 20 }}>
              All in-progress and incomplete tasks will be marked incomplete and rolled over to the next session.
            </div>
            <button onClick={handleEndSession} disabled={ending}
              style={{ width: "100%", padding: "13px 0", background: ending ? "#D1D5DB" : "#EF4444", color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 8 }}>
              {ending ? "Ending…" : "Yes, End Session"}
            </button>
            <button onClick={() => setShowEndConfirm(false)}
              style={{ width: "100%", padding: "10px 0", background: "none", color: GRAY.light, border: "none", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

