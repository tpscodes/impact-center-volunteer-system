// ManagerDeliveryHistory.jsx — Completed delivery routes log
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { Search, Clock, MapPin, Truck, Calendar, X, Menu } from "lucide-react";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";

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
  return {
    start: mon.toISOString().slice(0, 10),
    end:   sun.toISOString().slice(0, 10),
  };
}

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString().slice(0, 10);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString().slice(0, 10);
  return { start, end };
}

function claimedArray(claimedBy) {
  if (!claimedBy) return [];
  return Array.isArray(claimedBy) ? claimedBy : Object.values(claimedBy);
}

// Format "2025-04-07" → "Mon, Apr 7"
function formatDateShort(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

// Format time "14:30" → "2:30 PM"
function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function getDateGroupLabel(dateStr) {
  const today     = getTodayStr();
  const yesterday = (() => {
    const d = new Date(today + "T12:00:00");
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  })();
  if (dateStr === today)     return "TODAY";
  if (dateStr === yesterday) return "YESTERDAY";
  return formatDateShort(dateStr).toUpperCase();
}

// ── Route card ────────────────────────────────────────────────────────────────
function RouteCard({ route, volunteers }) {
  const claimed = claimedArray(route.claimedBy);

  // Resolve names: claimedBy entries may be IDs or names
  const driverNames = claimed.map(val => {
    const found = volunteers.find(v => v.id === val || v.name === val);
    return found ? found.name : val;
  }).filter(Boolean);

  return (
    <div className="bg-white border border-[#e5e7eb] rounded-xl p-4 mb-3">
      {/* Row 1 — name + badge */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-[#0a2a3a] text-[14px] font-semibold truncate mr-3">{route.name}</p>
        <span className="bg-[#f0fff4] text-[#34c759] text-[11px] px-2 py-0.5 rounded-full shrink-0">
          Complete
        </span>
      </div>

      {/* Row 2 — source → destination */}
      <div className="flex items-center gap-1 mb-1.5 flex-wrap">
        <MapPin size={13} className="text-[#6b7280] shrink-0" />
        <span className="text-[#6b7280] text-[12px]">{route.source || "—"}</span>
        <span className="text-[#6b7280] text-[12px] mx-1">→</span>
        <span className="text-[#6b7280] text-[12px]">{route.destination || "—"}</span>
      </div>

      {/* Row 3 — date · departure · vehicle */}
      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mb-2.5">
        <div className="flex items-center gap-1">
          <Calendar size={13} className="text-[#6b7280] shrink-0" />
          <span className="text-[#6b7280] text-[12px]">{formatDateShort(route.date)}</span>
        </div>
        {route.departureTime && (
          <div className="flex items-center gap-1">
            <Clock size={13} className="text-[#6b7280] shrink-0" />
            <span className="text-[#6b7280] text-[12px]">{formatTime(route.departureTime)}</span>
          </div>
        )}
        {route.vehicle && (
          <div className="flex items-center gap-1">
            <Truck size={13} className="text-[#6b7280] shrink-0" />
            <span className="text-[#6b7280] text-[12px]">{route.vehicle}</span>
          </div>
        )}
      </div>

      {/* Row 4 — driver pills */}
      {driverNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {driverNames.map((name, i) => (
            <span key={i}
              className="bg-[#ccedeb] text-[#09665e] text-[11px] px-2 py-0.5 rounded-full">
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ManagerDeliveryHistory() {
  const navigate = useNavigate();

  const [routes,     setRoutes]     = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate,    setFromDate]    = useState("");
  const [toDate,      setToDate]      = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Firebase listeners
  useEffect(() => {
    const unsub = onValue(ref(db, "deliveryRoutes"), (snap) => {
      const data = snap.val();
      setRoutes(data ? Object.entries(data).map(([key, val]) => ({ key, ...val })) : []);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onValue(ref(db, "volunteers"), (snap) => {
      const data = snap.val();
      setVolunteers(data ? Object.values(data) : []);
    });
    return () => unsub();
  }, []);

  // Only completed routes, sorted newest first
  const completed = routes
    .filter(r => r.status === "complete")
    .sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));

  const todayStr               = getTodayStr();
  const { start: wkStart, end: wkEnd } = getWeekRange();
  const { start: moStart, end: moEnd } = getMonthRange();

  // Stats
  const totalCompleted = completed.length;
  const thisWeek  = completed.filter(r => r.date >= wkStart && r.date <= wkEnd).length;
  const thisMonth = completed.filter(r => r.date >= moStart && r.date <= moEnd).length;

  // Filter logic
  const filtersActive = searchQuery.trim() !== "" || fromDate !== "" || toDate !== "";

  const filtered = completed.filter(r => {
    if (fromDate && r.date < fromDate) return false;
    if (toDate   && r.date > toDate)   return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = r.name?.toLowerCase().includes(q);
      const driverMatch = claimedArray(r.claimedBy).some(val => {
        const vol = volunteers.find(v => v.id === val || v.name === val);
        return (vol?.name || val).toLowerCase().includes(q);
      });
      if (!nameMatch && !driverMatch) return false;
    }
    return true;
  });

  // Group by date
  const groups = [];
  for (const route of filtered) {
    const last = groups[groups.length - 1];
    if (last && last.date === route.date) {
      last.routes.push(route);
    } else {
      groups.push({ date: route.date, routes: [route] });
    }
  }

  function clearFilters() {
    setSearchQuery("");
    setFromDate("");
    setToDate("");
  }

  const todayDisplay = new Date().toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });

  const MOBILE_NAV = [
    { label: "Dashboard", path: "/manager-delivery",           active: false },
    { label: "Routes",    path: "/manager-delivery-routes",    active: false },
    { label: "Drivers",   path: "/manager-delivery-volunteers",active: false },
    { label: "History",   path: "/manager-delivery-history",   active: true  },
  ];

  const STATS = [
    { label: "Total Completed", value: totalCompleted, color: "#34c759" },
    { label: "This Week",       value: thisWeek,        color: "#0d9488" },
    { label: "This Month",      value: thisMonth,       color: "#0d9488" },
  ];

  // ── Shared content ─────────────────────────────────────────────────────────
  const FiltersRow = ({ className = "" }) => (
    <div className={`flex flex-wrap gap-3 items-center ${className}`}>
      {/* Search */}
      <div className="flex items-center gap-2 border border-[#e5e7eb] rounded-lg px-3 py-2 bg-white min-w-[200px] flex-1">
        <Search size={14} className="text-[#b3b3b3] shrink-0" />
        <input type="text" placeholder="Search by route or driver..."
          value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          className="flex-1 text-[13px] text-[#0a2a3a] placeholder-[#b3b3b3] outline-none bg-transparent" />
      </div>
      {/* From date */}
      <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
        className="border border-[#e5e7eb] rounded-lg px-3 py-2 text-[13px] text-[#0a2a3a]
                   focus:outline-none focus:ring-2 focus:ring-[#0d9488] bg-white" />
      {/* To date */}
      <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
        className="border border-[#e5e7eb] rounded-lg px-3 py-2 text-[13px] text-[#0a2a3a]
                   focus:outline-none focus:ring-2 focus:ring-[#0d9488] bg-white" />
      {/* Clear */}
      {filtersActive && (
        <button onClick={clearFilters}
          className="text-[#0d9488] text-[12px] underline bg-transparent border-none cursor-pointer shrink-0">
          Clear Filters
        </button>
      )}
    </div>
  );

  const HistoryList = () => (
    <>
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#e5e7eb] rounded-xl px-5 py-16 flex flex-col items-center">
          <Clock size={40} style={{ color: "#ccedeb" }} />
          <p className="text-[#0a2a3a] text-[15px] font-semibold mt-3">No completed routes yet</p>
          <p className="text-[#6b7280] text-[13px] mt-1">Completed delivery routes will appear here</p>
        </div>
      ) : (
        groups.map(group => (
          <div key={group.date}>
            <p className="text-[#6b7280] text-[11px] uppercase tracking-widest mb-2 mt-4 first:mt-0">
              {getDateGroupLabel(group.date)}
            </p>
            {group.routes.map(route => (
              <RouteCard key={route.key} route={route} volunteers={volunteers} />
            ))}
          </div>
        ))
      )}
    </>
  );

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════════════
          MOBILE LAYOUT
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden min-h-screen bg-[#f5f5f5] flex flex-col"
        style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

        {/* Mobile header */}
        <div className="bg-[#0a2a3a] px-4 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <p className="text-[#0d9488] text-[10px] uppercase tracking-widest">Operations Manager</p>
            <p className="text-white text-[18px] font-semibold leading-tight">Delivery History</p>
          </div>
          <button onClick={() => setMobileMenuOpen(o => !o)}
            className="text-white bg-transparent border-none cursor-pointer p-1">
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
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
              {/* Mode toggle — Delivery active */}
              <div className="flex mx-4 my-3 bg-[#0d2233] rounded-lg p-0.5">
                <button onClick={() => { setMobileMenuOpen(false); navigate("/manager/dashboard"); }}
                  className="flex-1 py-1.5 rounded-md text-[12px] font-medium text-[#6b7280] hover:text-[#b3b3b3]">
                  Pantry
                </button>
                <button className="flex-1 py-1.5 rounded-md text-[12px] font-medium bg-[#09665e] text-white">
                  Delivery
                </button>
              </div>
              <nav className="flex flex-col py-2">
                {MOBILE_NAV.map(item => (
                  <button key={item.label}
                    onClick={() => { setMobileMenuOpen(false); navigate(item.path); }}
                    className={`w-full text-left px-5 py-3.5 text-[15px] font-semibold bg-transparent border-none ${
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

        <div className="px-4 py-5 flex flex-col gap-4 pb-8">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-[#e5e7eb] rounded-xl px-4 py-3">
              <p className="text-[#6b7280] text-[11px] mb-1">Total Completed</p>
              <p className="text-[28px] font-semibold leading-none" style={{ color: STATS[0].color }}>
                {STATS[0].value}
              </p>
            </div>
            <div className="bg-white border border-[#e5e7eb] rounded-xl px-4 py-3">
              <p className="text-[#6b7280] text-[11px] mb-1">This Week</p>
              <p className="text-[28px] font-semibold leading-none" style={{ color: STATS[1].color }}>
                {STATS[1].value}
              </p>
            </div>
            <div className="bg-white border border-[#e5e7eb] rounded-xl px-4 py-3 col-span-2">
              <p className="text-[#6b7280] text-[11px] mb-1">This Month</p>
              <p className="text-[28px] font-semibold leading-none" style={{ color: STATS[2].color }}>
                {STATS[2].value}
              </p>
            </div>
          </div>

          {/* Filters */}
          <FiltersRow className="flex-col" />

          {/* History list */}
          <HistoryList />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          DESKTOP LAYOUT
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex min-h-screen bg-[#f5f5f5]"
        style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

        <Sidebar mode="delivery" activePath="/manager-delivery-history" />

        <div className="ml-[220px] flex-1 flex flex-col min-h-screen">

          {/* Top bar */}
          <div className="bg-white border-b border-[#e5e7eb] h-16 flex items-center justify-between px-6 sticky top-0 z-10">
            <div>
              <p className="text-[#0d9488] text-[10px] uppercase tracking-widest">Operations Manager</p>
              <h1 className="text-[22px] font-semibold text-[#0a2a3a] tracking-tight leading-tight">
                Delivery History
              </h1>
            </div>
            <span className="text-[#6b7280] text-[13px]">{todayDisplay}</span>
          </div>

          <div className="p-6 flex flex-col gap-5">

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
              {STATS.map(s => (
                <div key={s.label} className="bg-white border border-[#e5e7eb] rounded-xl px-4 py-3 h-[80px] flex flex-col justify-center">
                  <p className="text-[#6b7280] text-[12px] mb-1">{s.label}</p>
                  <p className="text-[28px] font-semibold leading-none" style={{ color: s.color }}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Filters row */}
            <FiltersRow />

            {/* History list */}
            <HistoryList />
          </div>
        </div>
      </div>
    </>
  );
}
