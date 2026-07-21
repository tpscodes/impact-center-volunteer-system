// ManagerDelivery.jsx — Delivery Dashboard (landing screen for Delivery mode)
// Migrated to routeTemplates/ + routeOccurrences/ — deliveryRoutes/ deprecated
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, Clock, Truck } from "lucide-react";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import Sidebar from "../components/Sidebar";
import PageHeader from "../components/PageHeader";
import StatCards from "../components/StatCards";
import seedRouteTemplates from "../utils/seedRouteTemplates";
import { useAuth } from "../contexts/AuthContext";

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

// ── Shared card-header: title left + quiet teal link right ────────────────────
function CardHead({ title, linkLabel, onClick }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <p className="text-[#0a2a3a] text-[17px] font-semibold leading-[22px]">{title}</p>
      {linkLabel && (
        <button
          type="button"
          onClick={onClick}
          className="text-[#09665e] text-[14px] font-medium bg-transparent border-none
            cursor-pointer p-0 hover:opacity-70 transition-opacity"
        >
          {linkLabel}
        </button>
      )}
    </div>
  );
}

export default function ManagerDelivery() {
  const navigate = useNavigate();
  const { pantryId, displayName, initials, logout } = useAuth();
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
  useEffect(() => {
    if (hasSeeded.current) return;
    hasSeeded.current = true;
    seedRouteTemplates(db, pantryId);
  }, [pantryId]);

  // ── Firebase listeners ────────────────────────────────────────────────────
  useEffect(() => {
    return onValue(ref(db, `pantries/${pantryId}/routeTemplates`), snap => {
      setTemplates(snap.val() || {});
    });
  }, [pantryId]);

  useEffect(() => {
    return onValue(ref(db, `pantries/${pantryId}/routeOccurrences`), snap => {
      const data = snap.val();
      setOccurrences(data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : []);
    });
  }, [pantryId]);

  useEffect(() => {
    const unsub = onValue(ref(db, 'volunteers'), (snap) => {
      const data = snap.val();
      if (data) {
        setDrivers(Object.values(data).filter(v => v.isDriver === true));
      } else {
        setDrivers([]);
      }
    });
    return () => unsub();
  }, [pantryId]);

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

  const deliveryCards = [
    { label: "Total Routes", value: totalRoutes, accent: "brand",    chart: null, delta: null },
    { label: "Completed",    value: completed,   accent: "complete", chart: null, delta: null },
    { label: "In Progress",  value: inProgress,  accent: "progress", chart: null, delta: null },
    { label: "Unassigned",   value: unassigned,  accent: "danger",   chart: null, delta: null },
  ];

  // ── Driver route counts ───────────────────────────────────────────────────
  function driverRouteCount(driverName, driverId) {
    return periodMerged.filter(r => {
      const drvs = Array.isArray(r.drivers) ? r.drivers : [];
      return drvs.includes(driverName) || drvs.includes(String(driverId));
    }).length;
  }

  // ── Period toggle (mobile only) ───────────────────────────────────────────
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

  // ── Route Overview card ───────────────────────────────────────────────────
  const RouteOverview = () => (
    <div className="bg-white border border-[#e5e7eb] rounded-[20px] p-[22px] min-h-[320px] flex flex-col">
      <CardHead
        title="Route Overview"
        linkLabel="View All"
        onClick={() => navigate("/manager-delivery-routes")}
      />

      {sortedRoutes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-1">
          <Truck size={40} color="#E6F5F3" style={{ marginBottom: 12 }} />
          <p className="text-[#0a2a3a] text-[15px] font-semibold">No routes for this period</p>
          <p className="text-[#6b7280] text-[14px]">Switch to Routes to add delivery routes</p>
        </div>
      ) : (
        <div className="flex-1">
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

  // ── Active Drivers card ───────────────────────────────────────────────────
  const DriversSection = () => (
    <div className="bg-white border border-[#e5e7eb] rounded-[20px] p-[22px] min-h-[320px] flex flex-col">
      <CardHead
        title="Active Drivers"
        linkLabel="Manage Drivers"
        onClick={() => navigate("/manager-delivery-volunteers")}
      />

      {drivers.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-1">
          <p className="text-[#0a2a3a] text-[15px] font-semibold">No drivers added yet</p>
          <p className="text-[#6b7280] text-[14px]">Go to Drivers to add your first driver</p>
        </div>
      ) : (
        <div>
          {drivers.map((driver, i) => {
            const count = driverRouteCount(driver.name, driver.id);
            const driverInitials = getInitials(driver.name);
            return (
              <div key={driver.id}
                className={`flex items-center gap-3 py-[10px] rounded-[14px] transition-colors hover:bg-[#f5f5f5] ${
                  i < drivers.length - 1 ? "border-b border-[#f3f4f6]" : ""
                }`}>
                {/* 40px solid teal avatar — light-surface variant */}
                <div className="w-10 h-10 rounded-full bg-[#0d9488] flex items-center justify-center shrink-0">
                  <span className="text-white text-[13px] font-semibold leading-none">{driverInitials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#0a2a3a] text-[14px] font-medium leading-[18px]">{driver.name}</p>
                  <p className="text-[#6b7280] text-[13px] leading-[16px] mt-0.5">
                    {count > 0 ? `${count} route${count !== 1 ? "s" : ""}` : "No routes"}
                  </p>
                </div>
                {/* Driver tag — teal-100 bg / teal-700 fg */}
                <span className="bg-[#E6F5F3] text-[#09665E] text-[12px] font-semibold px-3 py-[3px] rounded-full shrink-0">
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

        {/* Mobile nav overlay */}
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
                  { label: "Dashboard", path: "/manager-delivery",            active: true  },
                  { label: "Routes",    path: "/manager-delivery-routes",     active: false },
                  { label: "Drivers",   path: "/manager-delivery-volunteers", active: false },
                  { label: "History",   path: "/manager-delivery-history",    active: false },
                ].map(item => (
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

        {/* Mobile page title */}
        <div className="lg:hidden px-4 pt-5 pb-3">
          <p className="text-[#0d9488] text-[10px] uppercase tracking-widest mb-0.5">Operations Manager</p>
          <h1 className="text-[22px] font-semibold text-[#0a2a3a] tracking-tight">Delivery Dashboard</h1>
        </div>

        {/* Mobile content */}
        <div className="px-4 py-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-[#0a2a3a] text-[14px] font-semibold">{todayStr}</p>
            <PeriodToggle />
          </div>
          <StatCards cards={deliveryCards} cols={4} />
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
        <div className="lg:ml-[var(--sidebar-w)] flex-1 flex flex-col min-h-screen">

          {/* Pill header */}
          <div className="px-6 pt-5 pb-3">
            <PageHeader
              initials={initials}
              label="Delivery Dashboard"
              right={
                <div className="ph-time-range">
                  {[["today","Today"],["week","This Week"],["month","This Month"]].map(([val, lbl]) => (
                    <button key={val} type="button"
                      className="ph-time-range__option"
                      aria-pressed={period === val}
                      onClick={() => setPeriod(val)}>
                      {lbl}
                    </button>
                  ))}
                </div>
              }
            />
          </div>

          {/* Page content */}
          <div className="p-6 flex flex-col gap-5">
            <StatCards cards={deliveryCards} cols={4} />
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
