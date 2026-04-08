// ManagerDeliveryRoutes.jsx — Full delivery route list for Operations Manager
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, Plus, MapPin, Clock, Truck, MoreHorizontal } from "lucide-react";
import { db } from "../firebase";
import { ref, onValue, remove } from "firebase/database";
import Sidebar from "../components/Sidebar";

// ── Utility functions ─────────────────────────────────────────────────────────
const getPriorityStyle = (priority) => {
  const p = priority?.toLowerCase();
  if (p === "urgent") return "bg-[#fff0f0] text-[#dc2626]";
  if (p === "high")   return "bg-[#fff3e0] text-[#ff9500]";
  return "bg-[#f0f0f0] text-[#6b7280]";
};
const getStatusStyle = (status) => {
  if (status === "inProgress") return "bg-[#fff3e0] text-[#ff9500]";
  if (status === "complete")   return "bg-[#f0fff4] text-[#34c759]";
  if (status === "incomplete") return "bg-[#fff0f0] text-[#dc2626]";
  return "bg-[#e6e6e6] text-[#6b7280]";
};
const getStatusLabel = (status) => {
  if (status === "inProgress") return "In Progress";
  if (status === "complete")   return "Complete";
  if (status === "incomplete") return "Incomplete";
  return "Available";
};

// ── Date helpers ──────────────────────────────────────────────────────────────
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}
function getTodayDayKey() {
  const d = new Date().getDay(); // 0=Sun
  return DAY_KEYS[(d + 6) % 7]; // shift so Mon=0
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
function claimedCount(claimedBy) {
  if (!claimedBy) return 0;
  if (Array.isArray(claimedBy)) return claimedBy.length;
  return Object.keys(claimedBy).length;
}
function claimedNames(claimedBy) {
  if (!claimedBy) return [];
  if (Array.isArray(claimedBy)) return claimedBy;
  return Object.values(claimedBy);
}

// ── Route card ────────────────────────────────────────────────────────────────
function RouteCard({ route, onDelete }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const needed = route.driversNeeded || 1;
  const names  = claimedNames(route.claimedBy);
  const filled = claimedCount(route.claimedBy);

  useEffect(() => {
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div className="bg-white border border-[#e5e7eb] rounded-xl p-4 mb-3">
      {/* Row 1 — name + status + menu */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-[#0a2a3a] text-[14px] font-semibold flex-1 pr-2">{route.name}</p>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-lg ${getStatusStyle(route.status)}`}>
            {getStatusLabel(route.status)}
          </span>
          {/* ⋯ menu */}
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen(o => !o)}
              className="text-[#6b7280] hover:text-[#0a2a3a] bg-transparent border-none cursor-pointer p-0.5 rounded">
              <MoreHorizontal size={16} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-[#e5e7eb] rounded-lg shadow-md py-1 z-20 min-w-[130px]">
                <button
                  onClick={() => { setMenuOpen(false); console.log("Edit route:", route._key); }}
                  className="w-full text-left px-4 py-2 text-[13px] text-[#0a2a3a] hover:bg-[#f9fafb] bg-transparent border-none cursor-pointer">
                  Edit Route
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onDelete(route._key); }}
                  className="w-full text-left px-4 py-2 text-[13px] text-[#dc2626] hover:bg-[#f9fafb] bg-transparent border-none cursor-pointer">
                  Delete Route
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2 — location */}
      {(route.source || route.destination) && (
        <div className="flex items-center gap-1 mb-1.5">
          <MapPin size={13} color="#6b7280" className="shrink-0" />
          <span className="text-[#6b7280] text-[12px]">
            {route.source || "—"}
            {route.source && route.destination && <span className="mx-1">→</span>}
            {route.destination}
          </span>
        </div>
      )}

      {/* Row 3 — time + vehicle */}
      <div className="flex items-center gap-3 mb-2">
        {route.departureTime && (
          <span className="flex items-center gap-1 text-[#6b7280] text-[12px]">
            <Clock size={13} color="#6b7280" className="shrink-0" />
            {route.departureTime}
            {route.arrivalTime && <span className="ml-1">→ {route.arrivalTime}</span>}
          </span>
        )}
        {route.vehicle && (
          <span className="flex items-center gap-1 text-[#6b7280] text-[12px]">
            <Truck size={13} color="#6b7280" className="shrink-0" />
            {route.vehicle}
          </span>
        )}
      </div>

      {/* Row 4 — driver slots */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {Array.from({ length: needed }).map((_, i) => {
          const name = names[i];
          return name ? (
            <span key={i} className="bg-[#ccedeb] text-[#09665e] text-[11px] px-2 py-0.5 rounded-full">
              {name}
            </span>
          ) : (
            <span key={i} className="bg-[#f0f0f0] text-[#6b7280] text-[11px] px-2 py-0.5 rounded-full">
              Unassigned
            </span>
          );
        })}
        <span className="text-[#6b7280] text-[11px] ml-1">
          {filled}/{needed} {needed === 1 ? "Driver" : "Drivers"}
        </span>
      </div>

      {/* Row 5 — priority (if set) */}
      {route.priority && route.priority !== "Normal" && (
        <div className="mt-2">
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-lg ${getPriorityStyle(route.priority)}`}>
            {route.priority}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ManagerDeliveryRoutes() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [routes, setRoutes] = useState([]);
  const [period, setPeriod] = useState("today");
  const [selectedDay, setSelectedDay] = useState(getTodayDayKey());

  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });

  // Firebase listener
  useEffect(() => {
    const unsub = onValue(ref(db, "deliveryRoutes"), (snap) => {
      const data = snap.val();
      if (data) {
        setRoutes(Object.entries(data).map(([key, val]) => ({ ...val, _key: key })));
      } else {
        setRoutes([]);
      }
    });
    return () => unsub();
  }, []);

  // Filter routes
  const today = getTodayStr();
  const week  = getWeekRange();

  const filtered = routes.filter(r => {
    if (!r.date) return false;
    if (period === "today") return r.date === today;
    // week mode — filter by selected day of week
    if (r.date < week.start || r.date > week.end) return false;
    return !selectedDay || r.dayOfWeek === selectedDay;
  }).sort((a, b) => (a.departureTime || "").localeCompare(b.departureTime || ""));

  // Stats (always based on period, ignoring day filter)
  const periodRoutes = routes.filter(r => {
    if (!r.date) return false;
    return period === "today" ? r.date === today : r.date >= week.start && r.date <= week.end;
  });
  const totalRoutes = periodRoutes.length;
  const completed   = periodRoutes.filter(r => r.status === "complete").length;
  const inProgress  = periodRoutes.filter(r => r.status === "inProgress").length;
  const unassigned  = periodRoutes.filter(r => claimedCount(r.claimedBy) === 0).length;

  async function handleDelete(key) {
    if (!window.confirm("Delete this route? This cannot be undone.")) return;
    await remove(ref(db, `deliveryRoutes/${key}`));
  }

  // ── Sub-components ──────────────────────────────────────────────────────────
  const PeriodToggle = () => (
    <div className="flex gap-1">
      {[["today", "Today"], ["week", "This Week"]].map(([val, label]) => (
        <button key={val} onClick={() => setPeriod(val)}
          className={`rounded-full px-3 py-1 text-[12px] border-none cursor-pointer transition-colors ${
            period === val ? "bg-[#0d9488] text-white" : "bg-white border border-[#e5e7eb] text-[#6b7280]"
          }`}>
          {label}
        </button>
      ))}
    </div>
  );

  const DayPills = () => (
    period === "week" ? (
      <div className="flex gap-1.5 flex-wrap">
        {DAYS.map((d, i) => {
          const key = DAY_KEYS[i];
          return (
            <button key={key} onClick={() => setSelectedDay(key)}
              className={`rounded-full px-3 py-1 text-[12px] border-none cursor-pointer transition-colors ${
                selectedDay === key ? "bg-[#0d9488] text-white" : "bg-white border border-[#e5e7eb] text-[#6b7280]"
              }`}>
              {d}
            </button>
          );
        })}
      </div>
    ) : null
  );

  const StatsRow = () => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
      {[
        { label: "Total Routes", value: totalRoutes, color: "#0d9488"  },
        { label: "Completed",    value: completed,   color: "#34c759"  },
        { label: "In Progress",  value: inProgress,  color: "#ff9500"  },
        { label: "Unassigned",   value: unassigned,  color: "#dc2626"  },
      ].map(s => (
        <div key={s.label} className="bg-white border border-[#e5e7eb] rounded-xl px-4 py-3 h-[80px] flex flex-col justify-center">
          <p className="text-[#6b7280] text-[12px] mb-1">{s.label}</p>
          <p className="text-[28px] font-semibold leading-none" style={{ color: s.color }}>{s.value}</p>
        </div>
      ))}
    </div>
  );

  const RouteList = () => (
    filtered.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-16">
        <Truck size={40} color="#ccedeb" />
        <p className="text-[#0a2a3a] text-[15px] font-semibold mt-3">No routes found</p>
        <p className="text-[#6b7280] text-[13px] mt-1">Add a delivery route to get started</p>
        <button onClick={() => navigate("/create-delivery-route")}
          className="mt-4 flex items-center gap-2 bg-[#09665e] text-white px-4 py-2 rounded-lg text-[13px] font-medium border-none cursor-pointer hover:opacity-90">
          <Plus size={14} />
          Add Route
        </button>
      </div>
    ) : (
      <div>
        {filtered.map(route => (
          <RouteCard key={route._key} route={route} onDelete={handleDelete} />
        ))}
      </div>
    )
  );

  return (
    <div className="min-h-screen bg-[#f5f5f5]"
      style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* ════════════════════════════════════════════════════
          MOBILE LAYOUT
      ════════════════════════════════════════════════════ */}
      <div className="lg:hidden min-h-screen flex flex-col">

        {/* Mobile header */}
        <div className="bg-[#0a2a3a] px-4 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <p className="text-[#0d9488] text-[10px] uppercase tracking-widest">Operations Manager</p>
            <p className="text-white text-[18px] font-semibold leading-tight">Routes</p>
          </div>
          <button onClick={() => setMobileMenuOpen(o => !o)}
            className="text-white bg-transparent border-none cursor-pointer p-1">
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile nav overlay */}
        {mobileMenuOpen && (
          <>
            <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed top-0 left-0 right-0 z-50 bg-[#0a2a3a]"
              style={{ animation: "slideDown 0.25s ease-out forwards" }}>
              <div className="px-8 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0d9488] flex items-center justify-center shrink-0">
                    <span className="text-white text-sm font-semibold">JB</span>
                  </div>
                  <div>
                    <p className="text-[#b3b3b3] text-[16px] font-semibold leading-tight">Jason Bratina</p>
                    <p className="text-[#757575] text-[14px] leading-tight">Operations Manager</p>
                  </div>
                </div>
                <button onClick={() => setMobileMenuOpen(false)}
                  className="text-white p-1 bg-transparent border-none cursor-pointer">
                  <X size={24} />
                </button>
              </div>
              <div className="w-10 h-0.5 bg-[#0d9488] mx-8 mb-2" />
              <div className="flex mx-4 mb-4 bg-[#0d2233] rounded-lg p-0.5">
                <button onClick={() => { setMobileMenuOpen(false); navigate("/manager/dashboard"); }}
                  className="flex-1 py-1.5 rounded-md text-[12px] font-medium text-[#6b7280] hover:text-[#b3b3b3] bg-transparent border-none cursor-pointer">
                  Pantry
                </button>
                <button className="flex-1 py-1.5 rounded-md text-[12px] font-medium bg-[#09665e] text-white border-none">
                  Delivery
                </button>
              </div>
              <nav className="flex flex-col py-2">
                {[
                  { label: "Dashboard", active: false, path: "/manager-delivery" },
                  { label: "Routes",    active: true,  path: "/manager-delivery-routes" },
                  { label: "Drivers",   active: false, path: "/manager-delivery-volunteers" },
                  { label: "History",   active: false, path: null },
                ].map(item => (
                  <button key={item.label}
                    onClick={() => { setMobileMenuOpen(false); if (item.path) navigate(item.path); }}
                    className={`w-full text-left px-8 py-4 text-[16px] font-semibold bg-transparent border-none cursor-pointer ${
                      item.active ? "text-[#0d9488] border-l-[3px] border-[#0d9488]" : "text-[#757575] border-l-[3px] border-transparent"
                    }`}>
                    {item.label}
                  </button>
                ))}
                <div className="mx-8 my-3 h-px bg-[#1e3a4a]" />
                <button onClick={() => { setMobileMenuOpen(false); navigate("/"); }}
                  className="w-full text-left px-8 py-4 text-[16px] font-semibold text-[#dc2626] border-l-[3px] border-transparent bg-transparent border-none cursor-pointer">
                  Logout
                </button>
              </nav>
            </div>
          </>
        )}

        {/* Mobile content */}
        <div className="px-4 py-4 flex flex-col gap-4 pb-6">
          <div className="flex items-center justify-between">
            <PeriodToggle />
            <button onClick={() => navigate("/create-delivery-route")}
              className="flex items-center gap-1.5 bg-[#09665e] text-white px-3 py-1.5 rounded-lg text-[13px] font-medium border-none cursor-pointer">
              <Plus size={13} />
              Add Route
            </button>
          </div>
          <DayPills />
          <StatsRow />
          <RouteList />
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          DESKTOP LAYOUT
      ════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex min-h-screen">

        <Sidebar mode="delivery" activePath="/manager-delivery-routes" />

        {/* Main content */}
        <div className="ml-[220px] flex-1 flex flex-col min-h-screen">

          {/* Top bar */}
          <div className="bg-white border-b border-[#e5e7eb] h-16 flex items-center justify-between px-6 sticky top-0 z-10">
            <div>
              <p className="text-[#0d9488] text-[10px] uppercase tracking-widest">Operations Manager</p>
              <h1 className="text-[22px] font-semibold text-[#0a2a3a] tracking-tight leading-tight">Routes</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[#6b7280] text-[13px]">{todayStr}</span>
              <button onClick={() => navigate("/create-delivery-route")}
                className="flex items-center gap-2 bg-[#09665e] text-white px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 border-none cursor-pointer">
                <Plus size={14} />
                Add Route
              </button>
            </div>
          </div>

          {/* Page content */}
          <div className="p-6 flex flex-col gap-5">
            <StatsRow />

            {/* Filter row */}
            <div className="flex flex-col gap-2">
              <PeriodToggle />
              <DayPills />
            </div>

            {/* Route list or empty state */}
            <RouteList />
          </div>
        </div>
      </div>
    </div>
  );
}
