// DeliveryTaskPool.jsx — Driver's view of today's delivery routes
// Migrated to routeTemplates/ + routeOccurrences/ — deliveryRoutes/ deprecated
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, MapPin, Clock, Truck, Search, SlidersHorizontal, X, Calendar } from "lucide-react";
import { db } from "../firebase";
import { ref, onValue, update, set } from "firebase/database";

// ── Utilities ─────────────────────────────────────────────────────────────────

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getTodayDisplay() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

function formatTime(t) {
  if (!t) return "";
  if (/AM|PM/i.test(t)) return t;
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatDateShort(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

// ── Merge helper ──────────────────────────────────────────────────────────────
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
    _template:     template,
  };
};

const getStatusStyle = (status) => {
  if (status === "inProgress")  return "bg-[#fff3e0] text-[#ff9500]";
  if (status === "complete")    return "bg-[#f0fff4] text-[#34c759]";
  if (status === "incomplete")  return "bg-[#fff0f0] text-[#dc2626]";
  return "bg-[#e6e6e6] text-[#6b7280]";
};

const getStatusLabel = (status) => {
  if (status === "inProgress")  return "In Progress";
  if (status === "complete")    return "Complete";
  if (status === "incomplete")  return "Incomplete";
  return "Available";
};

// ── Available route card ──────────────────────────────────────────────────────
function RouteCard({ route, volunteerName, onTap }) {
  const drivers    = Array.isArray(route.drivers) ? route.drivers : [];
  const needed     = Number(route.driversNeeded) || 1;
  const isClaimed  = drivers.includes(volunteerName);
  const isFull     = drivers.length >= needed;
  const isComplete = route.status === "complete";

  const slots = Array.from({ length: needed }, (_, i) => {
    const val = drivers[i];
    if (!val) return { type: "open" };
    if (val === volunteerName) return { type: "me" };
    return { type: "other", name: val.split(" ")[0] };
  });

  const cardBase = "rounded-xl p-4 mx-4 mb-3 border transition-colors";
  let cardClass = cardBase;
  if (isComplete)     cardClass += " bg-white border-[#e5e7eb] opacity-50 cursor-default";
  else if (isClaimed) cardClass += " bg-[#f0fafa] border-[#0d9488] cursor-pointer";
  else if (isFull)    cardClass += " bg-white border-[#e5e7eb] opacity-60 cursor-default";
  else                cardClass += " bg-white border-[#e5e7eb] hover:border-[#0d9488] hover:shadow-sm cursor-pointer";

  function handleTap() {
    if (isComplete) return;
    if (isFull && !isClaimed) return;
    onTap(route);
  }

  return (
    <div className={cardClass} onClick={handleTap}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[#0a2a3a] text-[14px] font-semibold truncate mr-3">{route.name}</p>
        <span className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 font-medium ${getStatusStyle(route.status)}`}>
          {getStatusLabel(route.status)}
        </span>
      </div>
      <div className="flex items-center gap-1 mb-1.5 flex-wrap">
        <MapPin size={13} className="text-[#6b7280] shrink-0" />
        <span className="text-[#6b7280] text-[12px]">{route.source || "—"}</span>
        <span className="text-[#6b7280] text-[12px] mx-0.5">→</span>
        <span className="text-[#6b7280] text-[12px]">{route.destination || "—"}</span>
      </div>
      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mb-3">
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
      <div className="flex flex-wrap gap-1.5">
        {slots.map((slot, i) => (
          <span key={i} className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${
            slot.type === "me" ? "bg-[#0d9488] text-white"
            : slot.type === "other" ? "bg-[#ccedeb] text-[#09665e]"
            : "bg-[#f0f0f0] text-[#6b7280]"
          }`}>
            {slot.type === "me" ? "You" : slot.type === "other" ? slot.name : "Open"}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── My Routes card (with inline actions) ─────────────────────────────────────
function MyRouteCard({ route, volunteerName, onUnclaim, onComplete }) {
  const drivers = Array.isArray(route.drivers) ? route.drivers : [];
  const needed  = Number(route.driversNeeded) || 1;
  const slots   = Array.from({ length: needed }, (_, i) => {
    const val = drivers[i];
    if (!val) return { type: "open" };
    if (val === volunteerName) return { type: "me" };
    return { type: "other", name: val.split(" ")[0] };
  });

  return (
    <div className="bg-white border-2 border-[#0d9488] rounded-2xl p-4">
      {/* Row 1 — name + status */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-[#0a2a3a] text-[15px] font-semibold truncate mr-3">{route.name}</p>
        <span className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 font-medium ${getStatusStyle(route.status)}`}>
          {getStatusLabel(route.status)}
        </span>
      </div>

      {/* Row 2 — date */}
      {route.date && (
        <div className="flex items-center gap-1 mb-1.5">
          <Calendar size={13} className="text-[#6b7280] shrink-0" />
          <span className="text-[#6b7280] text-[12px]">{formatDateShort(route.date)}</span>
        </div>
      )}

      {/* Row 3 — source → destination */}
      <div className="flex items-center gap-1 mb-1.5 flex-wrap">
        <MapPin size={13} className="text-[#6b7280] shrink-0" />
        <span className="text-[#6b7280] text-[12px]">{route.source || "—"}</span>
        <span className="text-[#6b7280] text-[12px] mx-0.5">→</span>
        <span className="text-[#6b7280] text-[12px]">{route.destination || "—"}</span>
      </div>

      {/* Row 4 — time + vehicle */}
      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mb-3">
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

      {/* Row 5 — driver slots */}
      <div className="flex flex-wrap gap-1.5">
        {slots.map((slot, i) => (
          <span key={i} className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
            slot.type === "me" ? "bg-[#0d9488] text-white"
            : slot.type === "other" ? "bg-[#ccedeb] text-[#09665e]"
            : "bg-[#f0f0f0] text-[#6b7280]"
          }`}>
            {slot.type === "me" ? "You" : slot.type === "other" ? slot.name : "Open"}
          </span>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-[#f3f4f6] my-3" />

      {/* Action buttons */}
      <div className="flex gap-3">
        <button onClick={() => onUnclaim(route)}
          className="flex-1 bg-white border border-[#e5e7eb] text-[#6b7280] rounded-xl py-2.5 text-[13px] font-medium cursor-pointer">
          Unclaim
        </button>
        <button onClick={() => onComplete(route)}
          className="flex-1 bg-[#09665e] text-white rounded-xl py-2.5 text-[13px] font-medium border-none cursor-pointer hover:bg-[#0d9488]">
          Mark Complete
        </button>
      </div>
    </div>
  );
}

// ── Section with optional day grouping ───────────────────────────────────────
function RouteSection({ routes, volunteerName, onTap, viewMode, formatDayHeader }) {
  const grouped = (viewMode === "week" || viewMode === "month")
    ? routes.reduce((acc, r) => { (acc[r.date] = acc[r.date] || []).push(r); return acc; }, {})
    : null;

  if (grouped) {
    const dates = Object.keys(grouped).sort();
    return (
      <>
        {dates.map(dateStr => (
          <React.Fragment key={dateStr}>
            <p className="px-4 pt-3 pb-1 text-[12px] font-semibold text-[#6b7280] uppercase tracking-wide">
              {formatDayHeader(dateStr)}
            </p>
            {grouped[dateStr].map(route => (
              <RouteCard key={route.id} route={route} volunteerName={volunteerName} onTap={onTap} />
            ))}
          </React.Fragment>
        ))}
      </>
    );
  }
  return (
    <>
      {routes.map(route => (
        <RouteCard key={route.id} route={route} volunteerName={volunteerName} onTap={onTap} />
      ))}
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DeliveryTaskPool() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const volunteer = location.state?.volunteer;

  const [templates,   setTemplates]   = useState({});
  const [occurrences, setOccurrences] = useState([]);
  const [viewMode,    setViewMode]    = useState("today");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [dayFilter,   setDayFilter]   = useState("all");
  const [activeTab,   setActiveTab]   = useState("available");

  useEffect(() => {
    if (!volunteer) navigate("/experienced", { replace: true });
  }, [volunteer, navigate]);

  useEffect(() => {
    return onValue(ref(db, "routeTemplates"), snap => {
      setTemplates(snap.val() || {});
    });
  }, []);

  useEffect(() => {
    return onValue(ref(db, "routeOccurrences"), snap => {
      const data = snap.val();
      if (!data) { setOccurrences([]); return; }
      setOccurrences(Object.entries(data).map(([id, val]) => ({ id, ...val })));
    });
  }, []);

  if (!volunteer) return null;

  const volunteerName = volunteer.name;
  const todayStr = new Date().toISOString().split("T")[0];

  function getWeekRange() {
    const now = new Date();
    const end = new Date(now);
    end.setDate(now.getDate() + 6);
    return { start: now.toISOString().split("T")[0], end: end.toISOString().split("T")[0] };
  }

  function getMonthRange() {
    const now = new Date();
    const start = now.toISOString().split("T")[0];
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
    return { start, end };
  }

  function formatDayHeader(dateStr) {
    const date     = new Date(dateStr + "T00:00:00");
    const today    = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    if (date.getTime() === today.getTime())    return "Today";
    if (date.getTime() === tomorrow.getTime()) return "Tomorrow";
    return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  }

  function formatDayHeaderShort(dateStr) {
    const date     = new Date(dateStr + "T00:00:00");
    const today    = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    if (date.getTime() === today.getTime())    return "Today";
    if (date.getTime() === tomorrow.getTime()) return "Tomorrow";
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }

  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  function dayMatch(route) {
    if (dayFilter === "all") return true;
    const date = new Date(route.date + "T00:00:00");
    return dayNames[date.getDay()] === dayFilter;
  }

  function searchMatch(route) {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      route.name?.toLowerCase().includes(q) ||
      route.source?.toLowerCase().includes(q) ||
      route.destination?.toLowerCase().includes(q)
    );
  }

  const mergedRoutes = occurrences.map(o => mergeRouteData(o, templates));

  // Period filter (for available tab)
  const filteredRoutes = mergedRoutes.filter(route => {
    if (route.isSpecial) return false;
    if (route.status === "complete") return false;
    if (viewMode === "today") return route.date === todayStr;
    if (viewMode === "month") {
      const { start, end } = getMonthRange();
      return route.date >= start && route.date <= end;
    }
    const { start, end } = getWeekRange();
    return route.date >= start && route.date <= end;
  }).sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.departureTime || "").localeCompare(b.departureTime || "");
  });

  const availableRoutes = filteredRoutes.filter(r =>
    !r.drivers?.includes(volunteerName) && dayMatch(r) && searchMatch(r)
  );

  // My Routes — all claimed across ALL occurrences (not period-filtered)
  const myRoutes = mergedRoutes.filter(r =>
    r.drivers?.includes(volunteerName) && r.status !== "complete"
  ).sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.departureTime || "").localeCompare(b.departureTime || "");
  });

  const totalFiltered = filteredRoutes.filter(r => dayMatch(r) && searchMatch(r)).length;
  const isSearchActive = viewMode !== "today" && (searchQuery.trim() || dayFilter !== "all");

  function handleRouteTap(route) {
    navigate("/delivery-route-detail", {
      state: { occurrenceId: route.id, templateId: route.templateId, volunteer },
    });
  }

  async function handleUnclaim(route) {
    const updatedDrivers = (route.drivers || []).filter(d => d !== volunteerName);
    await update(ref(db, `routeOccurrences/${route.id}`), {
      drivers: updatedDrivers,
      status:  updatedDrivers.length === 0 ? "pending" : "inProgress",
    });
  }

  async function handleComplete(route) {
    await update(ref(db, `routeOccurrences/${route.id}`), { status: "complete" });
    await set(ref(db, `routeHistory/${route.id}`), {
      ...route,
      completedAt: Date.now(),
      completedBy: volunteerName,
    });
  }

  // Group myRoutes by date
  const myGrouped = myRoutes.reduce((acc, r) => {
    (acc[r.date] = acc[r.date] || []).push(r);
    return acc;
  }, {});
  const myDates = Object.keys(myGrouped).sort();

  return (
    <div className="min-h-screen bg-[#f5f5f5] max-w-[480px] mx-auto flex flex-col"
      style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* Top bar */}
      <div className="bg-[#0a2a3a] px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => navigate("/volunteer-mode-select", { state: { volunteer } })}
          className="text-white bg-transparent border-none cursor-pointer p-1 -ml-1">
          <ChevronLeft size={22} />
        </button>
        <p className="text-white text-[16px] font-semibold">Delivery Routes</p>
        <p className="text-[#0d9488] text-[11px]">{getTodayDisplay()}</p>
      </div>

      {/* Stats pills */}
      <div className="bg-white border-b border-[#e5e7eb] px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
        {[
          `${totalFiltered} ${viewMode === "today" ? "Routes Today" : viewMode === "week" ? "Routes This Week" : "Routes This Month"}`,
          `${availableRoutes.length} Available`,
          `${myRoutes.length} My Routes`,
        ].map(label => (
          <span key={label}
            className="bg-[#f0fafa] border border-[#ccedeb] rounded-full px-3 py-1 text-[12px] text-[#09665e] font-medium shrink-0">
            {label}
          </span>
        ))}
      </div>

      {/* Period toggle — only in Available tab */}
      {activeTab === "available" && (
        <>
          <div className="bg-white border-b border-[#e5e7eb] px-4 py-2.5 flex gap-2">
            {[["today", "Today"], ["week", "This Week"], ["month", "This Month"]].map(([mode, label]) => (
              <button key={mode}
                onClick={() => {
                  setViewMode(mode);
                  if (mode === "today") { setSearchQuery(""); setShowFilters(false); setDayFilter("all"); }
                }}
                className={`rounded-full px-4 py-1 text-[13px] font-medium border transition-colors ${
                  viewMode === mode
                    ? "bg-[#0d9488] text-white border-[#0d9488]"
                    : "bg-white text-[#6b7280] border-[#e5e7eb]"
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* Search + day filter — week/month only */}
          {viewMode !== "today" && (
            <>
              <div className="px-4 py-2 bg-white border-b border-[#e5e7eb] flex items-center gap-2">
                <div className="flex-1 flex items-center bg-[#f5f5f5] rounded-full px-3 py-1.5 gap-2">
                  <Search size={14} className="text-[#6b7280] flex-shrink-0" />
                  <input type="text" placeholder="Search routes..."
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    className="bg-transparent flex-1 text-[13px] text-[#0a2a3a] outline-none placeholder-[#9ca3af]" />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")}>
                      <X size={13} className="text-[#6b7280]" />
                    </button>
                  )}
                </div>
                <button onClick={() => setShowFilters(f => !f)}
                  className={`w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0 transition-colors ${
                    showFilters || dayFilter !== "all" ? "bg-[#0d9488] text-white" : "bg-[#f5f5f5] text-[#6b7280]"
                  }`}>
                  <SlidersHorizontal size={14} />
                </button>
              </div>

              <div className={`overflow-hidden transition-all duration-200 ${showFilters ? "max-h-[60px]" : "max-h-0"}`}>
                <div className="px-4 py-2 bg-white border-b border-[#e5e7eb] flex gap-2 overflow-x-auto">
                  {["All", "Mon", "Tue", "Wed", "Thu", "Fri"].map(day => {
                    const val = day === "All" ? "all" : day === "Mon" ? "monday" : day === "Tue" ? "tuesday" : day === "Wed" ? "wednesday" : day === "Thu" ? "thursday" : "friday";
                    return (
                      <button key={day} onClick={() => setDayFilter(val)}
                        className={`flex-shrink-0 rounded-full px-3 py-1 text-[12px] font-medium transition-colors border-none cursor-pointer ${
                          dayFilter === val ? "bg-[#0d9488] text-white" : "bg-white border border-[#e5e7eb] text-[#6b7280]"
                        }`}>
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {dayFilter !== "all" && (
                <div className="px-4 py-1 bg-white border-b border-[#e5e7eb] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#0d9488] rounded-full shrink-0" />
                  <span className="text-[#0d9488] text-[11px] capitalize">Filtered by {dayFilter}</span>
                  <button onClick={() => setDayFilter("all")} className="text-[#6b7280] text-[11px] underline ml-auto bg-transparent border-none cursor-pointer">
                    Clear
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Scrollable content */}
      <div className="flex-1 pt-2 pb-16">

        {/* ── AVAILABLE TAB ── */}
        {activeTab === "available" && (
          <>
            {availableRoutes.length === 0 ? (
              isSearchActive ? (
                <div className="flex flex-col items-center justify-center mt-12 px-8 text-center">
                  <Search size={36} style={{ color: "#ccedeb" }} />
                  <p className="text-[#0a2a3a] text-[15px] font-semibold mt-3">No routes found</p>
                  <p className="text-[#6b7280] text-[13px] mt-1">Try a different search or filter</p>
                  <button onClick={() => { setSearchQuery(""); setDayFilter("all"); }}
                    className="text-[#0d9488] text-[13px] mt-3 bg-transparent border-none cursor-pointer">
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
                  <Truck size={40} style={{ color: "#ccedeb" }} />
                  <p className="text-[#0a2a3a] text-[15px] font-semibold mt-3">
                    {viewMode === "today" ? "No routes today" : viewMode === "week" ? "No routes this week" : "No routes this month"}
                  </p>
                  <p className="text-[#6b7280] text-[13px] mt-1">
                    {viewMode === "today" ? "Check back later for delivery routes" : "Routes will appear here when scheduled"}
                  </p>
                </div>
              )
            ) : (
              <>
                <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                  <p className="text-[#0a2a3a] text-[13px] font-semibold">Available Routes</p>
                  <span className="bg-[#ccedeb] text-[#09665e] text-[11px] px-2 py-0.5 rounded-full">
                    {availableRoutes.length}
                  </span>
                </div>
                <RouteSection
                  routes={availableRoutes}
                  volunteerName={volunteerName}
                  onTap={handleRouteTap}
                  viewMode={viewMode}
                  formatDayHeader={formatDayHeader}
                />
              </>
            )}
          </>
        )}

        {/* ── MY ROUTES TAB ── */}
        {activeTab === "my-routes" && (
          <>
            {myRoutes.length === 0 ? (
              <div className="flex flex-col items-center justify-center mt-20 px-8 text-center">
                <Truck size={40} style={{ color: "#ccedeb" }} />
                <p className="text-[#0a2a3a] text-[15px] font-semibold mt-3">No claimed routes</p>
                <p className="text-[#6b7280] text-[13px] mt-1">Claim a route from Available to see it here</p>
                <button onClick={() => setActiveTab("available")}
                  className="bg-[#09665e] text-white rounded-xl px-5 py-2.5 text-[13px] font-medium mt-4 border-none cursor-pointer">
                  Browse Routes
                </button>
              </div>
            ) : (
              <div className="mx-4 mt-4 space-y-3">
                {myDates.map(dateStr => (
                  <React.Fragment key={dateStr}>
                    <p className="pt-2 pb-1 text-[11px] text-[#6b7280] uppercase tracking-widest">
                      {formatDayHeaderShort(dateStr)}
                    </p>
                    {myGrouped[dateStr].map(route => (
                      <MyRouteCard
                        key={route.id}
                        route={route}
                        volunteerName={volunteerName}
                        onUnclaim={handleUnclaim}
                        onComplete={handleComplete}
                      />
                    ))}
                  </React.Fragment>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom tab bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-white border-t border-[#e5e7eb] flex z-20">
        <button onClick={() => setActiveTab("available")}
          className={`flex-1 py-3.5 text-[13px] font-medium transition-colors bg-transparent border-none cursor-pointer ${
            activeTab === "available" ? "text-[#0d9488] border-t-2 border-[#0d9488]" : "text-[#6b7280]"
          }`}>
          Available
        </button>
        <button onClick={() => setActiveTab("my-routes")}
          className={`flex-1 py-3.5 text-[13px] font-medium transition-colors relative bg-transparent border-none cursor-pointer ${
            activeTab === "my-routes" ? "text-[#0d9488] border-t-2 border-[#0d9488]" : "text-[#6b7280]"
          }`}>
          My Routes
          {myRoutes.length > 0 && (
            <span className="absolute top-2 right-[calc(50%-24px)] w-4 h-4 bg-[#0d9488] text-white text-[10px] rounded-full flex items-center justify-center">
              {myRoutes.length}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
