// ManagerHistory.jsx — Pantry task history
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { Search, ChevronDown, Clock, MapPin, X, Menu } from "lucide-react";
import { useSharedTasks } from "../hooks/useSharedTasks";

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

const TODAY_DISPLAY = new Date().toLocaleDateString("en-US", {
  weekday: "short", month: "short", day: "numeric", year: "numeric",
});

const DATE_FILTER_OPTIONS = ["Today", "This Week", "This Month", "All Time"];

// ── Main component ────────────────────────────────────────────────────────────
export default function ManagerHistory() {
  const navigate = useNavigate();
  const { completedTasks, session } = useSharedTasks();

  const [searchQuery,        setSearchQuery]        = useState("");
  const [dateFilter,         setDateFilter]         = useState("Today");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [mobileMenuOpen,     setMobileMenuOpen]     = useState(false);

  // ── Sorting + filtering ────────────────────────────────────────────────────
  const sorted = [...completedTasks].sort((a, b) => (b.completedAtMs || 0) - (a.completedAtMs || 0));

  const todayStr = getTodayStr();
  const { start: weekStart, end: weekEnd } = getWeekRange();
  const { start: monthStart, end: monthEnd } = getMonthRange();

  const dateFiltered = sorted.filter(t => {
    const d = msToDateStr(t.completedAtMs);
    if (dateFilter === "Today")      return d === todayStr;
    if (dateFilter === "This Week")  return d >= weekStart && d <= weekEnd;
    if (dateFilter === "This Month") return d >= monthStart && d <= monthEnd;
    return true; // All Time
  });

  const filtered = dateFiltered.filter(t => {
    const q = searchQuery.toLowerCase();
    return !q ||
      t.name?.toLowerCase().includes(q) ||
      t.completedBy?.toLowerCase().includes(q) ||
      t.source?.toLowerCase().includes(q) ||
      t.destination?.toLowerCase().includes(q);
  });

  // ── Stats ─────────────────────────────────────────────────────────────────
  const todayCount       = sorted.filter(t => msToDateStr(t.completedAtMs) === todayStr).length;
  const uniqueSessions   = new Set(sorted.map(t => t.sessionDate || "").filter(Boolean)).size;
  const uniqueVolunteers = new Set(
    sorted.map(t => t.completedBy || "").filter(v => v && v !== "Manager")
  ).size;

  const sessionBadge = session?.isActive
    ? { label: "Session Active",    dot: "#34C759" }
    : { label: "No Active Session", dot: "#6B7280" };

  const STATS = [
    { label: "Tasks Completed Today",   value: todayCount,       color: "#34c759" },
    { label: "Total Sessions",          value: uniqueSessions,   color: "#0d9488" },
    { label: "Volunteers Participated", value: uniqueVolunteers, color: "#0d9488" },
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
            <span className="text-white text-[11px] font-semibold">JB</span>
          </div>
          <div>
            <p className="text-white text-[13px] font-medium">Jason Bratina</p>
            <p className="text-[#6b7280] text-[10px]">Operations Manager</p>
          </div>
        </div>
        <button onClick={() => setMobileMenuOpen(true)}
          className="text-white bg-transparent border-none cursor-pointer p-1">
          <Menu size={22} />
        </button>
      </div>

      {/* Main content — margin only on desktop */}
      <div className="lg:ml-[220px]">

        {/* Desktop top bar */}
        <div className="hidden lg:flex bg-white border-b border-[#e5e7eb] h-16 items-center justify-between px-6 sticky top-0 z-10">
          <div>
            <p className="text-[#0d9488] text-[10px] uppercase tracking-widest">Operations Manager</p>
            <h1 className="text-[22px] font-semibold text-[#0a2a3a] tracking-tight leading-tight">
              Task History
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[#6b7280] text-[13px]">{TODAY_DISPLAY}</span>
            <div className="flex items-center gap-2 border border-[#e5e7eb] rounded-full px-3 py-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sessionBadge.dot }} />
              <span className="text-[12px] font-medium text-[#6b7280]">{sessionBadge.label}</span>
            </div>
          </div>
        </div>

        {/* Mobile page title */}
        <div className="lg:hidden px-4 pt-5 pb-3">
          <p className="text-[#0d9488] text-[10px] uppercase tracking-widest mb-0.5">Operations Manager</p>
          <h1 className="text-[22px] font-semibold text-[#0a2a3a] tracking-tight">Task History</h1>
        </div>

        {/* Page content */}
        <div className="p-4 lg:p-6 flex flex-col gap-4 lg:gap-5">

          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
            <div className="bg-white border border-[#e5e7eb] rounded-xl px-4 py-3 lg:h-[80px] flex flex-col justify-center">
              <p className="text-[#6b7280] text-[11px] lg:text-[12px] mb-1">{STATS[0].label}</p>
              <p className="text-[28px] font-semibold leading-none" style={{ color: STATS[0].color }}>{STATS[0].value}</p>
            </div>
            <div className="bg-white border border-[#e5e7eb] rounded-xl px-4 py-3 lg:h-[80px] flex flex-col justify-center">
              <p className="text-[#6b7280] text-[11px] lg:text-[12px] mb-1">{STATS[1].label}</p>
              <p className="text-[28px] font-semibold leading-none" style={{ color: STATS[1].color }}>{STATS[1].value}</p>
            </div>
            <div className="bg-white border border-[#e5e7eb] rounded-xl px-4 py-3 lg:h-[80px] flex flex-col justify-center col-span-2 lg:col-span-1">
              <p className="text-[#6b7280] text-[11px] lg:text-[12px] mb-1">{STATS[2].label}</p>
              <p className="text-[28px] font-semibold leading-none" style={{ color: STATS[2].color }}>{STATS[2].value}</p>
            </div>
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
                    <p className="text-[#6b7280] text-[12px] mb-1">{entry.completedBy || "—"}</p>
                    {location && (
                      <div className="flex items-center gap-1 text-[#6b7280] text-[12px] mb-1">
                        <MapPin size={12} className="shrink-0" />
                        <span>{location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-[#b3b3b3] text-[11px]">
                      <span>{entry.completedAt || ""}</span>
                      {entry.sessionDate && <span>· {entry.sessionDate}</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop: history card */}
          <div className="hidden lg:block bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">

            {/* Card header */}
            <div className="px-5 py-4 border-b border-[#e5e7eb] flex items-center justify-between">
              <p className="text-[#0a2a3a] text-[16px] font-semibold">Completed Tasks</p>

              {/* Date filter */}
              <div className="relative">
                <button
                  onClick={() => setShowFilterDropdown(o => !o)}
                  className="flex items-center gap-2 bg-white border border-[#e5e7eb] rounded-lg px-3 py-1.5
                             text-[13px] text-[#0a2a3a] cursor-pointer hover:border-[#0d9488] transition-colors"
                  style={{ minWidth: 130 }}>
                  <span className="flex-1 text-left">{dateFilter}</span>
                  <ChevronDown size={14} className="text-[#0d9488] shrink-0" />
                </button>
                {showFilterDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowFilterDropdown(false)} />
                    <div className="absolute right-0 top-full mt-1 bg-white border border-[#e5e7eb] rounded-lg
                                    shadow-sm z-20 overflow-hidden" style={{ minWidth: 130 }}>
                      {DATE_FILTER_OPTIONS.map(opt => (
                        <button key={opt}
                          onClick={() => { setDateFilter(opt); setShowFilterDropdown(false); }}
                          className={`w-full text-left px-4 py-2.5 text-[13px] border-none cursor-pointer transition-colors ${
                            dateFilter === opt
                              ? "bg-[#f0fafa] text-[#0d9488] font-medium"
                              : "bg-white text-[#0a2a3a] hover:bg-[#f9fafb] font-normal"
                          }`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Search bar */}
            <div className="px-5 py-3 border-b border-[#e5e7eb]">
              <div className="flex items-center gap-2 border border-[#e5e7eb] rounded-lg px-3 bg-[#f9fafb]"
                style={{ height: 40 }}>
                <Search size={14} className="text-[#b3b3b3] shrink-0" />
                <input type="text" placeholder="Search completed tasks..."
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 text-[13px] text-[#0a2a3a] placeholder-[#b3b3b3] outline-none bg-transparent" />
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Clock size={40} className="text-[#ccedeb] mb-3" />
                <p className="text-[#0a2a3a] text-[15px] font-semibold">No completed tasks</p>
                <p className="text-[#6b7280] text-[13px] mt-1">
                  Completed tasks will appear here after sessions
                </p>
              </div>
            ) : (
              <>
                {/* Column headers */}
                <div className="px-4 py-3 bg-[#f9fafb] border-b border-[#e5e7eb]">
                  <div className="grid items-center"
                    style={{ gridTemplateColumns: "2fr 1.4fr 1.6fr 100px 110px 90px" }}>
                    {["Task Name", "Completed By", "Location", "Completed At", "Session", "Status"].map(h => (
                      <p key={h} className="text-[#6b7280] text-[11px] uppercase tracking-wide">{h}</p>
                    ))}
                  </div>
                </div>

                {/* Rows */}
                {filtered.map((entry, i) => {
                  const location = entry.source && entry.destination
                    ? `${entry.source} → ${entry.destination}`
                    : entry.source || entry.destination || "—";
                  return (
                    <div key={`${entry.id}-${entry.completedAtMs || i}`}
                      className="px-4 py-3 border-b border-[#f3f4f6] last:border-b-0 flex items-center">
                      <div className="grid items-center w-full"
                        style={{ gridTemplateColumns: "2fr 1.4fr 1.6fr 100px 110px 90px" }}>
                        <p className="text-[#0a2a3a] text-[13px] font-medium truncate pr-3">
                          {entry.name}
                        </p>
                        <p className="text-[#6b7280] text-[13px] truncate pr-3">
                          {entry.completedBy || "—"}
                        </p>
                        <div className="flex items-center gap-1 text-[#6b7280] text-[12px] pr-3 min-w-0">
                          <MapPin size={12} className="shrink-0 text-[#b3b3b3]" />
                          <span className="truncate">{location}</span>
                        </div>
                        <p className="text-[#6b7280] text-[12px]">{entry.completedAt || "—"}</p>
                        <p className="text-[#6b7280] text-[12px]">{entry.sessionDate || "—"}</p>
                        <div>
                          <span className="bg-[#f0fff4] text-[#34c759] text-[11px] px-2 py-0.5 rounded-full">
                            Complete
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
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
            <div className="flex mx-4 my-3 bg-[#0d2233] rounded-lg p-0.5">
              <button className="flex-1 py-1.5 rounded-md text-[12px] font-medium bg-[#09665e] text-white border-none cursor-pointer">
                Pantry
              </button>
              <button onClick={() => { setMobileMenuOpen(false); navigate("/manager-delivery"); }}
                className="flex-1 py-1.5 rounded-md text-[12px] font-medium text-[#6b7280] hover:text-[#b3b3b3] bg-transparent border-none cursor-pointer">
                Delivery
              </button>
            </div>
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
                  <span className="text-white text-[12px] font-semibold">JB</span>
                </div>
                <div>
                  <p className="text-[#b3b3b3] text-[13px] font-semibold">Jason Bratina</p>
                  <p className="text-[#757575] text-[11px]">Operations Manager</p>
                </div>
              </div>
              <button onClick={() => navigate("/")}
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
