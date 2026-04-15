// ManagerDeliveryRoutes.jsx — Master-detail route template + schedule view
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Menu, X, Plus, MapPin, Clock, Truck, Users, Pencil, MoreHorizontal, Trash2,
} from "lucide-react";
import { db } from "../firebase";
import { ref, onValue, update, push, set, remove } from "firebase/database";
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
// Defined outside main component — stable reference, no remount on parent render.
// Pill vs input is driven PURELY by the value prop — no useEffect sync needed.
// editing only tracks whether the manager explicitly clicked a filled pill to
// reassign; it defaults false so a freshly-claimed slot shows its pill instantly.
function DriverInput({ value, occKey, driverIndex, currentDrivers, drivers, onSave }) {
  const [editing,  setEditing]  = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [showDrop, setShowDrop] = useState(false);
  const inputRef = useRef(null);

  const filtered = drivers.filter(d =>
    !inputVal || d.name?.toLowerCase().includes(inputVal.toLowerCase())
  );

  async function save(name) {
    setInputVal("");
    setShowDrop(false);
    setEditing(false);
    await onSave(occKey, driverIndex, name, currentDrivers);
  }

  // Show pill when a driver is assigned AND manager hasn't clicked to reassign
  if (value && !editing) {
    return (
      <span
        onClick={() => {
          setEditing(true);
          setInputVal(value);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
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
        onBlur={() => { setTimeout(() => setShowDrop(false), 180); setEditing(false); }}
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
  const [mobileMenuOpen,  setMobileMenuOpen]  = useState(false);
  const [showEditPopup,   setShowEditPopup]   = useState(false);
  const [editFields,      setEditFields]      = useState({});
  const [showAddModal,    setShowAddModal]    = useState(false);
  const [addStep,         setAddStep]         = useState(1);
  const [newRoute,        setNewRoute]        = useState({
    name: "", dayOfWeek: "", source: "", destination: "",
    departureTime: "", arrivalTime: "", vehicle: "", driversNeeded: 1,
    firstDate: "", repeatsWeekly: false, repeatUntil: "",
  });
  const [addErrors,       setAddErrors]       = useState({});
  const [pendingSelectId, setPendingSelectId] = useState(null);
  const [openMenuId,      setOpenMenuId]      = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

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
      // Use Object.entries so the Firebase key is preserved as vol.id
      setVolunteers(data ? Object.entries(data).map(([id, v]) => ({ id, ...v })) : []);
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

  // Once a newly-created template arrives in state, select it.
  // Avoids selecting an ID that doesn't exist in templates yet.
  useEffect(() => {
    if (pendingSelectId && templates[pendingSelectId]) {
      setSelectedId(pendingSelectId);
      setPendingSelectId(null);
    }
  }, [templates, pendingSelectId]); // eslint-disable-line

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

  // ── Add-modal helpers ─────────────────────────────────────────────────────
  function closeAddModal() {
    setShowAddModal(false);
    setAddStep(1);
    setNewRoute({ name:"", dayOfWeek:"", source:"", destination:"",
      departureTime:"", arrivalTime:"", vehicle:"", driversNeeded:1,
      firstDate:"", repeatsWeekly:false, repeatUntil:"" });
    setAddErrors({});
  }

  function formatTimeTo12h(timeStr) {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
  }

  function countOccurrences(firstDate, repeatUntil, dayOfWeek) {
    const target = DAY_ORDER.indexOf(dayOfWeek);
    let cur = new Date(firstDate + "T12:00:00");
    const end = new Date(repeatUntil + "T12:00:00");
    let count = 0;
    while (cur <= end) {
      const dow = (cur.getDay() + 6) % 7;
      if (dow === target) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }

  function generateOccurrenceDates(firstDate, repeatUntil, dayOfWeek) {
    if (!repeatUntil) return [firstDate];
    const target = DAY_ORDER.indexOf(dayOfWeek);
    let cur = new Date(firstDate + "T12:00:00");
    const end = new Date(repeatUntil + "T12:00:00");
    const dates = [];
    while (cur <= end) {
      const dow = (cur.getDay() + 6) % 7;
      if (dow === target) dates.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
    return dates.length ? dates : [firstDate];
  }

  function validateStep(step) {
    const errs = {};
    if (step === 1) {
      if (!newRoute.name.trim())    errs.name      = "Route name is required";
      if (!newRoute.dayOfWeek)      errs.dayOfWeek = "Select a day of week";
    }
    if (step === 2) {
      if (!newRoute.source.trim())      errs.source      = "Pickup location is required";
      if (!newRoute.destination.trim()) errs.destination = "Drop-off location is required";
      if (!newRoute.vehicle)            errs.vehicle     = "Vehicle is required";
    }
    if (step === 3) {
      if (!newRoute.firstDate) errs.firstDate = "First occurrence date is required";
      if (newRoute.repeatsWeekly) {
        if (!newRoute.repeatUntil)                       errs.repeatUntil = "Repeat until date is required";
        else if (newRoute.repeatUntil <= newRoute.firstDate) errs.repeatUntil = "Must be after first date";
      }
    }
    setAddErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSaveNewRoute() {
    try {
      console.log("Creating route...", newRoute);

      const templateId = newRoute.name.toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "") + "-" + newRoute.dayOfWeek;

      await set(ref(db, `routeTemplates/${templateId}`), {
        name:          newRoute.name,
        dayOfWeek:     newRoute.dayOfWeek,
        source:        newRoute.source,
        destination:   newRoute.destination,
        departureTime: newRoute.departureTime,
        arrivalTime:   newRoute.arrivalTime,
        vehicle:       newRoute.vehicle,
        driversNeeded: newRoute.driversNeeded,
        createdAt:     Date.now(),
      });

      const dates = [];
      if (newRoute.repeatsWeekly && newRoute.repeatUntil) {
        let current = new Date(newRoute.firstDate);
        const until = new Date(newRoute.repeatUntil);
        while (current <= until) {
          dates.push(current.toISOString().split("T")[0]);
          current.setDate(current.getDate() + 7);
        }
      } else {
        dates.push(newRoute.firstDate);
      }

      for (const date of dates) {
        await push(ref(db, "routeOccurrences"), {
          templateId,
          date,
          drivers:     [],
          status:      "pending",
          isSpecial:   false,
          specialNote: "",
          notes:       "",
          createdAt:   Date.now(),
        });
      }

      setShowAddModal(false);
      setAddStep(1);
      setNewRoute({
        name: "", dayOfWeek: "", source: "", destination: "",
        departureTime: "", arrivalTime: "", vehicle: "",
        driversNeeded: 1, firstDate: "", repeatsWeekly: false, repeatUntil: "",
      });
      setAddErrors({});
      setPendingSelectId(templateId);

    } catch (error) {
      console.error("Error creating route:", error);
    }
  }

  // Close ⋯ menu when clicking anywhere outside
  useEffect(() => {
    const handleClick = () => setOpenMenuId(null);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────
  async function handleDeleteRoute(templateId) {
    try {
      await remove(ref(db, `routeTemplates/${templateId}`));
      const occurrencesToDelete = occurrences.filter(o => o.templateId === templateId);
      for (const occ of occurrencesToDelete) {
        await remove(ref(db, `routeOccurrences/${occ.id}`));
      }
      if (selectedId === templateId) {
        const remaining = sorted.filter(t => t.id !== templateId);
        setSelectedId(remaining[0]?.id || null);
      }
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Error deleting route:", error);
    }
  }

  async function handleAddOccurrence() {
    if (!selectedTemplate) return;
    const dates = templateOccs.map(o => o.date).filter(Boolean);
    const newDate = nextOccurrenceDate(selectedTemplate.dayOfWeek, dates);
    await push(ref(db, "routeOccurrences"), {
      templateId:  selectedTemplate.id,
      date:        newDate,
      drivers:     [],
      status:      "pending",
      notes:       "",
      specialNote: "",
      isSpecial:   false,
      createdAt:   Date.now(),
    });
  }

  async function handleDeleteOccurrence(occurrenceId) {
    await remove(ref(db, `routeOccurrences/${occurrenceId}`));
  }

  // Writes to drivers[] array so manager assigns and volunteer claims
  // use the same field — preserves other slots via update() not set()
  async function handleDriverAssign(occurrenceId, driverIndex, value, currentDrivers) {
    // Normalize: Firebase RTDB may return arrays as plain objects
    const normalized = Array.isArray(currentDrivers)
      ? currentDrivers
      : currentDrivers && typeof currentDrivers === "object"
      ? Object.values(currentDrivers)
      : [];
    const updatedDrivers = [...normalized];
    updatedDrivers[driverIndex] = value;
    // Safely count filled slots — guard against non-string entries
    const filledSlots = updatedDrivers.filter(d => d && typeof d === "string" && d.trim()).length;
    // Read driversNeeded fresh from template to avoid stale closure
    const tmplNeeded = Number(templates[selectedId]?.driversNeeded) || driversNeeded;
    const newStatus = filledSlots >= tmplNeeded ? "inProgress" : "pending";
    await update(ref(db, `routeOccurrences/${occurrenceId}`), {
      drivers: updatedDrivers,
      status:  newStatus,
    });
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

        {/* Mobile page title */}
        <div className="lg:hidden px-4 pt-5 pb-3">
          <p className="text-[#0d9488] text-[10px] uppercase tracking-widest mb-0.5">Operations Manager</p>
          <h1 className="text-[22px] font-semibold text-[#0a2a3a] tracking-tight">Routes</h1>
        </div>

        <div className="px-4 py-4 flex flex-col gap-3 pb-8">
          <div className="flex justify-end">
            <button onClick={() => { setShowAddModal(true); setAddStep(1); }}
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

        <div className="lg:ml-[220px] flex-1 flex flex-col" style={{ height: "100vh" }}>

          {/* Top bar */}
          <div className="bg-white border-b border-[#e5e7eb] h-16 flex items-center justify-between px-6 shrink-0 z-10">
            <div>
              <p className="text-[#0d9488] text-[10px] uppercase tracking-widest">Operations Manager</p>
              <h1 className="text-[22px] font-semibold text-[#0a2a3a] tracking-tight leading-tight">Routes</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[#6b7280] text-[13px]">{todayDisplay}</span>
              <button onClick={() => { setShowAddModal(true); setAddStep(1); }}
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
                    <div key={tmpl.id} className="relative group">
                      {/* Route item */}
                      <div
                        onClick={() => setSelectedId(tmpl.id)}
                        className={`px-4 py-3 cursor-pointer border-b border-[#f3f4f6] transition-colors
                          ${active ? "bg-[#0d9488]" : "hover:bg-[#f9fafb]"}`}>
                        <p className={`text-[13px] font-medium ${active ? "text-white" : "text-[#0a2a3a]"}`}>
                          {tmpl.name}
                        </p>
                        <p className={`text-[11px] capitalize mt-0.5 ${active ? "text-white" : "text-[#6b7280]"}`}>
                          {tmpl.dayOfWeek}
                        </p>
                      </div>

                      {/* ⋯ button — visible on hover */}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === tmpl.id ? null : tmpl.id);
                        }}
                        className={`absolute right-2 top-1/2 -translate-y-1/2
                          w-6 h-6 flex items-center justify-center rounded
                          opacity-0 group-hover:opacity-100 transition-opacity border-none cursor-pointer
                          ${active ? "text-white hover:bg-[#0b7a70]" : "text-[#6b7280] hover:bg-[#f0f0f0]"}`}>
                        <MoreHorizontal size={14} />
                      </button>

                      {/* Dropdown */}
                      {openMenuId === tmpl.id && (
                        <div className="absolute right-2 top-10 z-30 bg-white
                          border border-[#e5e7eb] rounded-lg shadow-md py-1 w-[140px]">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setDeleteConfirmId(tmpl.id);
                              setOpenMenuId(null);
                            }}
                            className="w-full text-left px-4 py-2 text-[13px]
                              text-[#dc2626] hover:bg-[#fff0f0] bg-transparent border-none cursor-pointer">
                            Delete Route
                          </button>
                        </div>
                      )}
                    </div>
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
                      <button
                        onClick={() => {
                          setEditFields({
                            name:          selectedTemplate.name          || "",
                            source:        selectedTemplate.source        || "",
                            destination:   selectedTemplate.destination   || "",
                            departureTime: selectedTemplate.departureTime || "",
                            arrivalTime:   selectedTemplate.arrivalTime   || "",
                            vehicle:       selectedTemplate.vehicle       || "",
                            driversNeeded: selectedTemplate.driversNeeded || 1,
                          });
                          setShowEditPopup(true);
                        }}
                        className="flex items-center gap-1.5 text-[#0d9488] text-[13px] bg-transparent border-none cursor-pointer hover:opacity-80">
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
                            {driversNeeded >= 3 && (
                              <th className="text-[11px] text-[#6b7280] uppercase tracking-wide pb-2 font-medium">Driver 3</th>
                            )}
                            <th className="text-[11px] text-[#6b7280] uppercase tracking-wide pb-2 w-[90px] font-medium">Status</th>
                            <th className="text-[11px] text-[#6b7280] uppercase tracking-wide pb-2 w-[100px] font-medium">Notes</th>
                            <th className="pb-2 w-[28px]" />
                          </tr>
                        </thead>
                        <tbody>
                          {monthGroups.map(group => (
                            <React.Fragment key={group.month}>
                              {/* Month header row */}
                              <tr>
                                <td colSpan={driversNeeded >= 3 ? 7 : driversNeeded >= 2 ? 6 : 5}
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
                                      <td colSpan={driversNeeded >= 3 ? 6 : driversNeeded >= 2 ? 5 : 4}
                                        className="text-[#dc2626] text-[12px] font-medium text-center">
                                        {occ.specialNote || "Special day"}
                                      </td>
                                      <td className="py-1 text-right pr-1">
                                        <button
                                          onClick={() => handleDeleteOccurrence(occ.id)}
                                          className="text-[#d1d5db] hover:text-[#dc2626] transition-colors bg-transparent border-none cursor-pointer p-0.5 rounded"
                                          title="Delete occurrence">
                                          <X size={13} />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                }

                                // Normalize drivers — Firebase RTDB can return arrays as
                                // plain objects ({0:"name"}) so handle both cases
                                const rawDrivers  = occ.drivers;
                                const occDrivers  = Array.isArray(rawDrivers)
                                  ? rawDrivers
                                  : rawDrivers && typeof rawDrivers === "object"
                                  ? Object.values(rawDrivers)
                                  : [];
                                const driver0     = occDrivers[0] || "";
                                const driver1     = occDrivers[1] || "";
                                const driver2     = occDrivers[2] || "";
                                const slotsFilled = occDrivers.filter(d => d && typeof d === "string" && d.trim()).length;

                                return (
                                  <tr key={occ.id} className="border-b border-[#f3f4f6] h-[44px]">
                                    {/* Date */}
                                    <td className={`text-[12px] pr-4 ${isPast ? "text-[#6b7280]" : "text-[#0a2a3a] font-medium"}`}>
                                      {formatDateShort(occ.date)}
                                    </td>

                                    {/* Driver 1 */}
                                    <td className="pr-3 py-1">
                                      {isPast ? (
                                        driver0
                                          ? <span className="bg-[#ccedeb] text-[#09665e] text-[11px] px-2 py-0.5 rounded-full">{driver0}</span>
                                          : <span className="text-[#6b7280]">—</span>
                                      ) : (
                                        <DriverInput
                                          key={`${occ.id}-0-${!!driver0}`}
                                          value={driver0}
                                          occKey={occ.id}
                                          driverIndex={0}
                                          currentDrivers={occDrivers}
                                          drivers={drivers}
                                          onSave={handleDriverAssign}
                                        />
                                      )}
                                    </td>

                                    {/* Driver 2 */}
                                    {driversNeeded >= 2 && (
                                      <td className="pr-3 py-1">
                                        {isPast ? (
                                          driver1
                                            ? <span className="bg-[#ccedeb] text-[#09665e] text-[11px] px-2 py-0.5 rounded-full">{driver1}</span>
                                            : <span className="text-[#6b7280]">—</span>
                                        ) : (
                                          <DriverInput
                                            key={`${occ.id}-1-${!!driver1}`}
                                            value={driver1}
                                            occKey={occ.id}
                                            driverIndex={1}
                                            currentDrivers={occDrivers}
                                            drivers={drivers}
                                            onSave={handleDriverAssign}
                                          />
                                        )}
                                      </td>
                                    )}

                                    {/* Driver 3 */}
                                    {driversNeeded >= 3 && (
                                      <td className="pr-3 py-1">
                                        {isPast ? (
                                          driver2
                                            ? <span className="bg-[#ccedeb] text-[#09665e] text-[11px] px-2 py-0.5 rounded-full">{driver2}</span>
                                            : <span className="text-[#6b7280]">—</span>
                                        ) : (
                                          <DriverInput
                                            key={`${occ.id}-2-${!!driver2}`}
                                            value={driver2}
                                            occKey={occ.id}
                                            driverIndex={2}
                                            currentDrivers={occDrivers}
                                            drivers={drivers}
                                            onSave={handleDriverAssign}
                                          />
                                        )}
                                      </td>
                                    )}

                                    {/* Status — reads live from occ.status + occ.drivers */}
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
                                      ) : occ.status === "complete" ? (
                                        <span className="text-[11px] font-medium text-[#34c759]">Complete</span>
                                      ) : occ.status === "inProgress" ? (
                                        <span className="text-[11px] font-medium text-[#ff9500]">In Progress</span>
                                      ) : slotsFilled >= driversNeeded ? (
                                        <span className="text-[11px] font-medium text-[#0d9488]">Assigned</span>
                                      ) : slotsFilled > 0 ? (
                                        <span className="text-[11px] font-medium text-[#ff9500]">Partial</span>
                                      ) : (
                                        <span className="text-[11px] text-[#6b7280] italic">Pending</span>
                                      )}
                                    </td>

                                    {/* Notes */}
                                    <td className="text-[#6b7280] text-[12px]">
                                      {occ.notes || ""}
                                    </td>

                                    {/* Delete */}
                                    <td className="py-1 text-right pr-1">
                                      <button
                                        onClick={() => handleDeleteOccurrence(occ.id)}
                                        className="text-[#d1d5db] hover:text-[#dc2626] transition-colors bg-transparent border-none cursor-pointer p-0.5 rounded"
                                        title="Delete occurrence">
                                        <X size={13} />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
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

      {/* ── Edit Route Popup ─────────────────────────────────────────────── */}
      {showEditPopup && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
          onClick={() => setShowEditPopup(false)}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-[480px] mx-4 p-6"
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <p className="text-[#0a2a3a] text-[16px] font-semibold">Edit Route</p>
              <button
                onClick={() => setShowEditPopup(false)}
                className="text-[#6b7280] bg-transparent border-none cursor-pointer hover:text-[#0a2a3a] p-1">
                <X size={18} />
              </button>
            </div>

            {/* Fields */}
            <div className="flex flex-col gap-4">
              {[
                { label: "Route Name",       field: "name",          type: "text"   },
                { label: "Pickup Location",  field: "source",        type: "text"   },
                { label: "Drop-off Location",field: "destination",   type: "text"   },
                { label: "Departure Time",   field: "departureTime", type: "text",  placeholder: "e.g. 10:00 AM" },
                { label: "Arrival Time",     field: "arrivalTime",   type: "text",  placeholder: "e.g. 11:30 AM" },
                { label: "Vehicle",          field: "vehicle",       type: "text"   },
              ].map(({ label, field, type, placeholder }) => (
                <div key={field}>
                  <label className="text-[#6b7280] text-[12px] block mb-1">{label}</label>
                  <input
                    type={type}
                    value={editFields[field] || ""}
                    placeholder={placeholder || ""}
                    onChange={e => setEditFields(f => ({ ...f, [field]: e.target.value }))}
                    className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2 text-[13px]
                               text-[#0a2a3a] focus:outline-none focus:ring-2 focus:ring-[#0d9488]"
                  />
                </div>
              ))}

              {/* Drivers Needed */}
              <div>
                <label className="text-[#6b7280] text-[12px] block mb-1">Drivers Needed</label>
                <select
                  value={editFields.driversNeeded || 1}
                  onChange={e => setEditFields(f => ({ ...f, driversNeeded: Number(e.target.value) }))}
                  className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2 text-[13px]
                             text-[#0a2a3a] focus:outline-none focus:ring-2 focus:ring-[#0d9488] bg-white">
                  <option value={1}>1 driver</option>
                  <option value={2}>2 drivers</option>
                  <option value={3}>3 drivers</option>
                </select>
              </div>

            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditPopup(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#e5e7eb] text-[#6b7280]
                           text-[13px] bg-white cursor-pointer hover:border-[#0d9488]">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!selectedTemplate) return;

                  // editFields is initialised with all current values so use
                  // them directly — avoids || swallowing empty strings when
                  // the user intentionally clears an optional field
                  const capturedId = selectedId;
                  const templateUpdate = {
                    name:          editFields.name,
                    source:        editFields.source,
                    destination:   editFields.destination,
                    departureTime: editFields.departureTime,
                    arrivalTime:   editFields.arrivalTime,
                    vehicle:       editFields.vehicle,
                    driversNeeded: editFields.driversNeeded || 1,
                  };

                  // Write to Firebase — on success patch local state and close popup
                  update(ref(db, `routeTemplates/${capturedId}`), templateUpdate)
                    .then(() => {
                      setTemplates({
                        ..._cachedTemplates,
                        [capturedId]: { ..._cachedTemplates[capturedId], ...templateUpdate },
                      });
                      setShowEditPopup(false);
                    })
                    .catch(err => console.error("Failed to save route template:", err));
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#09665e] text-white text-[13px]
                           font-semibold border-none cursor-pointer hover:opacity-90">
                Save
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ────────────────────────────────────── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
          onClick={() => setDeleteConfirmId(null)}>
          <div className="bg-white rounded-2xl border border-[#e5e7eb] w-full max-w-[360px] mx-4 p-6"
            onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center">
              <Trash2 size={32} color="#dc2626" className="mb-3" />
              <p className="text-[#0a2a3a] text-[16px] font-semibold">Delete Route?</p>
              <p className="text-[#6b7280] text-[13px] mt-2">
                This will permanently delete{" "}
                <span className="font-medium text-[#0a2a3a]">
                  {templates[deleteConfirmId]?.name || "this route"}
                </span>{" "}
                and all its scheduled occurrences. This cannot be undone.
              </p>
            </div>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 bg-white border border-[#e5e7eb] text-[#6b7280]
                  rounded-xl py-2.5 text-[13px] cursor-pointer hover:border-[#0d9488]">
                Cancel
              </button>
              <button
                onClick={() => handleDeleteRoute(deleteConfirmId)}
                className="flex-1 bg-[#dc2626] text-white rounded-xl py-2.5
                  text-[13px] font-medium border-none cursor-pointer hover:bg-[#b91c1c]">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Route Modal ──────────────────────────────────────────────── */}
      {showAddModal && (() => {
        const DAY_PILLS = [
          { label: "Mon", value: "monday" },
          { label: "Tue", value: "tuesday" },
          { label: "Wed", value: "wednesday" },
          { label: "Thu", value: "thursday" },
          { label: "Fri", value: "friday" },
        ];
        const STEP_TITLES = { 1: "Route Basics", 2: "Route Details", 3: "First Schedule" };
        const inputCls = (err) =>
          `w-full border ${err ? "border-[#dc2626]" : "border-[#e5e7eb]"} rounded-lg px-3 py-2 text-[14px] text-[#0a2a3a] focus:outline-none focus:ring-2 focus:ring-[#0d9488] bg-white`;

        const previewCount = newRoute.firstDate && newRoute.repeatsWeekly && newRoute.repeatUntil
          ? countOccurrences(newRoute.firstDate, newRoute.repeatUntil, newRoute.dayOfWeek)
          : 1;

        return (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
            onClick={closeAddModal}>
            <div className="bg-white rounded-2xl border border-[#e5e7eb] w-full max-w-[480px] mx-4"
              onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className="px-6 py-4 border-b border-[#e5e7eb] flex items-center justify-between">
                <div>
                  <p className="text-[#6b7280] text-[11px] uppercase tracking-wide">
                    Step {addStep} of 3
                  </p>
                  <p className="text-[#0a2a3a] text-[16px] font-semibold mt-0.5">
                    {STEP_TITLES[addStep]}
                  </p>
                </div>
                <button onClick={closeAddModal}
                  className="text-[#6b7280] bg-transparent border-none cursor-pointer hover:text-[#0a2a3a] p-1">
                  <X size={18} />
                </button>
              </div>

              {/* Progress bar */}
              <div className="h-1 bg-[#f0f0f0]">
                <div className="h-1 bg-[#0d9488] transition-all duration-300"
                  style={{ width: `${(addStep / 3) * 100}%` }} />
              </div>

              {/* Step content */}
              <div className="px-6 py-5 space-y-4">

                {/* ── Step 1 ── */}
                {addStep === 1 && (
                  <>
                    <div>
                      <label className="text-[#6b7280] text-[12px] block mb-1">Route Name</label>
                      <input
                        type="text"
                        value={newRoute.name}
                        placeholder="e.g. Midwest, Wawa, 2nd Helpings"
                        onChange={e => setNewRoute(r => ({ ...r, name: e.target.value }))}
                        className={inputCls(addErrors.name)}
                      />
                      {addErrors.name && <p className="text-[#dc2626] text-[11px] mt-1">{addErrors.name}</p>}
                    </div>
                    <div>
                      <label className="text-[#6b7280] text-[12px] block mb-1">Day of Week</label>
                      <div className="flex gap-2">
                        {DAY_PILLS.map(d => (
                          <button key={d.value}
                            onClick={() => setNewRoute(r => ({ ...r, dayOfWeek: d.value }))}
                            className={`flex-1 py-2 rounded-lg text-[13px] border-none cursor-pointer font-medium
                              ${newRoute.dayOfWeek === d.value
                                ? "bg-[#0d9488] text-white"
                                : "bg-[#f0f0f0] text-[#6b7280]"}`}>
                            {d.label}
                          </button>
                        ))}
                      </div>
                      {addErrors.dayOfWeek && <p className="text-[#dc2626] text-[11px] mt-1">{addErrors.dayOfWeek}</p>}
                    </div>
                  </>
                )}

                {/* ── Step 2 ── */}
                {addStep === 2 && (
                  <>
                    <div>
                      <label className="text-[#6b7280] text-[12px] block mb-1">Pickup Location</label>
                      <input type="text" value={newRoute.source}
                        placeholder="Where are they picking up from?"
                        onChange={e => setNewRoute(r => ({ ...r, source: e.target.value }))}
                        className={inputCls(addErrors.source)} />
                      {addErrors.source && <p className="text-[#dc2626] text-[11px] mt-1">{addErrors.source}</p>}
                    </div>
                    <div>
                      <label className="text-[#6b7280] text-[12px] block mb-1">Drop-off Location</label>
                      <input type="text" value={newRoute.destination}
                        placeholder="Where is it going?"
                        onChange={e => setNewRoute(r => ({ ...r, destination: e.target.value }))}
                        className={inputCls(addErrors.destination)} />
                      {addErrors.destination && <p className="text-[#dc2626] text-[11px] mt-1">{addErrors.destination}</p>}
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-[#6b7280] text-[12px] block mb-1">Departure Time</label>
                        <input type="time" value={newRoute.departureTime}
                          onChange={e => setNewRoute(r => ({ ...r, departureTime: e.target.value }))}
                          className={inputCls(false)} />
                      </div>
                      <div className="flex-1">
                        <label className="text-[#6b7280] text-[12px] block mb-1">Arrival Time</label>
                        <input type="time" value={newRoute.arrivalTime}
                          onChange={e => setNewRoute(r => ({ ...r, arrivalTime: e.target.value }))}
                          className={inputCls(false)} />
                      </div>
                    </div>
                    <div>
                      <label className="text-[#6b7280] text-[12px] block mb-1">Vehicle</label>
                      <select value={newRoute.vehicle}
                        onChange={e => setNewRoute(r => ({ ...r, vehicle: e.target.value }))}
                        className={inputCls(addErrors.vehicle)}>
                        <option value="">Select vehicle…</option>
                        <option>F650 26ft Box Truck</option>
                        <option>16ft Small Box Truck</option>
                        <option>IC Van</option>
                        <option>Personal Vehicle</option>
                        <option>Small/Large Box Truck</option>
                      </select>
                      {addErrors.vehicle && <p className="text-[#dc2626] text-[11px] mt-1">{addErrors.vehicle}</p>}
                    </div>
                    <div>
                      <label className="text-[#6b7280] text-[12px] block mb-1">Drivers Needed</label>
                      <div className="flex gap-3">
                        {[{ label: "1 Driver", value: 1 }, { label: "2 Drivers", value: 2 }, { label: "3 Drivers", value: 3 }].map(p => (
                          <button key={p.value}
                            onClick={() => setNewRoute(r => ({ ...r, driversNeeded: p.value }))}
                            className={`flex-1 py-2 rounded-lg text-[13px] border-none cursor-pointer font-medium
                              ${newRoute.driversNeeded === p.value
                                ? "bg-[#0d9488] text-white"
                                : "bg-[#f0f0f0] text-[#6b7280]"}`}>
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* ── Step 3 ── */}
                {addStep === 3 && (
                  <>
                    <div>
                      <label className="text-[#6b7280] text-[12px] block mb-1">First Occurrence Date</label>
                      <input type="date" value={newRoute.firstDate}
                        onChange={e => setNewRoute(r => ({ ...r, firstDate: e.target.value }))}
                        className={inputCls(addErrors.firstDate)} />
                      <p className="text-[#6b7280] text-[11px] mt-1">This will be the first entry in the schedule table</p>
                      {addErrors.firstDate && <p className="text-[#dc2626] text-[11px] mt-1">{addErrors.firstDate}</p>}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#0a2a3a] text-[13px] font-medium">Repeat Weekly</span>
                      <button
                        onClick={() => setNewRoute(r => ({ ...r, repeatsWeekly: !r.repeatsWeekly }))}
                        className={`relative w-11 h-6 rounded-full border-none cursor-pointer transition-colors
                          ${newRoute.repeatsWeekly ? "bg-[#0d9488]" : "bg-[#e5e7eb]"}`}>
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
                          ${newRoute.repeatsWeekly ? "translate-x-5" : "translate-x-0"}`} />
                      </button>
                    </div>
                    {newRoute.repeatsWeekly && (
                      <div>
                        <label className="text-[#6b7280] text-[12px] block mb-1">Repeat Until</label>
                        <input type="date" value={newRoute.repeatUntil}
                          onChange={e => setNewRoute(r => ({ ...r, repeatUntil: e.target.value }))}
                          className={inputCls(addErrors.repeatUntil)} />
                        {addErrors.repeatUntil && <p className="text-[#dc2626] text-[11px] mt-1">{addErrors.repeatUntil}</p>}
                      </div>
                    )}
                    {newRoute.firstDate && (
                      <div className="bg-[#f0fafa] border border-[#ccedeb] rounded-lg px-4 py-3 mt-2">
                        <p className="text-[#09665e] text-[12px]">
                          {newRoute.repeatsWeekly && newRoute.repeatUntil
                            ? `${previewCount} occurrence${previewCount !== 1 ? "s" : ""} will be created from ${formatDateShort(newRoute.firstDate)} to ${formatDateShort(newRoute.repeatUntil)}`
                            : `1 occurrence will be created on ${formatDateShort(newRoute.firstDate)}`}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-[#e5e7eb] flex justify-between">
                {addStep === 1 ? (
                  <button onClick={closeAddModal}
                    className="px-5 py-2 rounded-lg border border-[#e5e7eb] text-[#6b7280] text-[13px] bg-white cursor-pointer hover:border-[#0d9488]">
                    Cancel
                  </button>
                ) : (
                  <button onClick={() => { setAddErrors({}); setAddStep(s => s - 1); }}
                    className="px-5 py-2 rounded-lg border border-[#e5e7eb] text-[#6b7280] text-[13px] bg-white cursor-pointer hover:border-[#0d9488]">
                    ← Back
                  </button>
                )}
                {addStep < 3 ? (
                  <button onClick={() => { if (validateStep(addStep)) setAddStep(s => s + 1); }}
                    className="px-5 py-2 rounded-lg bg-[#09665e] text-white text-[13px] border-none cursor-pointer hover:opacity-90">
                    Next →
                  </button>
                ) : (
                  <button onClick={handleSaveNewRoute}
                    className="px-5 py-2 rounded-lg bg-[#09665e] text-white text-[13px] font-medium border-none cursor-pointer hover:opacity-90">
                    Create Route
                  </button>
                )}
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
