// ManagerDeliveryHistory.jsx — Completed delivery routes log
//
// [ASK] Are history entries meant to be clickable (view full delivery record, docs, etc.)?
// Currently built as plain non-interactive display rows. If they should be interactive,
// they need <button> semantics and focus-visible states — left unbuilt rather than
// guess at an interaction that wasn't specified.

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SidebarLiquid from "../components/SidebarLiquid";
import PageHeader from "../components/PageHeader";
import DeliveryHero from "../components/DeliveryHero";
import { Search, Clock, MapPin, Truck, Calendar, X, Menu } from "lucide-react";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import { useAuth } from "../contexts/AuthContext";

// ── Helpers ───────────────────────────────────────────────────────────────────
function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getWeekRange() {
  const now = new Date();
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { start: mon.toISOString().slice(0, 10), end: sun.toISOString().slice(0, 10) };
}

function getMonthRange() {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
    end:   new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
  };
}

function formatDateShort(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

function formatTime(t) {
  if (!t) return "";
  if (/AM|PM/i.test(t)) return t;
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function getDateGroupLabel(dateStr) {
  const today = getTodayStr();
  const yd    = new Date(today + "T12:00:00");
  yd.setDate(yd.getDate() - 1);
  const yesterday = yd.toISOString().slice(0, 10);
  if (dateStr === today)     return "Today";
  if (dateStr === yesterday) return "Yesterday";
  return formatDateShort(dateStr);
}

function driverNames(driversField) {
  if (!driversField) return [];
  if (Array.isArray(driversField)) return driversField.filter(Boolean);
  if (typeof driversField === "object") return Object.values(driversField).filter(Boolean);
  return [];
}

// ── Desktop history entry — divider row inside a list-card ────────────────────
// NOT individually bordered/shadowed — one list-card wraps an entire date group.
function HistoryEntry({ route, isLast }) {
  const drivers = driverNames(route.drivers);

  return (
    <div style={{
      padding: "18px 24px",
      borderBottom: isLast ? 0 : "1px solid #e5e7eb",
      transition: "background 120ms",
    }}
      onMouseEnter={e => e.currentTarget.style.background = "#f5f5f5"}
      onMouseLeave={e => e.currentTarget.style.background = ""}
    >
      {/* Row 1 — route name + Complete pill */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <span style={{ font: "600 15px/20px Inter, sans-serif", color: "#0a2a3a" }}>
          {route.name}
        </span>
        <span style={{
          display: "inline-flex", padding: "3px 12px", borderRadius: 9999, whiteSpace: "nowrap",
          background: "#F0FFF4", color: "#15703C", font: "600 12px/17px Inter, sans-serif",
        }}>
          Complete
        </span>
      </div>

      {/* Row 2 — pickup → dropoff */}
      {(route.source || route.destination) && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8,
                      font: "400 13px/18px Inter, sans-serif", color: "#6b7280" }}>
          <MapPin size={13} style={{ flexShrink: 0, color: "#6b7280" }} />
          <span>{route.source || "—"}&nbsp;→&nbsp;{route.destination || "—"}</span>
        </div>
      )}

      {/* Row 3 — date · time · vehicle */}
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 8, flexWrap: "wrap" }}>
        {route.date && (
          <span style={{ display: "flex", alignItems: "center", gap: 5,
                         font: "400 13px/18px Inter, sans-serif", color: "#0a2a3a" }}>
            <Calendar size={13} style={{ flexShrink: 0, color: "#6b7280" }} />
            {formatDateShort(route.date)}
          </span>
        )}
        {route.departureTime && (
          <span style={{ display: "flex", alignItems: "center", gap: 5,
                         font: "400 13px/18px Inter, sans-serif", color: "#0a2a3a" }}>
            <Clock size={13} style={{ flexShrink: 0, color: "#6b7280" }} />
            {formatTime(route.departureTime)}
          </span>
        )}
        {route.vehicle && (
          <span style={{ display: "flex", alignItems: "center", gap: 5,
                         font: "400 13px/18px Inter, sans-serif", color: "#0a2a3a" }}>
            <Truck size={13} style={{ flexShrink: 0, color: "#6b7280" }} />
            {route.vehicle}
          </span>
        )}
      </div>

      {/* Row 4 — driver tags */}
      {drivers.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {drivers.map((name, i) => (
            <span key={i} style={{
              display: "inline-flex", padding: "3px 12px", borderRadius: 9999,
              background: "#E6F5F3", color: "#09665e", font: "600 12px/16px Inter, sans-serif",
            }}>
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Mobile history card — individual bordered card (better on touch) ───────────
function HistoryCard({ route }) {
  const drivers = driverNames(route.drivers);

  return (
    <div className="bg-white border border-[#e5e7eb] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[#0a2a3a] text-[14px] font-semibold truncate mr-3">{route.name}</p>
        <span className="bg-[#F0FFF4] text-[#15703C] text-[11px] px-2.5 py-0.5 rounded-full shrink-0 font-semibold">
          Complete
        </span>
      </div>
      {(route.source || route.destination) && (
        <div className="flex items-center gap-1 mb-1.5 flex-wrap">
          <MapPin size={13} className="text-[#6b7280] shrink-0" />
          <span className="text-[#6b7280] text-[12px]">{route.source || "—"}</span>
          <span className="text-[#6b7280] text-[12px] mx-0.5">→</span>
          <span className="text-[#6b7280] text-[12px]">{route.destination || "—"}</span>
        </div>
      )}
      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mb-2">
        {route.date && (
          <div className="flex items-center gap-1">
            <Calendar size={13} className="text-[#6b7280] shrink-0" />
            <span className="text-[#6b7280] text-[12px]">{formatDateShort(route.date)}</span>
          </div>
        )}
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
      {drivers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {drivers.map((name, i) => (
            <span key={i} className="bg-[#E6F5F3] text-[#09665e] text-[11px] px-2.5 py-0.5 rounded-full font-semibold">
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
  const { pantryId, displayName, initials, logout } = useAuth();

  const [routes,         setRoutes]         = useState([]);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [fromDate,       setFromDate]       = useState("");
  const [toDate,         setToDate]         = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    return onValue(ref(db, `pantries/${pantryId}/routeHistory`), snap => {
      const data = snap.val();
      setRoutes(data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : []);
    });
  }, [pantryId]);

  // CRITICAL: sort most-recent-first BEFORE grouping. The grouping logic only opens a
  // new date header when the date changes — if entries are out of order a single date's
  // entries will scatter across multiple groups instead of merging into one.
  const completed = [...routes].sort((a, b) =>
    (b.date || "").localeCompare(a.date || "") || (b.departureTime || "").localeCompare(a.departureTime || "")
  );

  const todayStr = getTodayStr();
  const completedToday   = completed.filter(r => r.date === todayStr).length;
  const uniqueDriverCount = new Set(completed.flatMap(r => driverNames(r.drivers))).size;

  const BARS = [11, 18, 14, 25, 21, 32];
  const heroSections = [
    { label: "Tasks Completed Today", chipTone: "complete", value: completedToday,     bars: BARS },
    { label: "Total Sessions",        chipTone: "brand",    value: completed.length                },
    { label: "Drivers Participated",  chipTone: "progress", value: uniqueDriverCount               },
  ];

  const filtersActive = searchQuery.trim() !== "" || fromDate !== "" || toDate !== "";
  const filtered = completed.filter(r => {
    if (fromDate && r.date < fromDate) return false;
    if (toDate   && r.date > toDate)   return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!r.name?.toLowerCase().includes(q) && !driverNames(r.drivers).some(n => n.toLowerCase().includes(q)))
        return false;
    }
    return true;
  });

  // Group by date — works correctly because filtered is already sorted most-recent-first
  const groups = [];
  for (const route of filtered) {
    const last = groups[groups.length - 1];
    if (last && last.date === route.date) last.routes.push(route);
    else groups.push({ date: route.date, routes: [route] });
  }

  function clearFilters() {
    setSearchQuery("");
    setFromDate("");
    setToDate("");
  }

  const MOBILE_NAV = [
    { label: "Dashboard", path: "/manager-delivery",            active: false },
    { label: "Routes",    path: "/manager-delivery-routes",     active: false },
    { label: "Drivers",   path: "/manager-delivery-volunteers", active: false },
    { label: "History",   path: "/manager-delivery-history",    active: true  },
  ];

  // Controls row — shared between desktop and mobile
  const ControlsRow = ({ className = "" }) => (
    <div className={`flex gap-3 flex-wrap items-center ${className}`}>
      {/* Search */}
      <label className="flex items-center gap-[10px] flex-1 min-w-[240px] h-[44px] px-[14px]
                        border border-[#e5e7eb] rounded-[12px] bg-white
                        transition-colors focus-within:border-[#09665e]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="1.8" strokeLinecap="round" className="text-[#6b7280] shrink-0" aria-hidden="true">
          <circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
        </svg>
        <input
          type="text"
          placeholder="Search by route or driver..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="flex-1 border-0 outline-0 bg-transparent text-[14px] leading-[20px]
                     text-[#0a2a3a] placeholder:text-[#6b7280]"
        />
      </label>

      {/* From date */}
      <input
        type="date"
        aria-label="From date"
        value={fromDate}
        onChange={e => setFromDate(e.target.value)}
        className="h-[44px] px-[14px] border border-[#e5e7eb] rounded-[12px] bg-white
                   text-[14px] text-[#0a2a3a] focus:outline-none focus:border-[#09665e]
                   transition-colors"
      />

      {/* To date */}
      <input
        type="date"
        aria-label="To date"
        value={toDate}
        onChange={e => setToDate(e.target.value)}
        className="h-[44px] px-[14px] border border-[#e5e7eb] rounded-[12px] bg-white
                   text-[14px] text-[#0a2a3a] focus:outline-none focus:border-[#09665e]
                   transition-colors"
      />

      {filtersActive && (
        <button onClick={clearFilters}
          className="text-[#09665e] text-[13px] font-medium bg-transparent border-none
                     cursor-pointer hover:opacity-70 shrink-0">
          Clear
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════════════
          MOBILE LAYOUT
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden min-h-screen bg-[#D3EDE9] flex flex-col"
        style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>

        {/* ── Gradient hero ─────────────────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(144.76deg, #0f7a70 14.286%, #0a2a3a 85.714%)',
          borderRadius: '0 0 28px 28px',
          padding: '20px 20px 24px',
          display: 'flex', flexDirection: 'column', gap: 20, color: '#fff',
        }}>
          {/* Topbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setMobileMenuOpen(o => !o)}
              style={{
                width: 40, height: 40, borderRadius: 12, border: 'none', cursor: 'pointer',
                background: 'rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
              <Menu size={18} color="#fff" />
            </button>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 600, lineHeight: '20px', color: '#fff' }}>History</p>
              <p style={{ margin: 0, fontSize: 12, lineHeight: '16px', color: 'rgba(255,255,255,.66)' }}>Operations Manager</p>
            </div>
            <button onClick={() => setMobileMenuOpen(o => !o)}
              style={{
                width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: '#1B4256', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{initials}</span>
            </button>
          </div>

          {/* Dual stats */}
          <div style={{ display: 'flex', gap: 32 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 999, width: 'fit-content', background: '#E6F5F3', color: '#09665E' }}>
                Routes
              </span>
              <p style={{ margin: 0, fontSize: 44, fontWeight: 600, lineHeight: '44px', color: '#fff' }}>{completed.length}</p>
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,.7)' }}>Total routes completed</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 999, width: 'fit-content', background: '#E6F5F3', color: '#09665E' }}>
                Sessions
              </span>
              <p style={{ margin: 0, fontSize: 44, fontWeight: 600, lineHeight: '44px', color: '#fff' }}>{groups.length}</p>
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,.7)' }}>Total Sessions</p>
            </div>
          </div>
        </div>

        {/* ── History card ──────────────────────────────────────────────────── */}
        <div style={{
          margin: '15px 20px 32px', background: '#fff', borderRadius: 20,
          border: '1px solid #E5E7EB', padding: '20px 20px 12px',
          boxShadow: '0 8px 20px rgba(10,42,58,.05)',
        }}>
          {/* Card header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 21, fontWeight: 600, color: '#0A2A3A' }}>History</h2>
            <button style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
              height: 40, width: 109, padding: '0 14px',
              border: '1px solid #E5E7EB', borderRadius: 10, background: '#fff', cursor: 'default',
              fontSize: 14, color: '#0A2A3A',
            }}>
              <span>All Time</span>
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M1 1l4 4 4-4"/>
              </svg>
            </button>
          </div>

          {/* Route rows */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {completed.length === 0 ? (
              <p style={{ margin: 0, textAlign: 'center', color: '#9CA3AF', fontSize: 14, padding: '24px 0' }}>
                No completed routes
              </p>
            ) : (
              completed.map((route, i) => (
                <div key={route.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', borderRadius: 15,
                    background: i % 2 === 0 ? '#D3EDE9' : 'transparent',
                  }}>
                  {/* Custom truck icon */}
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: '#0F7A70', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="24" height="18" viewBox="0 0 24 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1.5 6H14V16H1.5V6Z" fill="white" stroke="white" strokeWidth="0.5" strokeLinejoin="round"/>
                      <path d="M14 9H18.5L22 12.5V16H14V9Z" fill="white" stroke="white" strokeWidth="0.5" strokeLinejoin="round"/>
                      <circle cx="6.5" cy="18" r="1.9" fill="#0F7A70" stroke="white" strokeWidth="1.2"/>
                      <circle cx="17.5" cy="18" r="1.9" fill="#0F7A70" stroke="white" strokeWidth="1.2"/>
                    </svg>
                  </div>
                  {/* Route name */}
                  <p style={{ flex: 1, margin: 0, fontSize: 12, fontWeight: 500, color: '#0A2A3A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {templates[route.templateId]?.name || route.name || '—'}
                  </p>
                  {/* Date */}
                  <span style={{ fontSize: 13, color: '#0A2A3A', flexShrink: 0 }}>
                    {route.date
                      ? new Date(route.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                      : '—'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Left-side slide-in drawer ─────────────────────────────────────── */}
        {mobileMenuOpen && (
          <>
            <div
              onClick={() => setMobileMenuOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(0,0,0,.45)' }}
            />
            <div style={{
              position: 'fixed', top: 0, left: 0, bottom: 0, width: 300, maxWidth: '82vw',
              background: '#09665E', borderRadius: '0 27px 27px 0', zIndex: 50,
              display: 'flex', flexDirection: 'column', padding: '20px 0 24px',
            }}>
              {/* X close */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 20px 16px' }}>
                <button onClick={() => setMobileMenuOpen(false)}
                  style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={16} color="#fff" />
                </button>
              </div>
              {/* Profile block */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px 20px', borderBottom: '1px solid rgba(255,255,255,.12)' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#1B4256', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>{initials}</span>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#fff' }}>{displayName}</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,.6)' }}>Operations Manager</p>
                </div>
              </div>
              {/* Mode toggle */}
              <div style={{ display: 'flex', gap: 4, margin: '16px 20px', padding: 4, background: 'rgba(255,255,255,.12)', borderRadius: 22 }}>
                <button onClick={() => { setMobileMenuOpen(false); navigate('/manager/dashboard'); }}
                  style={{ flex: 1, height: 36, borderRadius: 18, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: 'transparent', color: 'rgba(255,255,255,.66)' }}>
                  Pantry
                </button>
                <button style={{ flex: 1, height: 36, borderRadius: 18, border: 'none', cursor: 'default', fontSize: 13, fontWeight: 600, background: '#0A2A3A', color: '#fff' }}>
                  Delivery
                </button>
              </div>
              {/* Nav list */}
              <nav style={{ display: 'flex', flexDirection: 'column', padding: '0 8px', flex: 1 }}>
                {[
                  { label: 'Overview', path: '/manager-delivery',            active: false },
                  { label: 'Routes',   path: '/manager-delivery-routes',     active: false },
                  { label: 'Drivers',  path: '/manager-delivery-volunteers', active: false },
                  { label: 'History',  path: '/manager-delivery-history',    active: true  },
                  { label: 'Settings', path: '/manager-settings',            active: false },
                ].map(item => (
                  <button key={item.label}
                    onClick={() => { setMobileMenuOpen(false); if (!item.active) navigate(item.path); }}
                    style={{
                      display: 'flex', alignItems: 'center', width: '100%', height: 49,
                      padding: '0 16px', borderRadius: 26, border: 'none', cursor: 'pointer',
                      fontSize: 15, textAlign: 'left',
                      background: item.active ? '#fff' : 'transparent',
                      color: item.active ? '#0A2A3A' : 'rgba(255,255,255,.82)',
                      fontWeight: item.active ? 600 : 500,
                    }}>
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TABLET LAYOUT
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex xl:hidden min-h-screen bg-[#D3EDE9]"
        style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>

        <SidebarLiquid mode="delivery" />

        <div className="lg:ml-[var(--sidebar-w)] flex-1 flex flex-col min-h-screen">
          <div className="px-6 pt-5 pb-3">
            <PageHeader initials={initials} label="History" />
          </div>
          <div className="px-6 pb-8">
            <div className="bg-white border border-[#e5e7eb] rounded-[20px] p-6 flex flex-col gap-4"
              style={{ boxShadow: "0 8px 20px rgba(10,42,58,.05)" }}>
              {/* Card header */}
              <div className="flex items-center justify-between">
                <h2 className="m-0 text-[21px] font-semibold text-[#0a2a3a] leading-7">Completed Routes</h2>
                <div className="flex items-center justify-between gap-2 h-10 w-[140px] rounded-[10px] border border-[#e5e7eb] px-[14px] text-[14px] text-[#0a2a3a] bg-white cursor-default select-none">
                  <span>All Time</span>
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 1l4 4 4-4"/></svg>
                </div>
              </div>

              {/* Date-grouped entries */}
              {filtered.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center gap-2">
                  <Clock size={36} className="text-[#E6F5F3]" />
                  <p className="text-[#0a2a3a] text-[15px] font-semibold">No completed routes yet</p>
                  <p className="text-[#6b7280] text-[13px]">Completed delivery routes will appear here</p>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {groups.map(group => (
                    <div key={group.date} className="flex flex-col gap-2">
                      <p className="m-0 text-[12px] font-semibold text-[#09665e] uppercase tracking-[.3px]">
                        {getDateGroupLabel(group.date)}
                      </p>
                      <div className="bg-white border border-[#e5e7eb] rounded-[20px] overflow-hidden"
                        style={{ boxShadow: "0 8px 20px rgba(10,42,58,.05)" }}>
                        {group.routes.map((route, i) => (
                          <HistoryEntry key={route.id} route={route} isLast={i === group.routes.length - 1} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          DESKTOP LAYOUT
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden xl:flex min-h-screen bg-[#D3EDE9]"
        style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>

        <SidebarLiquid mode="delivery" />

        <div className="xl:ml-[var(--sidebar-w)] flex-1 flex flex-col min-h-screen">

          <div className="px-6 pt-5 pb-3">
            <PageHeader initials={initials} label="Delivery History" />
          </div>

          <div className="px-6 pb-6 flex flex-col gap-5">

            {/* Gradient hero — DeliveryHero with chart-removal rule applied:
                only "Tasks Completed Today" gets bars; the other two are all-time
                cumulative counts — sparklines would imply a trend that doesn't exist. */}
            <DeliveryHero sections={heroSections} />

            {/* Controls — search + date range */}
            <ControlsRow />

            {/* History list — ONE list-card per date group, entries as divider rows */}
            {filtered.length === 0 ? (
              <div style={{
                background: "#fff", border: "1px solid #e5e7eb", borderRadius: 20,
                boxShadow: "0 1px 2px rgba(10,42,58,.04), 0 8px 20px rgba(10,42,58,.05)",
                padding: "60px 24px", textAlign: "center",
              }}>
                <Clock size={40} style={{ color: "#E6F5F3", margin: "0 auto 12px" }} />
                <p style={{ font: "600 15px/20px Inter, sans-serif", color: "#0a2a3a", margin: "0 0 4px" }}>
                  No completed routes yet
                </p>
                <p style={{ font: "400 13px/18px Inter, sans-serif", color: "#6b7280", margin: 0 }}>
                  {filtersActive
                    ? "No deliveries match your search or date range."
                    : "Completed delivery routes will appear here"}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {groups.map(group => (
                  <div key={group.date}>
                    {/* Date group label — teal, uppercase, outside the card */}
                    <p style={{
                      padding: "0 4px 8px",
                      font: "600 12px/16px Inter, sans-serif",
                      letterSpacing: ".04em",
                      color: "#09665e",
                      textTransform: "uppercase",
                    }}>
                      {getDateGroupLabel(group.date)}
                    </p>

                    {/* ONE continuous list-card for the whole date group */}
                    <div style={{
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 20,
                      overflow: "hidden",
                      boxShadow: "0 1px 2px rgba(10,42,58,.04), 0 8px 20px rgba(10,42,58,.05)",
                    }}>
                      {group.routes.map((route, i) => (
                        <HistoryEntry
                          key={route.id}
                          route={route}
                          isLast={i === group.routes.length - 1}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
