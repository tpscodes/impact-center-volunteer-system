// ManagerDashboard.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import MobileNav from "../components/MobileNav";
import DashboardHeader from "../components/DashboardHeader";
import HeroSummary from "../components/HeroSummary";
import LeftoverBanner from "../components/LeftoverBanner";
import TaskTable from "../components/TaskTable";
import VolunteerListItem from "../components/VolunteerListItem";
import { db } from "../firebase";
import { ref, get, onValue, off } from "firebase/database";
import { Plus, ClipboardList } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

function fmtTime(ms) {
  if (!ms) return "";
  return new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function timeStrToMs(str) {
  if (!str) return null;
  const ampm = str.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (ampm) {
    let h = parseInt(ampm[1]);
    const m = parseInt(ampm[2]);
    const p = ampm[3].toLowerCase();
    if (p === "pm" && h !== 12) h += 12;
    if (p === "am" && h === 12) h = 0;
    const d = new Date(); d.setHours(h, m, 0, 0); return d.getTime();
  }
  const [h, m] = str.split(":").map(Number);
  const d = new Date(); d.setHours(h, m, 0, 0); return d.getTime();
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

  // Volunteer list for the Active Volunteers card
  const [volunteers, setVolunteers] = useState([]);

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


  // Load volunteers from Firebase
  useEffect(() => {
    const volRef = ref(db, "volunteers");
    const handle = onValue(volRef, snap => {
      const val = snap.val();
      if (!val) { setVolunteers([]); return; }
      setVolunteers(Object.entries(val).map(([id, v]) => ({ id, ...v })));
    });
    return () => off(volRef, "value", handle);
  }, []);

  // Load saved session settings when modal opens
  useEffect(() => {
    if (!showModal) return;
    const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
    setStartTimeStr("");
    setEndTimeStr("");
    setLoadingSettings(true);
    get(ref(db, `pantries/${activePantryId}/sessionSettings/${dayOfWeek}`)).then(snap => {
      const s = snap.val();
      if (s) {
        setStartTimeStr(s.defaultStartTime || "");
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
  const unclaimed = tasks.filter(t => !t.assignedTo && t.status !== "complete").length;
  const urgent = tasks.filter(t => t.priority?.toLowerCase() === "urgent" && t.status !== "complete").length;
  const experiencedVols = volunteers.filter(v => v.type === "experienced" || v.role === "experienced").length;
  const newVols = volunteers.filter(v => v.type === "new" || v.role === "new").length;
  // Active volunteers = those with an assigned task right now
  const activeVolIds = new Set(tasks.filter(t => t.assignedTo).map(t => t.assignedTo));
  const activeVolList = volunteers.filter(v => activeVolIds.has(v.id) || activeVolIds.has(v.name)).slice(0, 4);

  const TAG_FILTERS = ["All", "Warehouse", "Kitchen"];

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
      <div className="lg:hidden min-h-screen bg-[#D3EDE9]">

        {/* Gradient hero */}
        <div style={{
          background: 'linear-gradient(136deg, #0f7a70 14%, #0a2a3a 86%)',
          borderRadius: '0 0 28px 28px',
          color: '#fff',
        }}>
          <MobileNav mode="pantry" />
          <div style={{ padding: '12px 20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Pill + volunteers active */}
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold px-3.5 py-1.5 rounded-full"
              style={{ background: 'rgba(255,255,255,.9)', color: '#09665E' }}>
              Active Tasks
            </span>
            <span className="text-[14px]" style={{ color: 'rgba(255,255,255,.72)' }}>
              {volunteersActive} volunteers active
            </span>
          </div>

          {/* Big number + signal bars */}
          <div className="flex items-end justify-between">
            <div>
              <p className="m-0 text-[64px] leading-[64px]" style={{ fontWeight: 800 }}>{active.length}</p>
              <p className="m-0 mt-0.5 text-[14px]" style={{ color: 'rgba(255,255,255,.72)' }}>Tasks</p>
            </div>
            <div className="flex items-end gap-[3px]" style={{ height: 32 }}>
              {[10, 16, 22, 32].map((h, i) => (
                <span key={i} style={{ width: 6, height: h, borderRadius: 2, background: '#0D9488', display: 'block' }} />
              ))}
            </div>
          </div>

          {/* Divider + stats */}
          <div style={{ height: 1, background: 'rgba(255,255,255,.18)' }} />
          <div className="flex gap-4">
            <div>
              <p className="m-0 text-[26px] font-bold leading-[26px]">{tasks.length}</p>
              <p className="m-0 mt-1 text-[12.5px]" style={{ color: 'rgba(255,255,255,.72)' }}>Tasks</p>
            </div>
            <div style={{ borderLeft: '1px solid rgba(255,255,255,.18)', paddingLeft: 16 }}>
              <p className="m-0 text-[26px] font-bold leading-[26px]">{unclaimed}</p>
              <p className="m-0 mt-1 text-[12.5px]" style={{ color: 'rgba(255,255,255,.72)' }}>Unclaimed</p>
            </div>
          </div>
          </div>{/* /stats inner */}
        </div>

        {/* Action buttons */}
        <div className="flex gap-[9px] px-5 pt-[15px]">
          <button
            onClick={isSessionActive
              ? () => setShowEndConfirm(true)
              : () => { setModalType("open"); setShowModal(true); }}
            className="flex-1 h-12 rounded-full text-[14px] font-semibold border-none cursor-pointer"
            style={{ background: 'transparent', border: '1.5px solid #0D9488', color: '#0D9488' }}>
            {isSessionActive ? 'End Session' : 'Start Session'}
          </button>
          <button onClick={() => navigate('/manager-tasks')}
            className="flex-1 h-12 rounded-full text-[14px] font-semibold text-white border-none cursor-pointer"
            style={{ background: '#0F7A70' }}>
            + Create Task
          </button>
        </div>

        {/* Active Tasks card */}
        <div className="mt-[15px] mb-6 bg-white border border-[#E5E7EB] rounded-[20px] p-6 flex flex-col gap-5"
          style={{ boxShadow: '0 8px 20px rgba(10,42,58,.05)' }}>
          <div className="flex items-center justify-between">
            <h2 className="m-0 text-[21px] font-semibold text-[#0A2A3A]">Active Tasks</h2>
            <span className="text-[12px] font-medium text-[#565E6C] cursor-pointer" onClick={() => navigate('/manager-tasks')}>View all</span>
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-2">
            {TAG_FILTERS.map(tag => (
              <button key={tag} onClick={() => setActiveTag(tag)}
                className="h-9 px-4 rounded-full text-[13px] cursor-pointer border-none"
                style={activeTag === tag
                  ? { background: '#0A2A3A', color: '#fff', fontWeight: 600 }
                  : { background: '#fff', border: '1px solid #E5E7EB', color: '#6B7280', fontWeight: 500 }}>
                {tag}
              </button>
            ))}
          </div>

          {/* Task rows */}
          <div className="flex flex-col">
            {filtered.filter(t => t.status !== 'complete').length === 0 && (
              <p className="m-0 text-center text-[#9ca3af] text-[14px] py-6">No active tasks</p>
            )}
            {filtered.filter(t => t.status !== 'complete').map((task, i) => {
              const sp = task.status === 'in-progress'
                ? { bg: '#FFF3E0', fg: '#9A5000', label: 'In Progress' }
                : task.status === 'incomplete'
                ? { bg: '#FFF0F0', fg: '#DC2626', label: 'Incomplete' }
                : { bg: '#F3F4F6', fg: '#6B7280', label: 'Available' };
              return (
                <div key={task.id}
                  className="flex items-center gap-4 py-3.5 pl-3.5 pr-5 rounded-[15px]"
                  style={i % 2 === 0 ? { background: '#D3EDE9' } : {}}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: '#0F7A70' }}>
                    <ClipboardList size={18} color="#fff" />
                  </div>
                  <p className="flex-1 min-w-0 m-0 text-[12px] font-medium text-[#0A2A3A] truncate">
                    {task.name || task.item}
                  </p>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[12px] font-semibold px-3 py-0.5 rounded-full"
                      style={{ background: sp.bg, color: sp.fg }}>
                      {sp.label}
                    </span>
                    <span className="text-[12px] text-[#0A2A3A]">
                      {task.destination || task.source || '—'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TABLET LAYOUT (lg–xl: 1024–1280 px)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex xl:hidden min-h-screen bg-[#D3EDE9]">

        <Sidebar mode="pantry" activePath="/manager/dashboard" />

        <div className="lg:ml-[var(--sidebar-w)] flex-1 flex flex-col min-h-screen">

          {/* Pill header — session + create-task buttons */}
          <div className="px-6 pt-5 pb-3">
            <DashboardHeader
              initials={initials}
              isSessionActive={isSessionActive}
              onStartSession={() => { setModalType("open"); setShowModal(true); }}
              onEndSession={() => setShowEndConfirm(true)}
              onCreateTask={() => navigate("/manager-tasks")}
            />
          </div>

          {/* Big-number hero */}
          <div className="px-6 pb-5">
            <HeroSummary
              activeTasks={active.length}
              inProgress={inProgress.length}
              completed={completed.length}
              unclaimed={unclaimed}
              urgent={urgent}
              volunteersActive={volunteersActive}
              experiencedVols={experiencedVols}
              newVols={newVols}
              isSessionActive={isSessionActive}
              onCreateTask={() => navigate("/manager-tasks")}
              onStartSession={() => { setModalType("open"); setShowModal(true); }}
              onEndSession={() => setShowEndConfirm(true)}
            />
          </div>

          {/* Two-card row */}
          <div className="px-6 pb-8 flex gap-6 items-start">

            {/* Active Tasks card */}
            <div className="flex-1 min-w-0 bg-white border border-[#e5e7eb] rounded-[20px] p-6 flex flex-col gap-5"
                 style={{ boxShadow: "0 8px 20px rgba(10,42,58,.05)" }}>
              <div className="flex items-center justify-between">
                <h3 className="m-0 text-[21px] font-semibold text-[#0a2a3a] leading-7">Active Tasks</h3>
                <button onClick={() => navigate("/manager-tasks")}
                  className="text-[12px] font-medium text-[#565e6c] bg-transparent border-none cursor-pointer">
                  View all
                </button>
              </div>

              {/* Filter chips */}
              <div className="flex flex-wrap gap-2">
                {TAG_FILTERS.map(f => (
                  <button key={f} type="button" onClick={() => setActiveTag(f)}
                    className={`h-9 px-4 rounded-full border text-[13px] font-medium cursor-pointer transition-colors
                      ${activeTag === f
                        ? 'bg-[#0a2a3a] text-white border-[#0a2a3a] font-semibold'
                        : 'bg-white text-[#6b7280] border-[#e5e7eb] hover:bg-[#f9fafb]'
                      }`}>
                    {f}
                  </button>
                ))}
              </div>

              {/* Task rows */}
              <div className="flex flex-col">
                {filtered.filter(t => t.status !== "complete").slice(0, 6).map((task, i) => (
                  <div key={task.id}
                    className={`flex items-center gap-4 px-3 py-3.5 rounded-[15px] ${i % 2 === 0 ? 'bg-[#D3EDE9]' : ''}`}>
                    <div className="w-10 h-10 rounded-lg bg-[#0f7a70] flex items-center justify-center shrink-0 text-white">
                      <ClipboardList size={18} />
                    </div>
                    <p className="flex-1 min-w-0 text-[12px] font-medium leading-5 text-[#0a2a3a] m-0">
                      {task.name || task.item}
                    </p>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-[12px] font-semibold ${getStatusStyle(task.status)}`}>
                        {getStatusLabel(task.status)}
                      </span>
                      {task.destination && (
                        <span className="text-[12px] text-[#0a2a3a]">{task.destination}</span>
                      )}
                    </div>
                  </div>
                ))}
                {filtered.filter(t => t.status !== "complete").length === 0 && (
                  <p className="text-center text-[13px] text-[#9ca3af] py-8 m-0">No active tasks</p>
                )}
              </div>
            </div>

            {/* Active Volunteers card */}
            <div className="bg-white border border-[#e5e7eb] rounded-[20px] p-6 flex flex-col gap-5"
                 style={{ width: 320, flexShrink: 0, boxShadow: "0 8px 20px rgba(10,42,58,.05)" }}>
              <div className="flex items-center justify-between">
                <h3 className="m-0 text-[21px] font-semibold text-[#0a2a3a] leading-7">Active Volunteers</h3>
                <button onClick={() => navigate("/manager-volunteers")}
                  className="text-[12px] font-medium text-[#565e6c] bg-transparent border-none cursor-pointer">
                  View all
                </button>
              </div>
              <div className="flex flex-col">
                {volunteers.slice(0, 6).map((v, i) => (
                  <VolunteerListItem key={v.id} volunteer={v} tint={i % 2 === 0} index={i} />
                ))}
                {volunteers.length === 0 && (
                  <p className="text-center text-[13px] text-[#9ca3af] py-8 m-0">No volunteers yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          DESKTOP LAYOUT — screens xl (1280px) and up
      ══════════════════════════════════════════ */}
      <div className="hidden xl:flex min-h-screen bg-[#D3EDE9]">

      <Sidebar mode="pantry" activePath="/manager/dashboard" />

      {/* ── Main content ── */}
      <div className="xl:ml-[var(--sidebar-w)] flex-1 flex flex-col min-h-screen">

        {/* Pill header */}
        <div className="px-6 pt-5 pb-3">
          <DashboardHeader initials={initials} />
        </div>

        {/* Hero summary */}
        <div className="px-6 pb-4">
          <HeroSummary
            activeTasks={active.length}
            inProgress={inProgress.length}
            completed={completed.length}
            unclaimed={unclaimed}
            urgent={urgent}
            volunteersActive={volunteersActive}
            experiencedVols={experiencedVols}
            newVols={newVols}
            isSessionActive={isSessionActive}
            onCreateTask={() => navigate("/manager-tasks")}
            onStartSession={() => { setModalType("open"); setShowModal(true); }}
            onEndSession={() => setShowEndConfirm(true)}
          />
        </div>

        {/* Leftover banner — only when there are rolled-over tasks */}
        {rolledOver.length > 0 && (
          <div className="px-6 pb-4">
            <LeftoverBanner
              tasks={rolledOver}
              onComplete={(id) => onCompleteTask(id, "Manager")}
              onRemove={onDeleteTask}
            />
          </div>
        )}

        {/* Cards row: Task Planning table + Active Volunteers card */}
        <div className="px-6 pb-8 flex gap-6 items-start">
          {/* Task Planning table */}
          <div className="flex-1 min-w-0">
            <TaskTable
              mode="planning"
              tasks={tasks.filter(t => !t.rolledOver && t.status !== "complete")}
              onComplete={(id) => onCompleteTask(id, "Manager")}
              onMarkIncomplete={onMarkIncomplete}
              onRemove={onDeleteTask}
            />
          </div>

          {/* Active Volunteers card */}
          <div style={{ width: 382, flexShrink: 0 }}>
            <div style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 20,
              boxShadow: "0 8px 20px rgba(10,42,58,.05)",
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}>
              {/* Card header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h2 style={{ margin: 0, font: "600 21px/26px 'Inter', sans-serif", color: "#0a2a3a" }}>
                  Active Volunteers
                </h2>
                <span
                  onClick={() => navigate("/manager-volunteers")}
                  style={{ font: "500 12px/20px 'Inter', sans-serif", color: "#565e6c", cursor: "pointer" }}
                >
                  View all
                </span>
              </div>

              {/* Volunteer rows */}
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {activeVolList.length === 0 ? (
                  <p style={{ font: "400 13px/20px 'Inter', sans-serif", color: "#9ca3af", textAlign: "center", padding: "16px 0" }}>
                    No volunteers active
                  </p>
                ) : (
                  activeVolList.map((v, i) => (
                    <VolunteerListItem
                      key={v.id}
                      volunteer={v}
                      tint={i % 2 === 0}
                      index={i}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      </div>{/* end desktop layout */}

      {/* ── Start Session Modal ── */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(10,42,58,.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: "white", borderRadius: 20, padding: 28, width: "100%", maxWidth: 480, boxShadow: "0 24px 60px rgba(10,42,58,.28)", fontFamily: "inherit" }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: "#0a2a3a", lineHeight: "26px" }}>Start Session</div>
              <button
                onClick={() => setShowModal(false)}
                aria-label="Close"
                style={{ border: 0, background: "none", cursor: "pointer", color: "#6b7280", display: "grid", placeItems: "center", width: 28, height: 28, borderRadius: 8, padding: 0, transition: "background 120ms cubic-bezier(0.16,1,0.3,1)" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f5f5f5"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Segmented toggle — Segmented Option / Teal */}
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              {[{ value: "open", label: "Open Session" }, { value: "timed", label: "Timed Session" }].map(opt => {
                const active = modalType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setModalType(opt.value)}
                    style={{
                      flex: 1, height: 44, borderRadius: 10, cursor: "pointer",
                      border: `1px solid ${active ? "#0d9488" : "#e5e7eb"}`,
                      background: active ? "#0d9488" : "white",
                      color: active ? "white" : "#6b7280",
                      fontSize: 14, fontWeight: active ? 600 : 500,
                      fontFamily: "inherit",
                      transition: "background 120ms cubic-bezier(0.16,1,0.3,1), color 120ms cubic-bezier(0.16,1,0.3,1), border-color 120ms cubic-bezier(0.16,1,0.3,1)",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Timed fields */}
            {modalType === "timed" && (
              <>
                {loadingSettings && (
                  <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>Loading saved times…</div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 8 }}>
                  {[
                    { label: "Start Time", value: startTimeStr, onChange: e => setStartTimeStr(e.target.value) },
                    { label: "End Time",   value: endTimeStr,   onChange: e => setEndTimeStr(e.target.value)   },
                  ].map(field => (
                    <div key={field.label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".04em", color: "#6b7280", textTransform: "uppercase" }}>
                        {field.label}
                      </label>
                      <div style={{ position: "relative" }}>
                        <input
                          type="text"
                          placeholder="--:-- --"
                          value={field.value}
                          onChange={field.onChange}
                          style={{
                            width: "100%", height: 44, padding: "0 36px 0 14px",
                            border: "1px solid #e5e7eb", borderRadius: 10,
                            fontSize: 14, color: "#0a2a3a", background: "white",
                            fontFamily: "inherit", outline: "none", boxSizing: "border-box",
                            transition: "border-color 120ms cubic-bezier(0.16,1,0.3,1)",
                          }}
                          onFocus={e => e.target.style.borderColor = "#09665e"}
                          onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                        />
                        <svg
                          width="16" height="16" viewBox="0 0 24 24" fill="none"
                          stroke="#6b7280" strokeWidth="1.8"
                          style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                        >
                          <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
                <p style={{ margin: "0 0 20px", fontSize: 13, color: "#6b7280" }}>
                  Times are saved as defaults for {new Date().toLocaleDateString("en-US", { weekday: "long" })}s
                </p>
              </>
            )}

            {/* Footer */}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{
                  flex: "0 0 120px", height: 48, borderRadius: 9999,
                  border: "1px solid #e5e7eb", background: "white", color: "#0a2a3a",
                  fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  transition: "background 120ms cubic-bezier(0.16,1,0.3,1)",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#f5f5f5"}
                onMouseLeave={e => e.currentTarget.style.background = "white"}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartSession}
                disabled={starting || (modalType === "timed" && !endTimeStr)}
                style={{
                  flex: 1, height: 48, borderRadius: 9999, border: 0,
                  background: (starting || (modalType === "timed" && !endTimeStr)) ? "#e5e7eb" : "#09665e",
                  color: (starting || (modalType === "timed" && !endTimeStr)) ? "#6b7280" : "white",
                  fontSize: 14, fontWeight: 600, cursor: (starting || (modalType === "timed" && !endTimeStr)) ? "not-allowed" : "pointer",
                  fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "background 120ms cubic-bezier(0.16,1,0.3,1)",
                  pointerEvents: (starting || (modalType === "timed" && !endTimeStr)) ? "none" : undefined,
                }}
                onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = "#0f7a70"; }}
                onMouseLeave={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = "#09665e"; }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                  <path d="M2.5 1.5v9l7-4.5z"/>
                </svg>
                {starting ? "Starting…" : "Start Session"}
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

