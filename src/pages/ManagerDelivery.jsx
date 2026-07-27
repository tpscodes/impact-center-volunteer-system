// ManagerDelivery.jsx — Delivery Dashboard (landing screen for Delivery mode)
// Migrated to routeTemplates/ + routeOccurrences/ — deliveryRoutes/ deprecated
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { X, Clock, Truck } from "lucide-react";
import MobileNav from "../components/MobileNav";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import SidebarLiquid from "../components/SidebarLiquid";
import DeliveryHero from "../components/DeliveryHero";
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
  const [mobileTodayFilter, setMobileTodayFilter] = useState('All');
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
    { label: "Unassigned",   value: unassigned,  accent: "neutral",  chart: null, delta: null },
  ];

  const BARS = [11, 18, 14, 25, 21, 32];
  const heroSections = [
    { label: "Total Routes", chipTone: "brand",     value: totalRoutes, delta: totalRoutes === 0 ? "no routes this period"  : undefined, bars: BARS },
    { label: "Completed",    chipTone: "complete",   value: completed,   delta: completed   === 0 ? "no completions yet"      : undefined, bars: BARS },
    { label: "In Progress",  chipTone: "progress",   value: inProgress,  delta: inProgress  === 0 ? "none active"             : undefined, bars: BARS },
    { label: "Unassigned",   chipTone: "available",  value: unassigned,  delta: unassigned  === 0 ? "fully staffed"           : undefined, bars: BARS },
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
          <Truck size={40} color="#FF9500" style={{ marginBottom: 12 }} />
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
                className={`flex items-center gap-3 py-[10px] rounded-[14px] transition-colors hover:bg-[#D3EDE9] ${
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
    <div className="min-h-screen bg-[#D3EDE9]"
      style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* ══════════════════════════════════════════════════════════════════════
          MOBILE LAYOUT
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden min-h-screen bg-[#D3EDE9]"
        style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

        {/* Gradient hero */}
        <div style={{
          background: 'linear-gradient(144.76deg, #0f7a70 14.286%, #0a2a3a 85.714%)',
          borderRadius: '0 0 28px 28px',
          color: '#fff',
        }}>
          <MobileNav mode="delivery" />
          <div style={{ padding: '12px 20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Pill row */}
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold px-3.5 py-1.5 rounded-full"
              style={{ background: 'rgba(255,255,255,.9)', color: '#09665E' }}>Active Routes</span>
            <span className="text-[14px]" style={{ color: 'rgba(255,255,255,.72)' }}>{drivers.length} Drivers active</span>
          </div>

          {/* Big number + signal bars */}
          <div className="flex items-end justify-between">
            <div>
              <p className="m-0 text-[56px] leading-[1]" style={{ fontWeight: 700 }}>{inProgress}</p>
              <p className="m-0 text-[14px] mt-0.5" style={{ color: 'rgba(255,255,255,.72)' }}>Routes</p>
            </div>
            <div className="flex items-end gap-[3px]" style={{ height: 32 }}>
              {[10, 16, 22, 32].map((h, i) => (
                <span key={i} style={{ width: 6, height: h, borderRadius: 2, background: '#0D9488', display: 'block' }} />
              ))}
            </div>
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,.18)' }} />

          {/* Sub-stats */}
          <div className="flex gap-4">
            <div className="flex-1 flex flex-col gap-1.5 pr-4" style={{ borderRight: '1px solid rgba(255,255,255,.18)' }}>
              <p className="m-0 text-[26px]" style={{ fontWeight: 700 }}>{totalRoutes}</p>
              <p className="m-0 text-[12.5px]" style={{ color: 'rgba(255,255,255,.72)' }}>Total Routes</p>
            </div>
            <div className="flex-1 flex flex-col gap-1.5 pl-4">
              <p className="m-0 text-[26px]" style={{ fontWeight: 700 }}>{unassigned}</p>
              <p className="m-0 text-[12.5px]" style={{ color: 'rgba(255,255,255,.72)' }}>Unclaimed</p>
            </div>
          </div>
          </div>{/* /inner padding */}
        </div>

        {/* Action buttons */}
        <div className="flex gap-[9px] px-3 mt-[15px]">
          <button onClick={() => navigate('/manager-delivery-routes')}
            className="flex-1 h-12 rounded-full text-[14px] font-semibold text-white border-none cursor-pointer flex items-center justify-center"
            style={{ background: '#0F7A70' }}>
            + Create Route
          </button>
          <button
            className="flex-1 h-12 rounded-full text-[14px] font-semibold text-white border-none cursor-pointer flex items-center justify-center"
            style={{ background: '#0D9488' }}>
            Start Session
          </button>
        </div>

        {/* Active Routes card */}
        <div className="mx-3 mt-[15px] mb-6 bg-white border border-[#E5E7EB] rounded-[20px] p-6 flex flex-col gap-5"
          style={{ boxShadow: '0 8px 20px rgba(10,42,58,.05)' }}>
          <div className="flex items-center justify-between">
            <h2 className="m-0 text-[21px] font-semibold text-[#0A2A3A]">Active Routes</h2>
            <button onClick={() => navigate('/manager-delivery-routes')}
              className="text-[12px] font-medium text-[#565E6C] bg-transparent border-none cursor-pointer p-0">
              View all
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {['All', 'Morning', 'Afternoon'].map(f => (
              <button key={f} onClick={() => setMobileTodayFilter(f)}
                className="h-9 px-4 rounded-full text-[13px] cursor-pointer border-none"
                style={mobileTodayFilter === f
                  ? { background: '#0A2A3A', color: '#fff', fontWeight: 600 }
                  : { background: '#fff', border: '1px solid #E5E7EB', color: '#6B7280', fontWeight: 500 }}>
                {f}
              </button>
            ))}
          </div>

          <div className="flex flex-col">
            {(() => {
              const filtered = sortedRoutes.filter(r => {
                if (mobileTodayFilter === 'All') return true;
                const t = r.departureTime || '';
                const m = t.match(/(\d+)(?::(\d+))?\s*(am|pm)/i);
                if (!m) return false;
                let h = +m[1];
                if (/pm/i.test(m[3]) && h < 12) h += 12;
                if (/am/i.test(m[3]) && h === 12) h = 0;
                return (h < 12 ? 'Morning' : 'Afternoon') === mobileTodayFilter;
              });
              if (filtered.length === 0) return (
                <p className="m-0 text-center text-[#9ca3af] text-[14px] py-6">No routes for this filter</p>
              );
              return filtered.map((r, i) => (
                <div key={r.id}
                  className="flex items-center gap-4 py-3.5 pl-3.5 pr-5 rounded-[15px]"
                  style={i % 2 === 0 ? { background: '#D3EDE9' } : {}}>
                  <div className="flex items-center justify-center shrink-0"
                    style={{ width: 40, height: 41, borderRadius: 8, background: '#0F7A70' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M1.5 6H14V16H1.5V6Z" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/>
                      <path d="M14 9H18.5L22 12.5V16H14V9Z" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/>
                      <circle cx="6.5" cy="18" r="1.9" stroke="white" strokeWidth="1.6"/>
                      <circle cx="17.5" cy="18" r="1.9" stroke="white" strokeWidth="1.6"/>
                    </svg>
                  </div>
                  <p className="flex-1 min-w-0 m-0 text-[12px] font-medium text-[#0A2A3A] truncate">{r.name}</p>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[12px] font-semibold px-3 py-0.5 rounded-full"
                      style={r.status === 'inProgress'
                        ? { background: '#FFF3E0', color: '#9A5000' }
                        : { background: '#E6E6E6', color: '#4B5563' }}>
                      {r.status === 'inProgress' ? 'In Progress' : 'Available'}
                    </span>
                    <span className="text-[12px] text-[#0A2A3A]">{r.departureTime || ''}</span>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TABLET LAYOUT
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex xl:hidden min-h-screen">

        <SidebarLiquid mode="delivery" />

        <div className="lg:ml-[var(--sidebar-w)] flex-1 flex flex-col min-h-screen">
          <div className="px-6 pt-5 pb-3">
            <PageHeader
              initials={initials}
              label="Dashboard"
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
          <div className="p-6 flex flex-col gap-5">
            <DeliveryHero sections={heroSections} />
            <div className="grid grid-cols-2 gap-5">
              <RouteOverview />
              <DriversSection />
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          DESKTOP LAYOUT
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden xl:flex min-h-screen">

        <SidebarLiquid mode="delivery" />

        {/* Main content */}
        <div className="xl:ml-[var(--sidebar-w)] flex-1 flex flex-col min-h-screen">

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
            <DeliveryHero sections={heroSections} />
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
