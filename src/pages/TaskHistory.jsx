// TaskHistory.jsx — Operations Manager: completed task log
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronDown, ClipboardList } from "lucide-react";
import { useSharedTasks } from "../hooks/useSharedTasks";

const TODAY_LABEL = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

function isToday(ms) {
  if (!ms) return false;
  const d = new Date(ms);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

export default function TaskHistory() {
  const navigate = useNavigate();
  const { completedTasks, synced, error, session } = useSharedTasks();

  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("Today");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Sort newest first
  const sorted = [...completedTasks].sort((a, b) => (b.completedAtMs || 0) - (a.completedAtMs || 0));

  // Apply date filter
  const dateFiltered = dateFilter === "Today"
    ? sorted.filter(t => isToday(t.completedAtMs))
    : sorted;

  // Apply search
  const filtered = dateFiltered.filter(t => {
    const q = searchQuery.toLowerCase();
    return !q ||
      t.name?.toLowerCase().includes(q) ||
      t.completedBy?.toLowerCase().includes(q) ||
      t.source?.toLowerCase().includes(q) ||
      t.destination?.toLowerCase().includes(q);
  });

  // Stats
  const todayCount = sorted.filter(t => isToday(t.completedAtMs)).length;
  const uniqueSessions = new Set(sorted.map(t => t.sessionDate || "")).size;
  const uniqueVolunteers = new Set(sorted.map(t => t.completedBy || "").filter(Boolean)).size;

  // Session badge
  const sessionBadge = session?.isActive
    ? { label: "Session Active", dot: "#34C759" }
    : { label: "No Active Session", dot: "#6B7280" };

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex"
      style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Sidebar ── */}
      <div className="w-[220px] min-h-screen bg-[#0a2a3a] flex flex-col fixed left-0 top-0 z-20">
        <div className="px-5 pt-7 pb-4">
          <p className="text-white text-[14px] font-medium tracking-wide">IMPACT CENTER</p>
          <p className="text-[#0d9488] text-[10px] mt-0.5">Volunteer Task Management</p>
          <div className="w-8 h-0.5 bg-[#0d9488] mt-3" />
        </div>
        <nav className="flex flex-col mt-2">
          {[
            { label: "Dashboard", path: "/manager/dashboard", active: false, enabled: true },
            { label: "Tasks",     path: "/manager-tasks",      active: false, enabled: true },
            { label: "Volunteers",path: "/manager-volunteers", active: false, enabled: true },
            { label: "History",   path: "/manager/history",    active: true,  enabled: true },
          ].map(item => (
            <button key={item.label}
              onClick={() => item.enabled && item.path && navigate(item.path)}
              className={`w-full text-left px-5 py-3 text-[14px] font-semibold bg-transparent border-none transition-colors ${
                item.active
                  ? "text-[#0d9488] border-l-[3px] border-[#0d9488] cursor-default"
                  : item.enabled
                  ? "text-[#767676] border-l-[3px] border-transparent hover:text-[#b3b3b3] cursor-pointer"
                  : "text-[#3a4a52] border-l-[3px] border-transparent cursor-not-allowed opacity-40"
              }`}>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto px-4 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#0d9488] flex items-center justify-center shrink-0">
              <span className="text-white text-[12px] font-semibold">JB</span>
            </div>
            <div>
              <p className="text-[#b3b3b3] text-[13px] font-semibold leading-tight">Jason Bratina</p>
              <p className="text-[#757575] text-[11px] leading-tight">Operations Manager</p>
            </div>
          </div>
          <button onClick={() => navigate("/")}
            className="text-[#dc2626] text-[10px] mt-2 ml-12 hover:underline bg-transparent border-none cursor-pointer">
            Logout
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="ml-[220px] flex-1 flex flex-col min-h-screen">

        {/* Top bar */}
        <div className="bg-white border-b border-[#e5e7eb] h-16 flex items-center justify-between px-6 sticky top-0 z-10">
          <div>
            <p className="text-[#0d9488] text-[10px] uppercase tracking-widest">Operations Manager</p>
            <h1 className="text-[22px] font-semibold text-[#0a2a3a] tracking-tight leading-tight">Task History</h1>
          </div>
          {/* Session badge */}
          <div className="flex items-center gap-2 border border-[#e5e7eb] rounded-full px-3 py-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sessionBadge.dot }} />
            <span className="text-[12px] font-medium text-[#6b7280]">{sessionBadge.label}</span>
          </div>
        </div>

        {/* Page content */}
        <div className="p-6 flex flex-col gap-5">

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Tasks Completed Today", value: todayCount,       color: "#0d9488" },
              { label: "Total Sessions",         value: uniqueSessions || 0, color: "#0a2a3a" },
              { label: "Volunteers Participated",value: uniqueVolunteers, color: "#0d9488" },
            ].map(stat => (
              <div key={stat.label} className="bg-white border border-[#e5e7eb] rounded-xl px-4 py-3 h-[80px] flex flex-col justify-center">
                <p className="text-[#6b7280] text-[12px] mb-1">{stat.label}</p>
                <p className="text-[28px] font-semibold leading-none" style={{ color: stat.color }}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* History card */}
          <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">

            {/* Card header */}
            <div className="px-5 py-4 border-b border-[#e5e7eb] flex items-center justify-between">
              <p className="text-[#0a2a3a] text-[16px] font-semibold">Completed Tasks</p>

              {/* Date filter dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowFilterDropdown(o => !o)}
                  className="flex items-center gap-2 border border-[#e5e7eb] rounded-lg px-3 py-2 text-[13px] text-[#0a2a3a] font-medium bg-white cursor-pointer hover:border-[#0d9488] transition-colors"
                  style={{ minWidth: 120 }}>
                  <span className="flex-1 text-left">{dateFilter}</span>
                  <ChevronDown size={14} className="text-[#0d9488] shrink-0" />
                </button>
                {showFilterDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowFilterDropdown(false)} />
                    <div className="absolute right-0 top-full mt-1 bg-white border border-[#e5e7eb] rounded-lg shadow-sm z-20 overflow-hidden" style={{ minWidth: 120 }}>
                      {["Today", "All Time"].map(opt => (
                        <button key={opt}
                          onClick={() => { setDateFilter(opt); setShowFilterDropdown(false); }}
                          className={`w-full text-left px-4 py-2.5 text-[13px] border-none cursor-pointer transition-colors ${
                            dateFilter === opt
                              ? "bg-[#f0fafa] text-[#0d9488] font-medium"
                              : "text-[#0a2a3a] hover:bg-[#f9fafb] font-normal bg-white"
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
              <div className="flex items-center gap-2 border border-[#e5e7eb] rounded-lg px-3 bg-[#f9fafb]" style={{ height: 40 }}>
                <Search size={14} className="text-[#b3b3b3] shrink-0" />
                <input type="text"
                  placeholder="Search completed tasks..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 text-[13px] text-[#0a2a3a] placeholder-[#b3b3b3] outline-none bg-transparent" />
              </div>
            </div>

            {filtered.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center py-16">
                <ClipboardList size={48} className="text-[#0d9488] mb-4" />
                <p className="text-[#0a2a3a] text-[16px] font-semibold mb-2">No completed tasks yet</p>
                <p className="text-[#6b7280] text-[13px] text-center max-w-[320px]">
                  Completed tasks will appear here once volunteers mark them done.
                </p>
              </div>
            ) : (
              <>
                {/* Column headers */}
                <div className="px-5 py-2 bg-[#f9fafb] border-b border-[#e5e7eb]">
                  <div className="grid items-center" style={{ gridTemplateColumns: "2fr 1.4fr 1.6fr 100px 110px 90px" }}>
                    {["TASK NAME", "COMPLETED BY", "LOCATION", "COMPLETED AT", "SESSION", "STATUS"].map(h => (
                      <p key={h} className="text-[#6b7280] text-[11px] uppercase tracking-widest">{h}</p>
                    ))}
                  </div>
                </div>

                {/* Task rows */}
                {filtered.map((entry, i) => {
                  const location = entry.source && entry.destination
                    ? `${entry.source} → ${entry.destination}`
                    : entry.source || entry.destination || "—";
                  return (
                    <div key={`${entry.id}-${entry.completedAtMs || i}`}
                      className="px-5 border-b border-[#e5e7eb] last:border-b-0 flex items-center"
                      style={{ minHeight: 56 }}>
                      <div className="grid items-center w-full" style={{ gridTemplateColumns: "2fr 1.4fr 1.6fr 100px 110px 90px" }}>
                        {/* Task name */}
                        <p className="text-[#0a2a3a] text-[14px] font-semibold truncate pr-3">{entry.name}</p>
                        {/* Completed by */}
                        <p className="text-[#6b7280] text-[13px] truncate pr-3">{entry.completedBy || "—"}</p>
                        {/* Location */}
                        <p className="text-[#6b7280] text-[12px] truncate pr-3">{location}</p>
                        {/* Completed at */}
                        <p className="text-[#6b7280] text-[12px]">{entry.completedAt || "—"}</p>
                        {/* Session */}
                        <p className="text-[#6b7280] text-[12px]">{entry.sessionDate || "—"}</p>
                        {/* Status badge */}
                        <div>
                          <span className="text-[12px] font-medium px-2 py-1 rounded-xl bg-[#f0fff4] text-[#34c759]">
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
    </div>
  );
}
