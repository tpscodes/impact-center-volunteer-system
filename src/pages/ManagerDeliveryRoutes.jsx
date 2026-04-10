// ManagerDeliveryRoutes.jsx — Master-detail route template + schedule view
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Menu, X, Plus, MapPin, Clock, Truck, Users, Pencil,
} from "lucide-react";
import { db } from "../firebase";
import { ref, onValue, update, push } from "firebase/database";
import Sidebar from "../components/Sidebar";

// ── Constants ─────────────────────────────────────────────────────────────────
const DAY_ORDER = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

// ── Date helpers ───────────────────────────────────────────────────────────────
function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}
function getTodayDayKey() {
  return DAY_ORDER[(new Date().getDay() + 6) % 7];
}
function formatDateShort(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}
function monthLabel(dateStr) {
  return new Date(dateStr.slice(0, 7) + "-01T12:00:00").toLocaleDateString("en-US", {
    month: "long", year: "numeric",
  });
}
function nextOccurrenceDate(dayOfWeek, existingDates) {
  const target = DAY_ORDER.indexOf(dayOfWeek); // 0=Mon
  if (existingDates.length > 0) {
    const sorted = [...existingDates].sort();
    const latest = new Date(sorted[sorted.length - 1] + "T12:00:00");
    latest.setDate(latest.getDate() + 7);
    return latest.toISOString().slice(0, 10);
  }
  // No existing — find next upcoming occurrence of that day
  const now = new Date();
  const todayDow = (now.getDay() + 6) % 7; // Mon=0
  let daysUntil = (target - todayDow + 7) % 7;
  if (daysUntil === 0) daysUntil = 7;
  const result = new Date(now);
  result.setDate(now.getDate() + daysUntil);
  return result.toISOString().slice(0, 10);
}

// Sort templates: by day order, then alphabetically by name
function sortTemplates(templates) {
  return [...templates].sort((a, b) => {
    const ai = DAY_ORDER.indexOf(a.dayOfWeek ?? "");
    const bi = DAY_ORDER.indexOf(b.dayOfWeek ?? "");
    const aIdx = ai === -1 ? 9 : ai;
    const bIdx = bi === -1 ? 9 : bi;
    if (aIdx !== bIdx) return aIdx - bIdx;
    return (a.name || "").localeCompare(b.name || "");
  });
}

// Group occurrences by month (already sorted ascending)
function groupByMonth(occs) {
  const groups = [];
  let cur = null;
  for (const occ of occs) {
    const m = occ.date?.slice(0, 7);
    if (m !== cur) { cur = m; groups.push({ month: m, occs: [occ] }); }
    else groups[groups.length - 1].occs.push(occ);
  }
  return groups;
}

// ── Driver input with autocomplete ───────────────────────────────────────────
// Defined outside main component — stable reference, no remount on parent render
function DriverInput({ value, occKey, field, drivers, onSave }) {
  const [editing,  setEditing]  = useState(!value);
  const [inputVal, setInputVal] = useState(value || "");
  const [showDrop, setShowDrop] = useState(false);
  const inputRef = useRef(null);

  // Keep in sync if value changes externally
  useEffect(() => {
    setInputVal(value || "");
    setEditing(!value);
  }, [value]);

  const filtered = drivers.filter(d =>
    !inputVal || d.name?.toLowerCase().includes(inputVal.toLowerCase())
  );

  async function save(name) {
    setInputVal(name);
    setShowDrop(false);
    setEditing(false);
    await onSave(occKey, field, name);
  }

  if (!editing && value) {
    return (
      <span
        onClick={() => { setEditing(true); setTimeout(() => inputRef.current?.focus(), 0); }}
        className="bg-[#ccedeb] text-[#09665e] text-[11px] px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 inline-block">
        {value}
      </span>
    );
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={inputVal}
        onChange={e => { setInputVal(e.target.value); setShowDrop(true); }}
        onFocus={() => setShowDrop(true)}
        onBlur={() => setTimeout(() => setShowDrop(false), 180)}
        placeholder="Assign driver..."
        className="w-full border border-[#e5e7eb] rounded-lg px-2 py-1 text-[12px]
                   text-[#0a2a3a] focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
      />
      {showDrop && filtered.length > 0 && (
        <div className="absolute top-full left-0 z-30 bg-white border border-[#e5e7eb]
                        rounded-lg shadow-md mt-0.5 max-h-[140px] overflow-y-auto min-w-[150px]">
          {filtered.map(d => (
            <button key={d.id} onMouseDown={() => save(d.name)}
              className="w-full text-left px-3 py-2 text-[12px] text-[#0a2a3a]
                         hover:bg-[#f0fafa] bg-transparent border-none cursor-pointer">
              {d.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Module-level persistence ──────────────────────────────────────────────────
// These survive React component remounts (StrictMode double-mount, router
// re-renders, etc.) because they live in module scope, not component state.
// selectedId: remembers which route the user last clicked so the right panel
//   never flashes to "Select a route" on remount.
// cachedTemplates: remembers the last loaded templates so the right panel has
//   data immediately on remount — no waiting for Firebase to re-fire.
let _persistedSelectedId = null;
let _cachedTemplates     = {};

// ── Main component ────────────────────────────────────────────────────────────
export default function ManagerDeliveryRoutes() {
  const navigate = useNavigate();

  // Initialise state from module-level cache so remounts start with correct data
  const [templates,   _setTemplates]   = useState(_cachedTemplates);
  const [occurrences, setOccurrences]  = useState([]);
  const [volunteers,  setVolunteers]   = useState([]);
  const [selectedId,  _setSelectedId]  = useState(_persistedSelectedId);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Wrap setters so module-level cache stays in sync
  function setTemplates(data) {
    _cachedTemplates = data;
    _setTemplates(data);
  }
  function setSelectedId(id) {
    _persistedSelectedId = id;
    _setSelectedId(id);
  }

  // Firebase listeners — all mounted once, empty deps
  useEffect(() => {
    return onValue(ref(db, "routeTemplates"), snap => {
      const data = snap.val();
      // Never overwrite valid templates with a null/empty snapshot
      // (can happen during StrictMode re-subscription or brief disconnects)
      if (data) setTemplates(data);
    });
  }, []); // eslint-disable-line

  useEffect(() => {
    return onValue(ref(db, "routeOccurrences"), snap => {
      const data = snap.val();
      setOccurrences(data
        ? Object.entries(data).map(([id, val]) => ({ id, ...val }))
        : []);
    });
  }, []);

  useEffect(() => {
    return onValue(ref(db, "volunteers"), snap => {
      const data = snap.val();
      setVolunteers(data ? Object.values(data) : []);
    });
  }, []);

  // Derive sorted list from templates object (preserves Firebase keys as id)
  const templatesList = Object.entries(templates).map(([id, t]) => ({ id, ...t }));
  const sorted = sortTemplates(templatesList);

  // Auto-select the default route when templates load and nothing is selected yet.
  // Uses !selectedId instead of a ref guard so StrictMode's unmount/remount cycle
  // (which resets state but preserves refs) correctly re-triggers the selection.
  useEffect(() => {
    if (sorted.length === 0 || selectedId) return;
    const today = getTodayDayKey();
    const match = sorted.find(t => t.dayOfWeek === today) || sorted[0];
    if (match) setSelectedId(match.id);
  }, [templates]); // eslint-disable-line

  // Derive selectedTemplate directly from the templates object (O(1) lookup)
  const selectedTemplate = templates[selectedId]
    ? { id: selectedId, ...templates[selectedId] }
    : null;

  const drivers = volunteers.filter(v => v.isDriver === true);

  // Occurrences for selected template, sorted by date
  const templateOccs = occurrences
    .filter(o => o.templateId === selectedId)
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  const today = getTodayStr();
  const monthGroups = groupByMonth(templateOccs);

  // ── Handlers ───────────────────────────────────────────────────────────────
  async function handleAddOccurrence() {
    if (!selectedTemplate) return;
    const dates = templateOccs.map(o => o.date).filter(Boolean);
    const newDate = nextOccurrenceDate(selectedTemplate.dayOfWeek, dates);
    await push(ref(db, "routeOccurrences"), {
      templateId: selectedTemplate.id,
      date:       newDate,
      driver1:    "",
      driver2:    "",
      status:     "pending",
      notes:      "",
      isSpecial:  false,
    });
  }

  async function handleAssignDriver(occKey, field, name) {
    await update(ref(db, `routeOccurrences/${occKey}`), { [field]: name });
  }

  const todayDisplay = new Date().toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });

  // Precompute driversNeeded so schedule table and header stay in sync
  const driversNeeded = selectedTemplate ? Number(selectedTemplate.driversNeeded) || 1 : 1;

  // Precompute META array for the route info grid
  const META = selectedTemplate ? [
    { icon: MapPin, color: "#6b7280",  label: "Pickup",         value: selectedTemplate.source },
    { icon: MapPin, color: "#0d9488",  label: "Drop-off",       value: selectedTemplate.destination },
    { icon: Clock,  color: "#6b7280",  label: "Departs",        value: selectedTemplate.departureTime },
    { icon: Clock,  color: "#6b7280",  label: "Arrives",        value: selectedTemplate.arrivalTime },
    { icon: Truck,  color: "#6b7280",  label: "Vehicle",        value: selectedTemplate.vehicle },
    { icon: Users,  color: "#6b7280",  label: "Drivers needed", value: selectedTemplate.driversNeeded
        ? `${selectedTemplate.driversNeeded} ${selectedTemplate.driversNeeded === 1 ? "driver" : "drivers"}` : null },
  ].filter(m => m.value) : [];

  return (
    <div className="min-h-screen bg-[#f5f5f5]"
      style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* ══════════════════════════════════════════════════════════════════════
          MOBILE LAYOUT  (hidden on desktop)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden min-h-screen flex flex-col">

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
                  { label: "Dashboard", path: "/manager-delivery",            active: false },
                  { label: "Routes",    path: "/manager-delivery-routes",     active: true  },
                  { label: "Drivers",   path: "/manager-delivery-volunteers", active: false },
                  { label: "History",   path: "/manager-delivery-history",    active: false },
                ].map(item => (
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

        <div className="px-4 py-4 flex flex-col gap-3 pb-8">
          <div className="flex justify-end">
            <button onClick={() => navigate("/create-delivery-route")}
              className="flex items-center gap-1.5 bg-[#09665e] text-white px-3 py-2 rounded-lg text-[13px] font-medium border-none cursor-pointer">
              <Plus size={13} />
              Add Route
            </button>
          </div>
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <Truck size={40} color="#ccedeb" />
              <p className="text-[#0a2a3a] text-[15px] font-semibold mt-3">No route templates</p>
              <p className="text-[#6b7280] text-[13px] mt-1">Templates load from Firebase automatically</p>
            </div>
          ) : (
            sorted.map(tmpl => (
              <div key={tmpl.id} className="bg-white border border-[#e5e7eb] rounded-xl p-4 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[#0a2a3a] text-[14px] font-semibold">{tmpl.name}</p>
                  <span className="bg-[#ccedeb] text-[#09665e] text-[11px] px-2 py-0.5 rounded-full capitalize">
                    {tmpl.dayOfWeek}
                  </span>
                </div>
                <div className="flex items-center gap-1 mb-1.5">
                  <MapPin size={13} color="#6b7280" className="shrink-0" />
                  <span className="text-[#6b7280] text-[12px]">{tmpl.source} → {tmpl.destination}</span>
                </div>
                <div className="flex items-center gap-3">
                  {tmpl.departureTime && (
                    <span className="flex items-center gap-1 text-[#6b7280] text-[12px]">
                      <Clock size={13} color="#6b7280" />
                      {tmpl.departureTime}
                    </span>
                  )}
                  {tmpl.vehicle && (
                    <span className="flex items-center gap-1 text-[#6b7280] text-[12px]">
                      <Truck size={13} color="#6b7280" />
                      {tmpl.vehicle}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          DESKTOP LAYOUT  (hidden on mobile)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex min-h-screen">

        <Sidebar mode="delivery" activePath="/manager-delivery-routes" />

        <div className="ml-[220px] flex-1 flex flex-col" style={{ height: "100vh" }}>

          {/* Top bar */}
          <div className="bg-white border-b border-[#e5e7eb] h-16 flex items-center justify-between px-6 shrink-0 z-10">
            <div>
              <p className="text-[#0d9488] text-[10px] uppercase tracking-widest">Operations Manager</p>
              <h1 className="text-[22px] font-semibold text-[#0a2a3a] tracking-tight leading-tight">Routes</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[#6b7280] text-[13px]">{todayDisplay}</span>
              <button onClick={() => navigate("/create-delivery-route")}
                className="flex items-center gap-2 bg-[#09665e] text-white px-4 py-2 rounded-lg
                           text-[13px] font-medium hover:opacity-90 border-none cursor-pointer">
                <Plus size={14} />
                Add Route
              </button>
            </div>
          </div>

          {/* Master-detail — flex row, fills remaining height */}
          <div className="flex flex-1 overflow-hidden">

            {/* Left panel — always mounted, no key */}
            <div className="w-[220px] min-w-[220px] bg-white border-r border-[#e5e7eb] overflow-y-auto flex flex-col">
              <div className="px-4 py-3 border-b border-[#e5e7eb] shrink-0">
                <p className="text-[12px] text-[#6b7280] uppercase tracking-widest">Routes</p>
              </div>
              {sorted.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 p-4 text-center">
                  <p className="text-[#6b7280] text-[12px]">Loading templates…</p>
                </div>
              ) : (
                sorted.map(tmpl => {
                  const active = tmpl.id === selectedId;
                  return (
                    <button
                      key={tmpl.id}
                      onClick={() => setSelectedId(tmpl.id)}
                      className={`w-full text-left px-4 py-3 border-b border-[#f3f4f6] border-none
                        cursor-pointer transition-colors ${active ? "bg-[#0d9488]" : "bg-transparent hover:bg-[#f9fafb]"}`}>
                      <p className={`text-[13px] font-medium ${active ? "text-white" : "text-[#0a2a3a]"}`}>
                        {tmpl.name}
                      </p>
                      <p className={`text-[11px] capitalize mt-0.5 ${active ? "text-white" : "text-[#6b7280]"}`}>
                        {tmpl.dayOfWeek}
                      </p>
                    </button>
                  );
                })
              )}
            </div>

            {/* Right panel — always mounted, never null, no key */}
            <div className="flex-1 overflow-y-auto bg-[#f5f5f5]">
              {!selectedTemplate ? (
                <div className="flex flex-col items-center justify-center h-full py-20">
                  <Truck size={40} color="#ccedeb" />
                  <p className="text-[#0a2a3a] text-[15px] font-semibold mt-3">Select a route</p>
                  <p className="text-[#6b7280] text-[13px] mt-1">Choose a route from the left panel</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {/* Section 1 — Fixed route info */}
                  <div className="bg-white border-b border-[#e5e7eb] px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[#0a2a3a] text-[18px] font-semibold">{selectedTemplate.name}</p>
                        <span className="bg-[#ccedeb] text-[#09665e] text-[11px] px-3 py-1 rounded-full capitalize">
                          {selectedTemplate.dayOfWeek}
                        </span>
                      </div>
                      <button className="flex items-center gap-1.5 text-[#0d9488] text-[13px] bg-transparent border-none cursor-pointer hover:opacity-80">
                        <Pencil size={13} />
                        Edit
                      </button>
                    </div>

                    {/* Meta grid */}
                    <div className="grid grid-cols-3 gap-x-6 gap-y-3 mt-4">
                      {META.map(m => (
                        <div key={m.label}>
                          <div className="flex items-center gap-1 mb-0.5">
                            <m.icon size={13} style={{ color: m.color }} />
                            <span className="text-[#6b7280] text-[11px]">{m.label}</span>
                          </div>
                          <p className="text-[#0a2a3a] text-[13px] font-medium">{m.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 2 — Schedule table */}
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[#0a2a3a] text-[14px] font-semibold">Schedule</p>
                      <button onClick={handleAddOccurrence}
                        className="text-[#0d9488] text-[13px] bg-transparent border-none cursor-pointer hover:underline">
                        + Add Occurrence
                      </button>
                    </div>

                    {templateOccs.length === 0 ? (
                      <div className="text-center py-10">
                        <p className="text-[#6b7280] text-[13px]">No occurrences yet.</p>
                        <button onClick={handleAddOccurrence}
                          className="mt-2 text-[#0d9488] text-[13px] bg-transparent border-none cursor-pointer underline">
                          Add the first one
                        </button>
                      </div>
                    ) : (
                      <table className="w-full border-collapse text-left">
                        <thead>
                          <tr>
                            <th className="text-[11px] text-[#6b7280] uppercase tracking-wide pb-2 w-[110px] font-medium">Date</th>
                            <th className="text-[11px] text-[#6b7280] uppercase tracking-wide pb-2 font-medium">Driver 1</th>
                            {driversNeeded >= 2 && (
                              <th className="text-[11px] text-[#6b7280] uppercase tracking-wide pb-2 font-medium">Driver 2</th>
                            )}
                            <th className="text-[11px] text-[#6b7280] uppercase tracking-wide pb-2 w-[90px] font-medium">Status</th>
                            <th className="text-[11px] text-[#6b7280] uppercase tracking-wide pb-2 w-[100px] font-medium">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthGroups.map(group => (
                            <>
                              {/* Month header row */}
                              <tr key={`month-${group.month}`}>
                                <td colSpan={driversNeeded >= 2 ? 5 : 4}
                                  className="bg-[#f9fafb] text-[11px] text-[#6b7280] uppercase tracking-widest px-3 py-2">
                                  {monthLabel(group.month + "-01")}
                                </td>
                              </tr>

                              {group.occs.map(occ => {
                                const isPast    = (occ.date || "") < today;
                                const isSpecial = occ.isSpecial === true;

                                if (isSpecial) {
                                  return (
                                    <tr key={occ.id} className="border-b border-[#f3f4f6] h-[44px] bg-[#fff0f0]">
                                      <td className="text-[#0a2a3a] text-[12px] pr-4">
                                        {formatDateShort(occ.date)}
                                      </td>
                                      <td colSpan={driversNeeded >= 2 ? 4 : 3}
                                        className="text-[#dc2626] text-[12px] font-medium text-center">
                                        {occ.specialNote || "Special day"}
                                      </td>
                                    </tr>
                                  );
                                }

                                const allFilled = driversNeeded >= 2
                                  ? (!!occ.driver1 && !!occ.driver2)
                                  : !!occ.driver1;

                                return (
                                  <tr key={occ.id} className="border-b border-[#f3f4f6] h-[44px]">
                                    {/* Date */}
                                    <td className={`text-[12px] pr-4 ${isPast ? "text-[#6b7280]" : "text-[#0a2a3a] font-medium"}`}>
                                      {formatDateShort(occ.date)}
                                    </td>

                                    {/* Driver 1 */}
                                    <td className="pr-3 py-1">
                                      {isPast ? (
                                        occ.driver1
                                          ? <span className="bg-[#ccedeb] text-[#09665e] text-[11px] px-2 py-0.5 rounded-full">{occ.driver1}</span>
                                          : <span className="text-[#6b7280]">—</span>
                                      ) : (
                                        <DriverInput
                                          value={occ.driver1}
                                          occKey={occ.id}
                                          field="driver1"
                                          drivers={drivers}
                                          onSave={handleAssignDriver}
                                        />
                                      )}
                                    </td>

                                    {/* Driver 2 */}
                                    {driversNeeded >= 2 && (
                                      <td className="pr-3 py-1">
                                        {isPast ? (
                                          occ.driver2
                                            ? <span className="bg-[#ccedeb] text-[#09665e] text-[11px] px-2 py-0.5 rounded-full">{occ.driver2}</span>
                                            : <span className="text-[#6b7280]">—</span>
                                        ) : (
                                          <DriverInput
                                            value={occ.driver2}
                                            occKey={occ.id}
                                            field="driver2"
                                            drivers={drivers}
                                            onSave={handleAssignDriver}
                                          />
                                        )}
                                      </td>
                                    )}

                                    {/* Status */}
                                    <td className="pr-3">
                                      {isPast ? (
                                        <span className={`text-[11px] font-medium ${
                                          occ.status === "complete"   ? "text-[#34c759]" :
                                          occ.status === "incomplete" ? "text-[#dc2626]" :
                                          "text-[#6b7280]"
                                        }`}>
                                          {occ.status === "complete" ? "Complete" :
                                           occ.status === "incomplete" ? "Incomplete" : "—"}
                                        </span>
                                      ) : (
                                        <span className={`text-[11px] ${allFilled ? "text-[#0d9488] font-medium" : "text-[#6b7280] italic"}`}>
                                          {allFilled ? "Assigned" : "Pending"}
                                        </span>
                                      )}
                                    </td>

                                    {/* Notes */}
                                    <td className="text-[#6b7280] text-[12px]">
                                      {occ.notes || ""}
                                    </td>
                                  </tr>
                                );
                              })}
                            </>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
