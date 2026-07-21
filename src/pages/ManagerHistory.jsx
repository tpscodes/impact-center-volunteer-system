// ManagerHistory.jsx — Pantry task history
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import PageHeader from "../components/PageHeader";
import { Search, Clock, MapPin, X, Menu } from "lucide-react";
import HistoryTable from "../components/HistoryTable";
import "../components/StatCards.css";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <div className="min-h-screen bg-[#f5f5f5]"
      style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar mode="pantry" activePath="/manager-history" />
      </div>

      {/* Mobile top bar */}
      <div className="lg:hidden bg-[#0a2a3a] px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#0d9488] flex items-center justify-center">
            <span className="text-white text-[11px] font-semibold">{initials}</span>
          </div>
          <div>
            <p className="text-white text-[13px] font-medium">{displayName}</p>
            <p className="text-[#6b7280] text-[10px]">Operations Manager</p>
          </div>
        </div>
        <button onClick={() => setMobileMenuOpen(true)}
          className="text-white bg-transparent border-none cursor-pointer p-1">
          <Menu size={22} />
        </button>
      </div>

      {/* Main content — margin only on desktop */}
      <div className="lg:ml-[var(--sidebar-w)]">

        {/* Pill header */}
        <div className="hidden lg:block px-6 pt-5 pb-3">
          <PageHeader
            initials={initials}
            label="History"
          />
        </div>

        {/* Mobile page title */}
        <div className="lg:hidden px-4 pt-5 pb-3">
          <p className="text-[#0d9488] text-[10px] uppercase tracking-widest mb-0.5">Operations Manager</p>
          <h1 className="text-[22px] font-semibold text-[#0a2a3a] tracking-tight">Task History</h1>
        </div>

        {/* Page content */}
        <div className="p-4 lg:p-6 flex flex-col gap-4 lg:gap-5">

          {/* Stats row */}
          <div className="sc-row">
            {STATS.map(s => (
              <div
                key={s.label}
                className="sc-card"
                style={{ "--chip-bg": s.chipBg, "--chip-fg": s.chipFg, "--value-fg": s.valueFg }}
              >
                <div className="sc-top">
                  <span className="sc-chip">{s.chip}</span>
                </div>
                <p className="sc-value">{s.value}</p>
                <p style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Mobile: search */}
          <div className="lg:hidden">
            <div className="flex items-center gap-2 border border-[#e5e7eb] rounded-lg px-3 py-2.5 bg-white">
              <Search size={14} className="text-[#b3b3b3] shrink-0" />
              <input type="text" placeholder="Search completed tasks..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 text-[13px] text-[#0a2a3a] placeholder-[#b3b3b3] outline-none bg-transparent" />
            </div>
          </div>

          {/* Mobile: task cards */}
          <div className="lg:hidden flex flex-col gap-3 pb-8">
            {filtered.length === 0 ? (
              <div className="bg-white border border-[#e5e7eb] rounded-xl flex flex-col items-center justify-center py-14">
                <Clock size={40} className="text-[#ccedeb] mb-3" />
                <p className="text-[#0a2a3a] text-[15px] font-semibold">No completed tasks</p>
                <p className="text-[#6b7280] text-[13px] mt-1 text-center px-6">
                  Completed tasks will appear here after sessions
                </p>
              </div>
            ) : (
              filtered.map((entry, i) => {
                const location = entry.source && entry.destination
                  ? `${entry.source} → ${entry.destination}`
                  : entry.source || entry.destination || null;
                return (
                  <div key={`${entry.id}-${entry.completedAtMs || i}`}
                    className="bg-white border border-[#e5e7eb] rounded-xl px-4 py-3.5">
                    <div className="flex items-start justify-between mb-1.5">
                      <p className="text-[#0a2a3a] text-[14px] font-medium flex-1 pr-3">{entry.name}</p>
                      <span className="bg-[#f0fff4] text-[#34c759] text-[11px] px-2 py-0.5 rounded-full shrink-0">
                        Complete
                      </span>
                    </div>
                    <p className="text-[#6b7280] text-[12px] mb-1">{resolveCompletedBy(entry) || "—"}</p>
                    {location && (
                      <div className="flex items-center gap-1 text-[#6b7280] text-[12px] mb-1">
                        <MapPin size={12} className="shrink-0" />
                        <span>{location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-[#b3b3b3] text-[11px]">
                      <span>{formatDate(entry.completedAtMs || entry.completedAt)}</span>
                      {entry.sessionDate && <span>· {entry.sessionDate}</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop: history table */}
          <div className="hidden lg:block">
            <HistoryTable tasks={completedTasks} />
          </div>
        </div>
      </div>

      {/* Hamburger overlay */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-30" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed top-0 left-0 right-0 z-40 bg-[#0a2a3a]"
            style={{ animation: "slideDown 0.22s ease" }}>
            <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-[#1a3a4a]">
              <div>
                <p className="text-white text-[14px] font-semibold tracking-wide">IMPACT CENTER</p>
                <p className="text-[#0d9488] text-[10px]">Volunteer Task Management</p>
              </div>
              <button onClick={() => setMobileMenuOpen(false)}
                className="text-white bg-transparent border-none cursor-pointer p-1">
                <X size={20} />
              </button>
            </div>
            {role !== 'superadmin' && activePantryId !== 'amber' && (
              <div className="flex mx-4 my-3 bg-[#0d2233] rounded-lg p-0.5">
                <button className="flex-1 py-1.5 rounded-md text-[12px] font-medium bg-[#09665e] text-white border-none cursor-pointer">
                  Pantry
                </button>
                <button onClick={() => { setMobileMenuOpen(false); navigate("/manager-delivery"); }}
                  className="flex-1 py-1.5 rounded-md text-[12px] font-medium text-[#6b7280] hover:text-[#b3b3b3] bg-transparent border-none cursor-pointer">
                  Delivery
                </button>
              </div>
            )}
            <nav className="flex flex-col py-2">
              {MOBILE_NAV.map(item => (
                <button key={item.label}
                  onClick={() => { setMobileMenuOpen(false); navigate(item.path); }}
                  className={`w-full text-left px-5 py-3.5 text-[15px] font-semibold bg-transparent border-none cursor-pointer ${
                    item.active
                      ? "text-[#0d9488] border-l-[3px] border-[#0d9488]"
                      : "text-[#9ca3af] border-l-[3px] border-transparent"
                  }`}>
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="px-5 py-4 border-t border-[#1a3a4a] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#0d9488] flex items-center justify-center shrink-0">
                  <span className="text-white text-[12px] font-semibold">{initials}</span>
                </div>
                <div>
                  <p className="text-[#b3b3b3] text-[13px] font-semibold">{displayName}</p>
                  <p className="text-[#757575] text-[11px]">Operations Manager</p>
                </div>
              </div>
              <button onClick={() => { setMobileMenuOpen(false); logout(); }}
                className="text-[#dc2626] text-[12px] bg-transparent border-none cursor-pointer">
                Logout
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
