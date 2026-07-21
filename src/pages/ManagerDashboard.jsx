// ManagerDashboard.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import DashboardHeader from "../components/DashboardHeader";
import StatCards from "../components/StatCards";
import LeftoverBanner from "../components/LeftoverBanner";
import TaskTable from "../components/TaskTable";
import VolunteerBreakdownCard from "../components/VolunteerBreakdownCard";
import { db } from "../firebase";
import { ref, get } from "firebase/database";
import { Plus, Menu, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

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

const getPriorityStyle = (priority) => {
  const p = priority?.toLowerCase();
  if (p === 'urgent') return 'bg-[#fff0f0] text-[#dc2626]';
  if (p === 'high') return 'bg-[#fff3e0] text-[#ff9500]';
  return 'bg-[#f0f0f0] text-[#6b7280]';
};

const getStatusStyle = (status) => {
  if (status === 'in-progress') return 'bg-[#fff3e0] text-[#ff9500]';
  if (status === 'complete') return 'bg-[#f0fff4] text-[#34c759]';
  if (status === 'incomplete') return 'bg-[#fff0f0] text-[#dc2626]';
  return 'bg-[#e6e6e6] text-[#6b7280]';
};

const getStatusLabel = (status) => {
  if (status === 'in-progress') return 'In Progress';
  if (status === 'complete') return 'Complete';
  if (status === 'incomplete') return 'Incomplete';
  return 'Available';
};

function StatusBadge({ status }) {
  return (
    <span className={`text-[12px] font-medium px-3 py-1 rounded-lg ${getStatusStyle(status)}`}>
      {getStatusLabel(status)}
    </span>
  );
}

const GRAY = { dark: "#1F2937", soft: "#6B7280", light: "#9CA3AF", border: "#E5E7EB" };

export default function ManagerDashboard({ tasks, completedTasks = [], onDeleteTask, onMarkIncomplete, onResetTasks, onCompleteTask, synced, error, session, onStartSession, onEndSession }) {
  const navigate = useNavigate();
  const { activePantryId, role, displayName, initials, logout, switchPantry } = useAuth();
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

  // Mobile nav menu
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = () => setMobileMenuOpen(false);
    if (mobileMenuOpen) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => document.removeEventListener("click", handleClickOutside);
  }, [mobileMenuOpen]);

  // Load saved session settings when modal opens
  useEffect(() => {
    if (!showModal) return;
    const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
    const now = new Date();
    const nowStr = now.toTimeString().slice(0, 5);
    setStartTimeStr(nowStr);
    setEndTimeStr("");
    setLoadingSettings(true);
    get(ref(db, `pantries/${activePantryId}/sessionSettings/${dayOfWeek}`)).then(snap => {
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
  const incomplete = tasks.filter(t => t.status === "incomplete");
  // Completed count comes from completedTasks (tasks are removed from the tasks node on completion)
  const todayIso = new Date().toISOString().slice(0, 10);
  const completed = completedTasks.filter(t =>
    t.completedAtMs && new Date(t.completedAtMs).toISOString().slice(0, 10) === todayIso
  );
  const rolledOver = tasks.filter(t => t.rolledOver === true);
  const volunteersActive = [...new Set(tasks.filter(t => t.assignedTo).map(t => t.assignedTo))].length;

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

  const statusOrder = { incomplete: 0, 'in-progress': 1, available: 2, complete: 3 };
  filtered = [...filtered].sort((a, b) => (statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2));

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
              <span className="text-white text-sm font-semibold">{initials}</span>
            </div>
            <div>
              <p className="text-[#b3b3b3] text-[16px] font-semibold leading-tight">{displayName}</p>
              <p className="text-[#757575] text-[14px] leading-tight">Operations Manager</p>
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setMobileMenuOpen(!mobileMenuOpen); }}
            className="text-white p-1"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile nav overlay */}
        {mobileMenuOpen && (
          <>
            {/* Dim background — 40% black */}
            <div
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Slide-down menu panel */}
            <div
              className="fixed top-0 left-0 right-0 z-50 bg-[#0a2a3a]"
              style={{ animation: "slideDown 0.25s ease-out forwards" }}
            >
              {/* Top bar */}
              <div className="px-8 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0d9488] flex items-center justify-center shrink-0">
                    <span className="text-white text-sm font-semibold">{initials}</span>
                  </div>
                  <div>
                    <p className="text-[#b3b3b3] text-[16px] font-semibold leading-tight">{displayName}</p>
                    <p className="text-[#757575] text-[14px] leading-tight">Operations Manager</p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setMobileMenuOpen(false); }}
                  className="text-white p-1"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Teal divider */}
              <div className="w-10 h-0.5 bg-[#0d9488] mx-8 mb-2" />

              {/* Mode toggle — hidden for Amber and superadmin */}
              {role !== 'superadmin' && activePantryId !== 'amber' && (
                <div className="flex mx-4 mb-4 bg-[#0d2233] rounded-lg p-0.5">
                  <button className="flex-1 py-1.5 rounded-md text-[12px] font-medium bg-[#09665e] text-white">
                    Pantry
                  </button>
                  <button onClick={() => { setMobileMenuOpen(false); navigate('/manager-delivery'); }}
                    className="flex-1 py-1.5 rounded-md text-[12px] font-medium text-[#6b7280] hover:text-[#b3b3b3]">
                    Delivery
                  </button>
                </div>
              )}

              {/* Nav items */}
              <nav className="flex flex-col py-2">
                {(role === 'superadmin' ? [
                  { label: "Overview",    active: false,                      action: () => navigate("/steve-overview") },
                  { label: "Food Pantry", active: activePantryId === "jason", action: () => { switchPantry("jason"); navigate("/manager-tasks"); } },
                  { label: "Clothing",    active: activePantryId === "amber", action: () => { switchPantry("amber"); navigate("/manager-tasks"); } },
                  { label: "Volunteers",  active: false,                      action: () => navigate("/manager-volunteers") },
                ] : [
                  { label: "Dashboard", active: true,  action: () => {} },
                  { label: "Tasks",     active: false, action: () => navigate("/manager-tasks") },
                  { label: "Volunteers",active: false, action: () => navigate("/manager-volunteers") },
                  { label: "History",   active: false, action: () => navigate("/manager-history") },
                ]).map(item => (
                  <button
                    key={item.label}
                    onClick={() => { item.action(); setMobileMenuOpen(false); }}
                    className={`w-full text-left px-8 py-4 text-[16px] font-semibold bg-transparent border-none cursor-pointer ${
                      item.active
                        ? "text-[#0d9488] border-l-[3px] border-[#0d9488]"
                        : "text-[#757575] border-l-[3px] border-transparent"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}

                {/* Divider */}
                <div className="mx-8 my-3 h-px bg-[#1e3a4a]" />

                {/* Logout */}
                <button
                  onClick={() => { setMobileMenuOpen(false); logout(); }}
                  className="w-full text-left px-8 py-4 text-[16px] font-semibold text-[#dc2626] border-l-[3px] border-transparent bg-transparent border-none cursor-pointer"
                >
                  Logout
                </button>
              </nav>
            </div>
          </>
        )}

        {/* Pantry/Delivery toggle — superadmin Food Pantry only */}
        {role === 'superadmin' && activePantryId === 'jason' && (
          <div className="lg:hidden flex mx-4 mt-3 bg-[#0d2233] rounded-lg p-0.5">
            <button className="flex-1 py-1.5 rounded-md text-[12px] font-medium bg-[#09665e] text-white border-none cursor-pointer">
              Pantry
            </button>
            <button onClick={() => navigate('/manager-delivery')}
              className="flex-1 py-1.5 rounded-md text-[12px] font-medium text-[#6b7280] hover:text-[#b3b3b3] bg-transparent border-none cursor-pointer">
              Delivery
            </button>
          </div>
        )}

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
            <button onClick={() => navigate("/manager-tasks")}
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
                  {/* Row 1: name + steve badge + status */}
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[#0a2a3a] text-[15px] font-medium flex-1">
                      {task.name || task.item}
                      {task.modifiedBy === 'steve' && (
                        <span className="ml-1.5 bg-[#0d9488] text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full align-middle">Steve</span>
                      )}
                    </p>
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

      <Sidebar mode="pantry" activePath="/manager/dashboard" />

      {/* ── Main content ── */}
      <div className="lg:ml-[var(--sidebar-w)] flex-1 flex flex-col min-h-screen">

        {/* Pill header */}
        <div className="px-6 pt-5 pb-3">
          <DashboardHeader
            initials={initials}
            isSessionActive={isSessionActive}
            onStartSessionClick={() => { setModalType("open"); setShowModal(true); }}
            onEndSessionClick={() => setShowEndConfirm(true)}
            onCreateTaskClick={() => navigate("/manager/create-task")}
          />
        </div>

        {/* Stat Cards */}
        <div className="px-6 pb-4">
          <StatCards tasks={tasks} completedTasks={completedTasks}/>
        </div>

        {/* Middle row: Leftover banner (left) + Volunteer Breakdown Card (right) */}
        <div className="px-6 pb-4 flex gap-4 items-start">
          {rolledOver.length > 0 && (
            <div className="flex-1 min-w-0">
              <LeftoverBanner
                tasks={rolledOver}
                onComplete={(id) => onCompleteTask(id, "Manager")}
                onRemove={onDeleteTask}
              />
            </div>
          )}
          <div style={{ width: 340, flexShrink: 0 }}>
            <VolunteerBreakdownCard tasks={tasks}/>
          </div>
        </div>

        {/* Active Tasks table — explicitly excludes rolledOver tasks */}
        <div className="px-6 pb-8">
          <TaskTable
            tasks={tasks.filter(t => !t.rolledOver && t.status !== "complete")}
            onComplete={(id) => onCompleteTask(id, "Manager")}
            onMarkIncomplete={onMarkIncomplete}
            onRemove={onDeleteTask}
          />
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

