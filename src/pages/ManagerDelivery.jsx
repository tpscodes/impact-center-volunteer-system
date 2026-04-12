// ManagerDelivery.jsx — Delivery Dashboard (landing screen for Delivery mode)
// Migrated to routeTemplates/ + routeOccurrences/ — deliveryRoutes/ deprecated
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, Clock, Truck } from "lucide-react";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import Sidebar from "../components/Sidebar";
import seedRouteTemplates from "../utils/seedRouteTemplates";

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

// ── Merge helper ─────────────────────────────────────────────────────────────
const mergeRouteData = (occurrence, templatesMap) => {
  const template = templatesMap[occurrence.templateId] || {};
  return {
    ...occurrence,
    name:          template.name          || "",
    dayOfWeek:     template.dayOfWeek     || "",
    source:        occurrence.overrideSource        || template.source        || "",
    destination:   occurrence.overrideDestination   || template.destination   || "",
    departureTime: occurrence.overrideDepartureTime || template.departureTime || "",
    arrivalTime:   occurrence.overrideArrivalTime   || template.arrivalTime   || "",
    vehicle:       occurrence.overrideVehicle       || template.vehicle       || "",
    driversNeeded: occurrence.overrideDriversNeeded || template.driversNeeded || 1,
  };
};

// ── Date helpers ───────────────────────────────────────────────────────────────
function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}
function getWeekRange() {
  const now = new Date();
  const end = new Date(now);
  end.setDate(now.getDate() + 6);
  return {
    start: now.toISOString().slice(0, 10),
    end:   end.toISOString().slice(0, 10),
  };
}
function getMonthRange() {
  const now = new Date();
  const start = now.toISOString().slice(0, 10);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { start, end };
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

export default function ManagerDelivery() {
  const navigate = useNavigate();
  const hasSeeded = useRef(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [period, setPeriod] = useState("today"); // 'today' | 'week' | 'month'
  const [templates,   setTemplates]   = useState({});
  const [occurrences, setOccurrences] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });

  // ── Seed route templates once per session ────────────────────────────────
  // hasSeeded ref prevents StrictMode's double-invoke from running the seed
  // twice, which would let both get() calls see an empty DB before either
  // set() completes, causing the second run to overwrite the first.
  useEffect(() => {
    if (hasSeeded.current) return;
    hasSeeded.current = true;
    seedRouteTemplates(db);
  }, []);

  // ── Firebase listeners ────────────────────────────────────────────────────
  useEffect(() => {
    return onValue(ref(db, "routeTemplates"), snap => {
      setTemplates(snap.val() || {});
    });
  }, []);

  useEffect(() => {
    return onValue(ref(db, "routeOccurrences"), snap => {
      const data = snap.val();
      setOccurrences(data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : []);
    });
  }, []);

  useEffect(() => {
    const unsub = onValue(ref(db, "volunteers"), (snap) => {
      const data = snap.val();
      if (data) {
        setDrivers(Object.values(data).filter(v => v.isDriver === true));
      } else {
        setDrivers([]);
      }
    });
    return () => unsub();
  }, []);

  // ── Filter and merge routes by period ────────────────────────────────────
  const today = getTodayStr();
  const week  = getWeekRange();
  const month = getMonthRange();

  const periodMerged = occurrences
    .filter(o => {
      if (!o.date) return false;
      if (period === "today") return o.date === today;
      if (period === "month") return o.date >= month.start && o.date <= month.end;
      return o.date >= week.start && o.date <= week.end;
    })
    .map(o => mergeRouteData(o, templates));

  const sortedRoutes = [...periodMerged].sort((a, b) =>
    (a.departureTime || "").localeCompare(b.departureTime || "")
  );

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalRoutes = periodMerged.length;
  const completed   = periodMerged.filter(r => r.status === "complete").length;
  const inProgress  = periodMerged.filter(r => r.status === "inProgress").length;
  const unassigned  = periodMerged.filter(r =>
    (!r.drivers || r.drivers.length === 0) && !r.isSpecial
  ).length;

  // ── Driver route counts ───────────────────────────────────────────────────
  function driverRouteCount(driverName, driverId) {
    return periodMerged.filter(r => {
      const drvs = Array.isArray(r.drivers) ? r.drivers : [];
      return drvs.includes(driverName) || drvs.includes(String(driverId));
    }).length;
  }

  // ── Period toggle ─────────────────────────────────────────────────────────
  const PeriodToggle = () => (
    <div className="flex gap-1">
      {[["today", "Today"], ["week", "This Week"], ["month", "This Month"]].map(([val, label]) => (
        <button key={val} onClick={() => setPeriod(val)}
          className={`rounded-full px-3 py-1 text-[12px] border-none cursor-pointer transition-colors ${
            period === val
              ? "bg-[#0d9488] text-white"
              : "bg-white border border-[#e5e7eb] text-[#6b7280]"
          }`}>
          {label}
        </button>
      ))}
    </div>
  );

  // ── Shared content sections ───────────────────────────────────────────────
  const StatsRow = () => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
      {[
        { label: "Total Routes",  value: totalRoutes, color: "#0d9488"  },
        { label: "Completed",     value: completed,   color: "#34c759"  },
        { label: "In Progress",   value: inProgress,  color: "#ff9500"  },
        { label: "Unassigned",    value: unassigned,  color: "#dc2626"  },
      ].map(s => (
        <div key={s.label} className="bg-white border border-[#e5e7eb] rounded-xl px-4 py-3 h-[80px] flex flex-col justify-center">
          <p className="text-[#6b7280] text-[12px] mb-1">{s.label}</p>
          <p className="text-[28px] font-semibold leading-none" style={{ color: s.color }}>{s.value}</p>
        </div>
      ))}
    </div>
  );

  const RouteOverview = () => (
    <div className="bg-white border border-[#e5e7eb] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[#0a2a3a] text-[15px] font-semibold">Route Overview</p>
        <button onClick={() => navigate("/manager-delivery-routes")}
          className="text-[#0d9488] text-[13px] bg-transparent border-none cursor-pointer hover:underline">
          View All
        </button>
      </div>

      {sortedRoutes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10">
          <Truck size={36} color="#ccedeb" />
          <p className="text-[#0a2a3a] text-[14px] font-medium mt-3">No routes for this period</p>
          <p className="text-[#6b7280] text-[12px] mt-1">Switch to Routes to add delivery routes</p>
        </div>
      ) : (
        <div>
          {sortedRoutes.slice(0, 5).map((route, i) => {
            const filled = Array.isArray(route.drivers) ? route.drivers.length : 0;
            const needed = route.driversNeeded || 1;
            const slotsFilled = filled >= needed;
            return (
              <div key={route.id}
                className={`py-3 flex items-center gap-3 ${i < Math.min(sortedRoutes.length, 5) - 1 ? "border-b border-[#f3f4f6]" : ""}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-[#0a2a3a] text-[13px] font-medium truncate">{route.name}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {route.departureTime && (
                      <span className="flex items-center gap-1 text-[#6b7280] text-[12px]">
                        <Clock size={12} />
                        {route.departureTime}
                      </span>
                    )}
                    {route.vehicle && (
                      <span className="flex items-center gap-1 text-[#6b7280] text-[12px]">
                        <Truck size={12} />
                        {route.vehicle}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`text-[12px] font-medium shrink-0 ${slotsFilled ? "text-[#0d9488]" : "text-[#dc2626]"}`}>
                  {filled}/{needed}
                </span>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-lg shrink-0 ${getStatusStyle(route.status)}`}>
                  {getStatusLabel(route.status)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const DriversSection = () => (
    <div className="bg-white border border-[#e5e7eb] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[#0a2a3a] text-[15px] font-semibold">Active Drivers</p>
        <button onClick={() => navigate("/manager-delivery-volunteers")}
          className="text-[#0d9488] text-[13px] bg-transparent border-none cursor-pointer hover:underline">
          Manage Drivers
        </button>
      </div>

      {drivers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <p className="text-[#6b7280] text-[13px]">No drivers added yet</p>
          <p className="text-[#6b7280] text-[12px] mt-1">Go to Drivers to add your first driver</p>
        </div>
      ) : (
        <div>
          {drivers.map((driver, i) => {
            const count = driverRouteCount(driver.name, driver.id);
            const initials = getInitials(driver.name);
            return (
              <div key={driver.id}
                className={`py-3 flex items-center gap-3 ${i < drivers.length - 1 ? "border-b border-[#f3f4f6]" : ""}`}>
                <div className="w-7 h-7 rounded-full bg-[#0d9488] flex items-center justify-center shrink-0">
                  <span className="text-white text-[10px] font-semibold">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#0a2a3a] text-[13px] font-medium">{driver.name}</p>
                  <p className="text-[#6b7280] text-[12px]">{count > 0 ? `${count} route${count !== 1 ? "s" : ""}` : "No routes"}</p>
                </div>
                <span className="bg-[#ccedeb] text-[#09665e] text-[11px] px-2 py-0.5 rounded-full shrink-0">
                  Driver
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f5f5f5]"
      style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* ══════════════════════════════════════════════════════════════════════
          MOBILE LAYOUT
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden min-h-screen flex flex-col">

        {/* Mobile top bar */}
        <div className="bg-[#0a2a3a] px-4 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <p className="text-[#0d9488] text-[10px] uppercase tracking-widest">Operations Manager</p>
            <p className="text-white text-[18px] font-semibold leading-tight">Delivery Dashboard</p>
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
                <button onClick={() => setMobileMenuOpen(false)} className="text-white p-1 bg-transparent border-none cursor-pointer">
                  <X size={24} />
                </button>
              </div>
              <div className="w-10 h-0.5 bg-[#0d9488] mx-8 mb-2" />
              {/* Mode toggle — Delivery active */}
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
                  { label: "Dashboard",  active: true,  action: () => {} },
                  { label: "Routes",     active: false, action: () => navigate("/manager-delivery-routes") },
                  { label: "Drivers",    active: false, action: () => navigate("/manager-delivery-volunteers") },
                  { label: "History",    active: false, action: () => {} },
                ].map(item => (
                  <button key={item.label}
                    onClick={() => { item.action(); setMobileMenuOpen(false); }}
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
        <div className="px-4 py-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-[#0a2a3a] text-[14px] font-semibold">{todayStr}</p>
            <PeriodToggle />
          </div>
          <StatsRow />
          <RouteOverview />
          <DriversSection />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          DESKTOP LAYOUT
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex min-h-screen">

        <Sidebar mode="delivery" activePath="/manager-delivery" />

        {/* Main content */}
        <div className="ml-[220px] flex-1 flex flex-col min-h-screen">

          {/* Top bar */}
          <div className="bg-white border-b border-[#e5e7eb] h-16 flex items-center justify-between px-6 sticky top-0 z-10">
            <div>
              <p className="text-[#0d9488] text-[10px] uppercase tracking-widest">Operations Manager</p>
              <h1 className="text-[22px] font-semibold text-[#0a2a3a] tracking-tight leading-tight">Delivery Dashboard</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[#6b7280] text-[13px]">{todayStr}</span>
              <PeriodToggle />
            </div>
          </div>

          {/* Page content */}
          <div className="p-6 flex flex-col gap-5">
            <StatsRow />
            <div className="grid grid-cols-2 gap-5">
              <RouteOverview />
              <DriversSection />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
