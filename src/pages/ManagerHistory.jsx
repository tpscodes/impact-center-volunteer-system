// ManagerHistory.jsx — Pantry task history
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import PageHeader from "../components/PageHeader";
import { Search, Clock, MapPin, X, ClipboardList } from "lucide-react";
import MobileNav from "../components/MobileNav";
import HistoryTable from "../components/HistoryTable";
import DashboardHero, { computeSparkline } from "../components/DashboardHero";
import { useSharedTasks } from "../hooks/useSharedTasks";
import { useAuth } from "../contexts/AuthContext";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((day + 6) % 7));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { start: mon.toISOString().slice(0, 10), end: sun.toISOString().slice(0, 10) };
}

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { start, end };
}

function msToDateStr(ms) {
  if (!ms) return null;
  return new Date(ms).toISOString().slice(0, 10);
}


// Resolve who completed a task — falls back through legacy field names
// so old Firebase entries (written before completedBy was standardised) still display correctly.
function resolveCompletedBy(entry) {
  return entry.completedBy || entry.claimedByName || entry.assignedName || entry.assignedTo || "";
}

function formatDate(timestamp) {
  if (!timestamp) return "—";
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  }) + " " + date.toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

const DATE_FILTER_OPTIONS = ["Today", "This Week", "This Month", "All Time"];

// ── Main component ────────────────────────────────────────────────────────────
export default function ManagerHistory() {
  const navigate = useNavigate();
  const { activePantryId, role, displayName, initials, logout } = useAuth();
  const { completedTasks } = useSharedTasks(activePantryId);

  const [searchQuery,    setSearchQuery]    = useState("");
  const [dateFilter,     setDateFilter]     = useState("Today");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // ── Sorting + filtering ────────────────────────────────────────────────────
  const sorted = [...completedTasks].sort((a, b) => (b.completedAtMs || 0) - (a.completedAtMs || 0));

  const dateFiltered = sorted.filter(t => {
    const now = new Date();
    const ts = t.completedAtMs || (typeof t.completedAt === "number" ? t.completedAt : 0);
    if (!ts) return dateFilter === "All Time";
    const completedDate = new Date(ts);
    if (dateFilter === "Today") return completedDate.toDateString() === now.toDateString();
    if (dateFilter === "This Week") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      return completedDate >= startOfWeek;
    }
    if (dateFilter === "This Month") {
      return completedDate.getMonth() === now.getMonth() &&
             completedDate.getFullYear() === now.getFullYear();
    }
    return true; // All Time
  });

  const filtered = dateFiltered.filter(t => {
    const q = searchQuery.toLowerCase();
    return !q ||
      t.name?.toLowerCase().includes(q) ||
      resolveCompletedBy(t).toLowerCase().includes(q) ||
      t.source?.toLowerCase().includes(q) ||
      t.destination?.toLowerCase().includes(q);
  });

  // ── Stats ─────────────────────────────────────────────────────────────────
  const todayCount       = sorted.filter(t => {
    const ts = t.completedAtMs || (typeof t.completedAt === "number" ? t.completedAt : 0);
    return ts && new Date(ts).toDateString() === new Date().toDateString();
  }).length;
  const uniqueSessions   = new Set(sorted.map(t => t.sessionDate || "").filter(Boolean)).size;
  const uniqueVolunteers = new Set(
    sorted.map(t => resolveCompletedBy(t)).filter(v => v && v !== "Manager")
  ).size;


  const STATS = [
    { label: "Tasks Completed Today",   value: todayCount,       chip: "Today",      chipBg: "#F0FFF4", chipFg: "#15703C", valueFg: "#15703C" },
    { label: "Total Sessions",          value: uniqueSessions,   chip: "Sessions",   chipBg: "#E6F5F3", chipFg: "#09665E", valueFg: "#09665E" },
    { label: "Volunteers Participated", value: uniqueVolunteers, chip: "Volunteers", chipBg: "#FFF3E0", chipFg: "#9A5000", valueFg: "#9A5000" },
  ];

  const MOBILE_NAV = [
    { label: "Dashboard",  path: "/manager/dashboard",  active: false },
    { label: "Tasks",      path: "/manager-tasks",       active: false },
    { label: "Volunteers", path: "/manager-volunteers",  active: false },
    { label: "History",    path: "/manager-history",     active: true  },
  ];

  return (
    <>
      {/* ══════════════════════════════════════════
          MOBILE LAYOUT — screens under lg (1024px)
      ══════════════════════════════════════════ */}
      <div className="lg:hidden min-h-screen bg-[#D3EDE9] flex flex-col"
        style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

        {/* Gradient hero */}
        <div style={{
          background: 'linear-gradient(143deg, #0f7a70 14%, #0a2a3a 86%)',
          borderRadius: '0 0 28px 28px',
          color: '#fff',
        }}>
          <MobileNav mode="pantry" />
          <div style={{ padding: '12px 20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Dual stats */}
            <div className="flex gap-8">
              <div className="flex flex-col gap-2.5">
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full w-fit"
                  style={{ background: '#E6F5F3', color: '#09665E' }}>Task</span>
                <p className="m-0 text-[44px] leading-[44px]" style={{ fontWeight: 600 }}>{completedTasks.length}</p>
                <p className="m-0 text-[12px]" style={{ color: '#D1D5DB' }}>Total task completed</p>
              </div>
              <div className="flex flex-col gap-2.5">
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full w-fit"
                  style={{ background: '#E6F5F3', color: '#09665E' }}>Sessions</span>
                <p className="m-0 text-[44px] leading-[44px]" style={{ fontWeight: 600 }}>{uniqueSessions}</p>
                <p className="m-0 text-[12px]" style={{ color: '#D1D5DB' }}>Total Sessions</p>
              </div>
            </div>
          </div>
        </div>

        {/* History card */}
        <div className="mt-[15px] bg-white rounded-t-[20px] p-6 flex flex-col gap-4 flex-1">
          <div className="flex items-center justify-between">
            <h2 className="m-0 text-[21px] font-semibold text-[#0A2A3A]">History</h2>
            <div style={{ position: 'relative' }}>
              <button
                className="flex items-center justify-between gap-2 border border-[#E5E7EB] rounded-[10px] px-3.5 bg-white cursor-pointer"
                style={{ height: 40, width: 120 }}
                onClick={() => setMobileFilterOpen(o => !o)}
              >
                <span className="text-[14px] text-[#0A2A3A]">{dateFilter}</span>
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M1 1l4 4 4-4"/>
                </svg>
              </button>
              {mobileFilterOpen && (
                <div style={{
                  position: 'absolute', top: 46, right: 0, zIndex: 50,
                  background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12,
                  boxShadow: '0 8px 24px rgba(10,42,58,.12)', overflow: 'hidden', minWidth: 140,
                }}>
                  {DATE_FILTER_OPTIONS.map(opt => (
                    <button key={opt}
                      onClick={() => { setDateFilter(opt); setMobileFilterOpen(false); }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '11px 16px', border: 'none', cursor: 'pointer',
                        fontSize: 14, fontFamily: 'inherit',
                        background: dateFilter === opt ? '#E6F5F3' : '#fff',
                        color: dateFilter === opt ? '#09665E' : '#0A2A3A',
                        fontWeight: dateFilter === opt ? 600 : 400,
                      }}
                    >{opt}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Task rows */}
          <div className="flex flex-col">
            {filtered.length === 0 && (
              <p className="m-0 text-center text-[#9ca3af] text-[14px] py-6">No completed tasks</p>
            )}
            {filtered.map((entry, i) => (
              <div key={`${entry.id}-${entry.completedAtMs || i}`}
                className="flex items-center gap-3 py-3.5 pl-3.5 pr-5 rounded-[15px]"
                style={i % 2 === 0 ? { background: '#D3EDE9' } : {}}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: '#0F7A70' }}>
                  <ClipboardList size={18} color="#fff" />
                </div>
                <p className="flex-1 min-w-0 m-0 text-[12px] font-medium text-[#0A2A3A] truncate">
                  {entry.name}
                </p>
                <span className="text-[14px] text-[#0A2A3A] shrink-0">
                  {entry.completedAtMs
                    ? new Date(entry.completedAtMs).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                    : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          DESKTOP + TABLET LAYOUT (lg and above)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:block min-h-screen bg-[#D3EDE9]"
        style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>
        <Sidebar mode="pantry" activePath="/manager-history" />
        <div className="lg:ml-[var(--sidebar-w)]">
          <div className="px-6 pt-5 pb-3">
            <PageHeader initials={initials} label="History" />
          </div>
          <div className="p-6 flex flex-col gap-5">
            <div className="hidden xl:block">
              {(() => {
                const sparkline = computeSparkline(completedTasks);
                const yday = sparkline[sparkline.length - 2];
                const tod  = sparkline[sparkline.length - 1];
                const diff = tod - yday;
                const deltaText = diff === 0 ? "— same as yesterday"
                  : diff > 0 ? `▲ ${diff} more than yesterday`
                  : `▼ ${Math.abs(diff)} fewer than yesterday`;
                return (
                  <DashboardHero sections={[
                    { label: "Tasks Completed Today",  value: todayCount,       delta: deltaText,       chipTone: "complete", bars: sparkline },
                    { label: "Total Sessions",         value: uniqueSessions,   delta: "all time",      chipTone: "brand"    },
                    { label: "Volunteers Participated",value: uniqueVolunteers, delta: "unique helpers", chipTone: "progress" },
                  ]} />
                );
              })()}
            </div>
            <HistoryTable tasks={completedTasks} />
          </div>
        </div>
      </div>
    </>
  );
}
