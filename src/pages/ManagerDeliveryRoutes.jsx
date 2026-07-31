// ManagerDeliveryRoutes.jsx — Master-detail route template + schedule view
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  X, Plus, MapPin, Clock, Truck, Users, Pencil, MoreHorizontal, Trash2, ChevronDown,
} from "lucide-react";
import { db } from "../firebase";
import { ref, onValue, update, push, set, remove } from "firebase/database";
import MobileHeroShell from "../components/MobileHeroShell";
import SidebarLiquid from "../components/SidebarLiquid";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import "./ManagerDeliveryRoutes.css";
import MobileNav from "../components/MobileNav";

// ── Constants ─────────────────────────────────────────────────────────────────
const DAY_ORDER = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
const VEHICLES  = ["F650 26ft Box Truck","16ft Small Box Truck","IC Van","Personal Vehicle","Small/Large Box Truck"];

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
  const target = DAY_ORDER.indexOf(dayOfWeek);
  if (existingDates.length > 0) {
    const sorted = [...existingDates].sort();
    const latest = new Date(sorted[sorted.length - 1] + "T12:00:00");
    latest.setDate(latest.getDate() + 7);
    return latest.toISOString().slice(0, 10);
  }
  const now = new Date();
  const todayDow = (now.getDay() + 6) % 7;
  let daysUntil = (target - todayDow + 7) % 7;
  if (daysUntil === 0) daysUntil = 7;
  const result = new Date(now);
  result.setDate(now.getDate() + daysUntil);
  return result.toISOString().slice(0, 10);
}
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

// ── Custom Vehicle Dropdown ───────────────────────────────────────────────────
// Same pattern as Assign To / Priority / Sort — custom trigger + floating panel,
// never a native <select>. Used in both Edit modal and Add wizard.
function VehicleDropdown({ value, onChange, hasError }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const borderCls = hasError
    ? "border-[#dc2626]"
    : open
    ? "border-[#09665e]"
    : "border-[#e5e7eb] hover:border-[#d1d5db]";

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className={`flex items-center justify-between gap-2 w-full h-[44px] px-[14px]
          border rounded-[10px] bg-white cursor-pointer transition-colors
          font-[400] text-[14px] leading-[20px]
          ${value ? "text-[#0a2a3a]" : "text-[#d1d5db]"}
          ${borderCls}`}
      >
        <span>{value || "Select vehicle…"}</span>
        <ChevronDown
          size={10}
          className={`text-[#6b7280] transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute top-[calc(100%+4px)] left-0 right-0 z-20
            bg-white border border-[#e5e7eb] rounded-[12px]
            shadow-[0_8px_24px_rgba(10,42,58,.14)] py-[6px] max-h-[220px] overflow-y-auto"
        >
          {VEHICLES.map(v => (
            <button
              key={v}
              type="button"
              role="option"
              aria-selected={value === v}
              onClick={() => { onChange(v); setOpen(false); }}
              className={`block w-full text-left border-0 rounded-[8px] px-[10px] py-[9px]
                text-[14px] leading-[20px] cursor-pointer transition-colors
                ${value === v
                  ? "bg-[#0A2A3A] text-white font-semibold"
                  : "bg-transparent text-[#0a2a3a] hover:bg-[#f5f5f5]"}`}
            >
              {v}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Segmented Drivers Needed ──────────────────────────────────────────────────
// Plain segmented control — all options same colour when active (no per-option
// tone), used in both wizard and Edit modal.
function SegmentedDrivers({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3].map(n => (
        <button
          key={n}
          type="button"
          aria-pressed={value === n}
          onClick={() => onChange(n)}
          className={`flex-1 h-[40px] rounded-[10px] cursor-pointer text-[14px] font-medium
            transition-colors border
            ${value === n
              ? "bg-[#0d9488] border-[#0d9488] text-white font-semibold"
              : "bg-white border-[#e5e7eb] text-[#6b7280] hover:border-[#d1d5db]"}`}
        >
          {n} {n === 1 ? "Driver" : "Drivers"}
        </button>
      ))}
    </div>
  );
}

// ── Driver input with autocomplete ───────────────────────────────────────────
// Defined outside main component — stable reference, no remount on parent render.
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

  if (value && !editing) {
    return (
      <span
        onClick={() => {
          setEditing(true);
          setInputVal(value);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="bg-[#E6F5F3] text-[#09665e] text-[11px] px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 inline-block">
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
let _persistedSelectedId = null;
let _cachedTemplates     = {};

// ── Main component ────────────────────────────────────────────────────────────
export default function ManagerDeliveryRoutes() {
  const navigate = useNavigate();
  const { pantryId, displayName, initials, logout } = useAuth();

  const [templates,   _setTemplates]   = useState(_cachedTemplates);
  const [occurrences, setOccurrences]  = useState([]);
  const [volunteers,  setVolunteers]   = useState([]);
  const [selectedId,  _setSelectedId]  = useState(_persistedSelectedId);
  const [mobileFilter, setMobileFilter] = useState('All');
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
  const [deleteConfirmId,           setDeleteConfirmId]           = useState(null);
  const [occurrenceDeleteConfirmId, setOccurrenceDeleteConfirmId] = useState(null);

  // Floating popover state — tracks which kebab is open + fixed position
  const [popover, setPopover] = useState({ open: false, routeId: null, top: 0, left: 0 });

  // Wrap setters so module-level cache stays in sync
  function setTemplates(data) {
    _cachedTemplates = data;
    _setTemplates(data);
  }
  function setSelectedId(id) {
    _persistedSelectedId = id;
    _setSelectedId(id);
  }

  // Firebase listeners
  useEffect(() => {
    return onValue(ref(db, `pantries/${pantryId}/routeTemplates`), snap => {
      const data = snap.val();
      if (data) setTemplates(data);
    });
  }, [pantryId]); // eslint-disable-line

  useEffect(() => {
    return onValue(ref(db, `pantries/${pantryId}/routeOccurrences`), snap => {
      const data = snap.val();
      setOccurrences(data
        ? Object.entries(data).map(([id, val]) => ({ id, ...val }))
        : []);
    });
  }, [pantryId]);

  useEffect(() => {
    return onValue(ref(db, 'volunteers'), snap => {
      const data = snap.val();
      setVolunteers(data ? Object.entries(data).map(([id, v]) => ({ id, ...v })) : []);
    });
  }, [pantryId]);

  const templatesList = Object.entries(templates).map(([id, t]) => ({ id, ...t }));
  const sorted = sortTemplates(templatesList);

  useEffect(() => {
    if (sorted.length === 0 || selectedId) return;
    const today = getTodayDayKey();
    const match = sorted.find(t => t.dayOfWeek === today) || sorted[0];
    if (match) setSelectedId(match.id);
  }, [templates]); // eslint-disable-line

  useEffect(() => {
    if (pendingSelectId && templates[pendingSelectId]) {
      setSelectedId(pendingSelectId);
      setPendingSelectId(null);
    }
  }, [templates, pendingSelectId]); // eslint-disable-line

  const selectedTemplate = templates[selectedId]
    ? { id: selectedId, ...templates[selectedId] }
    : null;

  const drivers = volunteers.filter(v => v.isDriver === true);

  const templateOccs = occurrences
    .filter(o => o.templateId === selectedId)
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  const today = getTodayStr();
  const monthGroups = groupByMonth(templateOccs);

  // ── Popover helpers ───────────────────────────────────────────────────────
  function openPopover(e, routeId) {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    setPopover({ open: true, routeId, top: r.bottom + 6, left: Math.max(8, r.right - 160) });
  }
  function closePopover() {
    setPopover(p => ({ ...p, open: false, routeId: null }));
  }

  // Close popover on outside click
  useEffect(() => {
    function handleClick() { if (popover.open) closePopover(); }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [popover.open]);

  // ── Add-modal helpers ─────────────────────────────────────────────────────
  function closeAddModal() {
    setShowAddModal(false);
    setAddStep(1);
    setNewRoute({ name:"", dayOfWeek:"", source:"", destination:"",
      departureTime:"", arrivalTime:"", vehicle:"", driversNeeded:1,
      firstDate:"", repeatsWeekly:false, repeatUntil:"" });
    setAddErrors({});
  }

  function formatDateShortLocal(dateStr) {
    return formatDateShort(dateStr);
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
        if (!newRoute.repeatUntil)                           errs.repeatUntil = "Repeat until date is required";
        else if (newRoute.repeatUntil <= newRoute.firstDate) errs.repeatUntil = "Must be after first date";
      }
    }
    setAddErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSaveNewRoute() {
    try {
      const templateId = newRoute.name.toLowerCase()
        .replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + newRoute.dayOfWeek;

      await set(ref(db, `pantries/${pantryId}/routeTemplates/${templateId}`), {
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
        await push(ref(db, `pantries/${pantryId}/routeOccurrences`), {
          templateId, date,
          drivers: [], status: "pending", isSpecial: false,
          specialNote: "", notes: "", createdAt: Date.now(),
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

  // ── Handlers ───────────────────────────────────────────────────────────────
  async function handleDeleteRoute(templateId) {
    try {
      await remove(ref(db, `pantries/${pantryId}/routeTemplates/${templateId}`));
      const toDelete = occurrences.filter(o => o.templateId === templateId);
      for (const occ of toDelete) {
        await remove(ref(db, `pantries/${pantryId}/routeOccurrences/${occ.id}`));
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
    await push(ref(db, `pantries/${pantryId}/routeOccurrences`), {
      templateId: selectedTemplate.id, date: newDate,
      drivers: [], status: "pending", notes: "", specialNote: "",
      isSpecial: false, createdAt: Date.now(),
    });
  }

  async function handleDeleteOccurrence(occurrenceId) {
    await remove(ref(db, `pantries/${pantryId}/routeOccurrences/${occurrenceId}`));
  }

  async function handleDriverAssign(occurrenceId, driverIndex, value, currentDrivers) {
    const normalized = Array.isArray(currentDrivers)
      ? currentDrivers
      : currentDrivers && typeof currentDrivers === "object"
      ? Object.values(currentDrivers)
      : [];
    const updatedDrivers = [...normalized];
    updatedDrivers[driverIndex] = value;
    const filledSlots = updatedDrivers.filter(d => d && typeof d === "string" && d.trim()).length;
    const tmplNeeded = Number(templates[selectedId]?.driversNeeded) || driversNeeded;
    const newStatus = filledSlots >= tmplNeeded ? "inProgress" : "pending";
    await update(ref(db, `pantries/${pantryId}/routeOccurrences/${occurrenceId}`), {
      drivers: updatedDrivers, status: newStatus,
    });
  }

  const driversNeeded = selectedTemplate ? Number(selectedTemplate.driversNeeded) || 1 : 1;

  // Info grid — 3 semantic groups per reference
  const infoGroups = selectedTemplate ? [
    {
      label: "Locations",
      facts: [
        { icon: MapPin, label: "Pickup",   value: selectedTemplate.source      },
        { icon: MapPin, label: "Drop-off", value: selectedTemplate.destination },
      ].filter(f => f.value),
    },
    {
      label: "Schedule",
      facts: [
        { icon: Clock, label: "Departs", value: selectedTemplate.departureTime },
        { icon: Clock, label: "Arrives", value: selectedTemplate.arrivalTime   },
      ].filter(f => f.value),
    },
    {
      label: "Resources",
      facts: [
        { icon: Truck, label: "Vehicle",         value: selectedTemplate.vehicle },
        { icon: Users, label: "Drivers needed",  value: selectedTemplate.driversNeeded
            ? `${selectedTemplate.driversNeeded} ${selectedTemplate.driversNeeded === 1 ? "driver" : "drivers"}` : null },
      ].filter(f => f.value),
    },
  ] : [];

  // ── Shared field style helpers ────────────────────────────────────────────
  const inputCls = (err) =>
    `w-full border ${err ? "border-[#dc2626]" : "border-[#e5e7eb]"} rounded-[10px]
     h-[44px] px-[14px] text-[14px] text-[#0a2a3a] bg-white
     focus:outline-none focus:border-[#09665e] transition-colors`;
  const labelCls = "text-[#0a2a3a] text-[13px] font-medium mb-1.5 block";
  const fieldErrCls = "text-[#dc2626] text-[12px] font-medium mt-1";

  const previewCount = newRoute.firstDate && newRoute.repeatsWeekly && newRoute.repeatUntil
    ? countOccurrences(newRoute.firstDate, newRoute.repeatUntil, newRoute.dayOfWeek)
    : 1;

  const WIZARD_STEP_TITLES = { 1: "Route Info", 2: "Route Details", 3: "First Schedule" };

  const DAY_PILLS = [
    { label: "Mon", value: "monday" },
    { label: "Tue", value: "tuesday" },
    { label: "Wed", value: "wednesday" },
    { label: "Thu", value: "thursday" },
    { label: "Fri", value: "friday" },
  ];

  return (
    <div className="min-h-screen bg-[#D3EDE9]"
      style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* ══════════════════════════════════════════════════════════════════════
          MOBILE LAYOUT
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden min-h-screen bg-[#D3EDE9] flex flex-col"
        style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

        {/* Gradient hero */}
        <MobileHeroShell>
          <MobileNav mode="delivery" />
          <div style={{ padding: '12px 20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Stat row: Routes tag + big number + signal bars */}
          <div className="flex items-end justify-between">
            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full w-fit"
                style={{ background: '#E6F5F3', color: '#09665E' }}>Routes</span>
              <p className="m-0 text-[56px] leading-[1]" style={{ fontWeight: 700 }}>{sorted.length}</p>
            </div>
            <div className="flex items-end gap-[3px]" style={{ height: 32 }}>
              {[10, 16, 22, 32].map((h, i) => (
                <span key={i} style={{ width: 6, height: h, borderRadius: 2, background: '#0D9488', display: 'block' }} />
              ))}
            </div>
          </div>

          <p className="m-0 text-[12px]" style={{ color: '#D1D6DB' }}>
            {drivers.length} drivers active
          </p>
          </div>{/* /inner padding */}
        </MobileHeroShell>

        {/* Create Route button */}
        <div className="px-3 pt-[15px]">
          <button onClick={() => { setShowAddModal(true); setAddStep(1); }}
            className="w-full h-12 rounded-full text-[14px] font-semibold text-white border-none cursor-pointer flex items-center justify-center"
            style={{ background: '#0F7A70' }}>
            + Create Route
          </button>
        </div>

        {/* Active Routes card */}
        <div className="mt-[15px] bg-white rounded-t-[20px] p-6 flex flex-col gap-5 flex-1">
          <div className="flex items-center justify-between">
            <h2 className="m-0 text-[21px] font-semibold text-[#0A2A3A]">Active Routes</h2>
            <button className="text-[12px] font-medium text-[#565E6C] bg-transparent border-none cursor-pointer p-0">
              View all
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {['All', 'Morning', 'Afternoon', 'Evening'].map(f => (
              <button key={f} onClick={() => setMobileFilter(f)}
                className="h-9 px-4 rounded-full text-[13px] cursor-pointer border-none"
                style={mobileFilter === f
                  ? { background: '#0A2A3A', color: '#fff', fontWeight: 600 }
                  : { background: '#fff', border: '1px solid #E5E7EB', color: '#6B7280', fontWeight: 500 }}>
                {f}
              </button>
            ))}
          </div>

          <div className="flex flex-col">
            {(() => {
              const today = getTodayStr();
              const todayOccs = occurrences.filter(o => o.date === today);
              const merged = todayOccs.map(o => {
                const tmpl = templates[o.templateId] || {};
                return {
                  ...o,
                  name: tmpl.name || '',
                  departureTime: o.overrideDepartureTime || tmpl.departureTime || '',
                };
              }).filter(r => {
                if (mobileFilter === 'All') return true;
                const t = r.departureTime || '';
                const m = t.match(/(\d+)(?::(\d+))?\s*(am|pm)/i);
                if (!m) return false;
                let h = +m[1];
                if (/pm/i.test(m[3]) && h < 12) h += 12;
                if (/am/i.test(m[3]) && h === 12) h = 0;
                const slot = h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening';
                return slot === mobileFilter;
              });
              if (merged.length === 0) return (
                <p className="m-0 text-center text-[#9ca3af] text-[14px] py-6">No routes for today</p>
              );
              return merged.map((r, i) => (
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
          DESKTOP LAYOUT
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex min-h-screen">

        <SidebarLiquid mode="delivery" />

        <div className="lg:ml-[var(--sidebar-w)] flex-1 flex flex-col" style={{ height: "100vh" }}>

          {/* PageHeader */}
          <div className="px-6 pt-5 pb-3 shrink-0">
            <PageHeader
              initials={initials}
              label="Routes"
              action={{
                label: "+ Add Route",
                onClick: () => { setShowAddModal(true); setAddStep(1); },
              }}
            />
          </div>

          {/* Master-detail shell */}
          <div className="flex flex-1 overflow-hidden mx-6 mb-6 bg-white border border-[#e5e7eb]
            rounded-[20px] shadow-[0_1px_2px_rgba(10,42,58,.04),0_8px_20px_rgba(10,42,58,.05)]">

            {/* ── Left: route list (tablist) ── */}
            <div
              role="tablist"
              aria-orientation="vertical"
              aria-label="Routes"
              className="w-[260px] min-w-[260px] border-r border-[#e5e7eb] overflow-y-auto flex flex-col"
            >
              <div className="px-5 pt-4 pb-3 shrink-0">
                <p className="text-[11px] text-[#6b7280] uppercase tracking-[.06em] font-semibold">Routes</p>
              </div>

              {sorted.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 p-4 text-center">
                  <p className="text-[#6b7280] text-[12px]">Loading templates…</p>
                </div>
              ) : (
                sorted.map((tmpl, i) => {
                  const active = tmpl.id === selectedId;
                  return (
                    <div
                      key={tmpl.id}
                      role="tab"
                      id={`tab-${tmpl.id}`}
                      aria-selected={active}
                      aria-controls={`panel-${tmpl.id}`}
                      tabIndex={active ? 0 : -1}
                      onClick={() => setSelectedId(tmpl.id)}
                      onKeyDown={e => {
                        let nextIdx = null;
                        if (e.key === "ArrowDown") nextIdx = (i + 1) % sorted.length;
                        else if (e.key === "ArrowUp") nextIdx = (i - 1 + sorted.length) % sorted.length;
                        else if (e.key === "Home") nextIdx = 0;
                        else if (e.key === "End") nextIdx = sorted.length - 1;
                        if (nextIdx !== null) {
                          e.preventDefault();
                          const next = sorted[nextIdx];
                          setSelectedId(next.id);
                          document.getElementById(`tab-${next.id}`)?.focus();
                        }
                      }}
                      className={`relative group px-5 py-3 cursor-pointer border-b border-[#f5f5f5]
                        transition-colors outline-none focus-visible:outline-2
                        focus-visible:outline-[#09665e] focus-visible:-outline-offset-2
                        ${active ? "bg-[#0a2a3a]" : "hover:bg-[#f5f5f5]"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className={`text-[14px] font-medium leading-[20px] truncate
                            ${active ? "text-white font-semibold" : "text-[#0a2a3a]"}`}>
                            {tmpl.name}
                          </p>
                          <p className={`text-[13px] leading-[18px] mt-0.5 capitalize
                            ${active ? "text-white/70" : "text-[#6b7280]"}`}>
                            {tmpl.dayOfWeek}
                          </p>
                        </div>

                        {/* Kebab — nested button inside role="tab" div (div allows nesting, button does not) */}
                        <button
                          type="button"
                          aria-haspopup="menu"
                          aria-label={`Actions for ${tmpl.name}`}
                          onClick={e => openPopover(e, tmpl.id)}
                          className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-[6px]
                            border-none cursor-pointer transition-all
                            opacity-0 group-hover:opacity-100 focus:opacity-100
                            ${active
                              ? "text-white/70 hover:bg-white/16 hover:text-white"
                              : "text-[#6b7280] hover:bg-[#e5e7eb]"}`}
                        >
                          <MoreHorizontal size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ── Right: detail panel ── */}
            <div
              className="flex-1 overflow-y-auto bg-white"
            >
              {!selectedTemplate ? (
                <div className="flex flex-col items-center justify-center h-full py-20">
                  <Truck size={40} color="#E6F5F3" />
                  <p className="text-[#0a2a3a] text-[15px] font-semibold mt-3">Select a route</p>
                  <p className="text-[#6b7280] text-[13px] mt-1">Choose a route from the left panel</p>
                </div>
              ) : (
                // key={selectedId} forces remount on route switch, which re-triggers the CSS animation
                <div
                  key={selectedId}
                  role="tabpanel"
                  id={`panel-${selectedId}`}
                  aria-labelledby={`tab-${selectedId}`}
                  tabIndex={0}
                  className="route-detail-animate flex flex-col outline-none"
                >
                  {/* Route info header — gradient hero matching routes.html .hero-card */}
                  <div className="p-5 pb-0">
                    <div
                      className="rounded-[25px] px-8 py-7"
                      style={{ background: "linear-gradient(100deg, #0D9488 0.1%, #0A2A3A 99.8%)" }}
                    >
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-[10px]">
                          <h2 className="text-[22px] font-bold leading-[28px] tracking-[-0.01em] text-white">
                            {selectedTemplate.name}
                          </h2>
                          <span className="text-[12px] font-semibold px-3 py-1 rounded-full capitalize leading-[16px]"
                            style={{ background: "rgba(255,255,255,.14)", color: "#fff" }}>
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
                          className="flex items-center gap-[6px] border-none bg-transparent cursor-pointer
                            text-[14px] font-medium hover:opacity-100 transition-opacity"
                          style={{ color: "rgba(255,255,255,.72)" }}
                        >
                          <Pencil size={14} />
                          Edit
                        </button>
                      </div>

                      {/* Info grid — 3 semantic groups */}
                      <div className="grid grid-cols-3 gap-8">
                        {infoGroups.map(group => (
                          <div key={group.label}>
                            <p className="text-[11px] font-semibold uppercase tracking-[.06em] mb-[14px]"
                              style={{ color: "rgba(255,255,255,.6)" }}>
                              {group.label}
                            </p>
                            {group.facts.map(f => (
                              <div key={f.label} className="flex items-start gap-2 mb-[14px] last:mb-0">
                                <f.icon size={15} className="shrink-0 mt-[2px]" style={{ color: "rgba(255,255,255,.7)" }} />
                                <div>
                                  <p className="text-[13px] leading-[18px]" style={{ color: "rgba(255,255,255,.72)" }}>{f.label}</p>
                                  <p className="text-[14px] font-semibold leading-[20px] text-white mt-[1px]">
                                    {f.value}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Schedule section */}
                  <div className="px-7 pt-6 pb-6">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[#0a2a3a] text-[17px] font-semibold leading-[22px]">Schedule</p>
                      <button onClick={handleAddOccurrence}
                        className="text-[#09665e] text-[14px] font-medium bg-transparent border-none
                          cursor-pointer hover:opacity-70 transition-opacity">
                        + Add Occurrence
                      </button>
                    </div>

                    {templateOccs.length === 0 ? (
                      <div className="text-center py-[60px] flex flex-col items-center gap-1">
                        <p className="text-[#0a2a3a] text-[14px]">No occurrences yet.</p>
                        <button onClick={handleAddOccurrence}
                          className="text-[#09665e] text-[14px] font-semibold bg-transparent border-none
                            cursor-pointer underline hover:opacity-70">
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
                                        <button onClick={() => setOccurrenceDeleteConfirmId(occ.id)}
                                          className="text-[#d1d5db] hover:text-[#dc2626] transition-colors bg-transparent border-none cursor-pointer p-0.5 rounded">
                                          <X size={13} />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                }

                                const rawDrivers = occ.drivers;
                                const occDrivers = Array.isArray(rawDrivers)
                                  ? rawDrivers
                                  : rawDrivers && typeof rawDrivers === "object"
                                  ? Object.values(rawDrivers)
                                  : [];
                                const driver0 = occDrivers[0] || "";
                                const driver1 = occDrivers[1] || "";
                                const driver2 = occDrivers[2] || "";
                                const slotsFilled = occDrivers.filter(d => d && typeof d === "string" && d.trim()).length;

                                return (
                                  <tr key={occ.id} className="border-b border-[#f3f4f6] h-[44px]">
                                    <td className={`text-[12px] pr-4 ${isPast ? "text-[#6b7280]" : "text-[#0a2a3a] font-medium"}`}>
                                      {formatDateShort(occ.date)}
                                    </td>
                                    <td className="pr-3 py-1">
                                      {isPast ? (
                                        driver0
                                          ? <span className="bg-[#E6F5F3] text-[#09665e] text-[11px] px-2 py-0.5 rounded-full">{driver0}</span>
                                          : <span className="text-[#6b7280]">—</span>
                                      ) : (
                                        <DriverInput key={`${occ.id}-0-${!!driver0}`} value={driver0}
                                          occKey={occ.id} driverIndex={0} currentDrivers={occDrivers}
                                          drivers={drivers} onSave={handleDriverAssign} />
                                      )}
                                    </td>
                                    {driversNeeded >= 2 && (
                                      <td className="pr-3 py-1">
                                        {isPast ? (
                                          driver1
                                            ? <span className="bg-[#E6F5F3] text-[#09665e] text-[11px] px-2 py-0.5 rounded-full">{driver1}</span>
                                            : <span className="text-[#6b7280]">—</span>
                                        ) : (
                                          <DriverInput key={`${occ.id}-1-${!!driver1}`} value={driver1}
                                            occKey={occ.id} driverIndex={1} currentDrivers={occDrivers}
                                            drivers={drivers} onSave={handleDriverAssign} />
                                        )}
                                      </td>
                                    )}
                                    {driversNeeded >= 3 && (
                                      <td className="pr-3 py-1">
                                        {isPast ? (
                                          driver2
                                            ? <span className="bg-[#E6F5F3] text-[#09665e] text-[11px] px-2 py-0.5 rounded-full">{driver2}</span>
                                            : <span className="text-[#6b7280]">—</span>
                                        ) : (
                                          <DriverInput key={`${occ.id}-2-${!!driver2}`} value={driver2}
                                            occKey={occ.id} driverIndex={2} currentDrivers={occDrivers}
                                            drivers={drivers} onSave={handleDriverAssign} />
                                        )}
                                      </td>
                                    )}
                                    <td className="pr-3">
                                      {isPast ? (
                                        <span className={`text-[11px] font-medium ${
                                          occ.status === "complete"   ? "text-[#34c759]" :
                                          occ.status === "incomplete" ? "text-[#dc2626]" : "text-[#6b7280]"}`}>
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
                                    <td className="text-[#6b7280] text-[12px]">{occ.notes || ""}</td>
                                    <td className="py-1 text-right pr-1">
                                      <button onClick={() => setOccurrenceDeleteConfirmId(occ.id)}
                                        className="text-[#d1d5db] hover:text-[#dc2626] transition-colors bg-transparent border-none cursor-pointer p-0.5 rounded">
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

      {/* ── Floating kebab popover — fixed outside list, survives re-renders ─── */}
      {popover.open && (
        <>
          <div className="fixed inset-0 z-40" onClick={closePopover} />
          <div
            role="menu"
            aria-label="Route actions"
            style={{ top: popover.top, left: popover.left }}
            className="fixed z-50 min-w-[160px] bg-white border border-[#e5e7eb]
              rounded-[20px] shadow-[0_12px_32px_rgba(10,42,58,.28)] p-4"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                const routeId = popover.routeId;
                closePopover();
                setDeleteConfirmId(routeId);
              }}
              className="border-none bg-none p-0 cursor-pointer text-[15px] font-semibold
                text-[#dc2626] hover:opacity-70 transition-opacity"
            >
              Delete Route
            </button>
          </div>
        </>
      )}

      {/* ── Edit Route Modal ──────────────────────────────────────────────── */}
      {showEditPopup && (
        <div className="fixed inset-0 bg-black/[.45] z-50 flex items-center justify-center"
          onClick={() => setShowEditPopup(false)}>
          <div className="bg-white rounded-[20px] shadow-[0_24px_60px_rgba(10,42,58,.28)]
            w-full max-w-[480px] mx-4 p-7"
            onClick={e => e.stopPropagation()}>

            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-[.06em]">Edit Route</p>
                <h3 className="text-[20px] font-semibold leading-[26px] mt-[2px] text-[#0a2a3a]">
                  {editFields.name || "Route"}
                </h3>
              </div>
              <button onClick={() => setShowEditPopup(false)}
                className="w-7 h-7 grid place-items-center rounded-[8px] border-none
                  bg-none cursor-pointer text-[#6b7280] hover:bg-[#f5f5f5] transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-[18px]">
              {[
                { label: "Route Name",        field: "name"          },
                { label: "Pickup Location",   field: "source",       placeholder: "Where are they picking up from?" },
                { label: "Drop-off Location", field: "destination",  placeholder: "Where is it going?" },
              ].map(({ label, field, placeholder }) => (
                <div key={field} className="flex flex-col gap-[6px]">
                  <label className={labelCls}>{label}</label>
                  <input
                    type="text"
                    value={editFields[field] || ""}
                    placeholder={placeholder || ""}
                    onChange={e => setEditFields(f => ({ ...f, [field]: e.target.value }))}
                    className={inputCls(false)}
                  />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Departure Time", field: "departureTime", placeholder: "--:-- --" },
                  { label: "Arrival Time",   field: "arrivalTime",   placeholder: "--:-- --" },
                ].map(({ label, field, placeholder }) => (
                  <div key={field} className="flex flex-col gap-[6px]">
                    <label className={labelCls}>{label}</label>
                    <input type="text" value={editFields[field] || ""} placeholder={placeholder}
                      onChange={e => setEditFields(f => ({ ...f, [field]: e.target.value }))}
                      className={inputCls(false)} />
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-[6px]">
                <label className={labelCls}>Vehicle</label>
                <VehicleDropdown
                  value={editFields.vehicle || ""}
                  onChange={v => setEditFields(f => ({ ...f, vehicle: v }))}
                  hasError={false}
                />
              </div>

              <div className="flex flex-col gap-[6px]">
                <label className={labelCls}>Drivers Needed</label>
                <SegmentedDrivers
                  value={editFields.driversNeeded || 1}
                  onChange={n => setEditFields(f => ({ ...f, driversNeeded: n }))}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowEditPopup(false)}
                className="flex-1 h-[44px] rounded-full border border-[#e5e7eb] bg-white
                  text-[#0a2a3a] text-[14px] font-semibold cursor-pointer hover:bg-[#f5f5f5] transition-colors">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!selectedTemplate) return;
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
                  update(ref(db, `pantries/${pantryId}/routeTemplates/${capturedId}`), templateUpdate)
                    .then(() => {
                      setTemplates({ ..._cachedTemplates, [capturedId]: { ..._cachedTemplates[capturedId], ...templateUpdate } });
                      setShowEditPopup(false);
                    })
                    .catch(err => console.error("Failed to save route template:", err));
                }}
                className="flex-1 h-[44px] rounded-full bg-[#09665e] text-white text-[14px]
                  font-semibold border-none cursor-pointer hover:bg-[#0f7a70] transition-colors">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ────────────────────────────────────── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/[.45] z-50 flex items-center justify-center"
          onClick={() => setDeleteConfirmId(null)}>
          <div className="bg-white rounded-[20px] border border-[#e5e7eb] w-full max-w-[360px] mx-4 p-7"
            onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center">
              <Trash2 size={32} color="#dc2626" className="mb-3" />
              <p className="text-[#0a2a3a] text-[20px] font-semibold leading-[26px]">Delete Route?</p>
              <p className="text-[#6b7280] text-[14px] mt-3 leading-[20px]">
                This will permanently delete{" "}
                <span className="font-semibold text-[#0a2a3a]">
                  {templates[deleteConfirmId]?.name || "this route"}
                </span>{" "}
                and all its scheduled occurrences. This cannot be undone.
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)}
                className="flex-1 h-[44px] rounded-full bg-white border border-[#e5e7eb]
                  text-[#0a2a3a] text-[14px] font-semibold cursor-pointer hover:bg-[#f5f5f5] transition-colors">
                Cancel
              </button>
              <button onClick={() => handleDeleteRoute(deleteConfirmId)}
                className="flex-1 h-[44px] rounded-full bg-[#dc2626] text-white text-[14px]
                  font-semibold border-none cursor-pointer hover:bg-[#b91c1c] transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Occurrence Delete Confirmation ───────────────────────────────── */}
      {occurrenceDeleteConfirmId && (
        <div className="fixed inset-0 bg-black/[.45] z-50 flex items-center justify-center"
          onClick={() => setOccurrenceDeleteConfirmId(null)}>
          <div className="bg-white rounded-[20px] border border-[#e5e7eb] w-full max-w-[360px] mx-4 p-7"
            onClick={e => e.stopPropagation()}>
            <p className="font-bold text-[20px] text-[#0a2a3a] m-0 leading-[28px]">
              Remove this occurrence? This can't be undone.
            </p>
            <div className="flex gap-3 mt-7">
              <button onClick={() => setOccurrenceDeleteConfirmId(null)}
                className="flex-1 h-[44px] rounded-full bg-white border border-[#e5e7eb]
                  text-[#0a2a3a] text-[14px] font-semibold cursor-pointer hover:bg-[#f5f5f5] transition-colors">
                Cancel
              </button>
              <button onClick={() => { handleDeleteOccurrence(occurrenceDeleteConfirmId); setOccurrenceDeleteConfirmId(null); }}
                className="flex-1 h-[44px] rounded-full bg-[#dc2626] text-white text-[14px]
                  font-semibold border-none cursor-pointer hover:bg-[#b91c1c] transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Route Wizard ─────────────────────────────────────────────── */}
      {/*
        [FLAGGED] Step 1 ("Route Info") was INFERRED from the final route data shape —
        the original reference screenshots only showed Step 2 and Step 3. The fields
        (route name + day of week) are required by the template schema, so Step 1
        collects them as a logical precursor. Confirm this is correct before treating
        it as spec-compliant.

        [FLAGGED] "+ Add Occurrence" is a lightweight append (next date + 7 days),
        separate from the wizard's Step 3 first-schedule form. Confirm these are
        intentionally distinct flows and not the same UX entry point.

        [FLAGGED] Drivers Needed uses the segmented control in both this wizard and
        the Edit modal. The original Edit modal reference showed a native <select>.
        Segmented was chosen as the unified pattern. Flag if that contradicts spec.

        [CONFIRMED] Validation on Step 2 fires on attempted "Next" only, not on
        keystroke or blur. This matches the reference comment: "shown only after an
        attempted submit, not while the field is merely empty and untouched."
      */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/[.45] z-50 flex items-center justify-center"
          onClick={closeAddModal}>
          <div className="bg-white rounded-[20px] shadow-[0_24px_60px_rgba(10,42,58,.28)]
            w-full max-w-[480px] mx-4"
            onClick={e => e.stopPropagation()}>

            {/* Wizard header */}
            <div className="flex items-start justify-between px-7 pt-7 mb-4">
              <div>
                <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-[.06em]">
                  Step {addStep} of 3
                </p>
                <h3 className="text-[20px] font-semibold leading-[26px] mt-[2px] text-[#0a2a3a]">
                  {WIZARD_STEP_TITLES[addStep]}
                </h3>
              </div>
              <button onClick={closeAddModal}
                className="w-7 h-7 grid place-items-center rounded-[8px] border-none
                  bg-none cursor-pointer text-[#6b7280] hover:bg-[#f5f5f5] transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* 3-segment progress track */}
            <div className="flex gap-1 px-7 mb-6">
              {[1, 2, 3].map(n => (
                <div key={n} className={`flex-1 h-1 rounded-full transition-colors
                  ${n <= addStep ? "bg-[#0d9488]" : "bg-[#e5e7eb]"}`} />
              ))}
            </div>

            {/* Step content */}
            <div className="px-7 pb-2 flex flex-col gap-[18px]">

              {/* ── Step 1: Route Info ── */}
              {addStep === 1 && (
                <>
                  <div className="flex flex-col gap-[6px]">
                    <label className={labelCls} htmlFor="wiz-name">Route Name</label>
                    <input
                      id="wiz-name"
                      type="text"
                      value={newRoute.name}
                      placeholder="e.g. Wawa"
                      onChange={e => setNewRoute(r => ({ ...r, name: e.target.value }))}
                      className={inputCls(addErrors.name)}
                    />
                    {addErrors.name && <p className={fieldErrCls}>{addErrors.name}</p>}
                  </div>

                  <div className="flex flex-col gap-[6px]">
                    <label className={labelCls}>Day of Week</label>
                    <div className="flex gap-[6px] flex-wrap">
                      {DAY_PILLS.map(d => (
                        <button
                          key={d.value}
                          type="button"
                          aria-pressed={newRoute.dayOfWeek === d.value}
                          onClick={() => setNewRoute(r => ({ ...r, dayOfWeek: d.value }))}
                          className={`h-9 px-[14px] rounded-full border cursor-pointer
                            text-[13px] font-medium transition-colors
                            ${newRoute.dayOfWeek === d.value
                              ? "bg-[#0a2a3a] border-[#0a2a3a] text-white font-semibold"
                              : "bg-white border-[#e5e7eb] text-[#6b7280] hover:border-[#d1d5db]"}`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                    {addErrors.dayOfWeek && <p className={fieldErrCls}>{addErrors.dayOfWeek}</p>}
                  </div>
                </>
              )}

              {/* ── Step 2: Route Details ── */}
              {addStep === 2 && (
                <>
                  <div className="flex flex-col gap-[6px]">
                    <label className={labelCls} htmlFor="wiz-pickup">Pickup Location</label>
                    <input id="wiz-pickup" type="text" value={newRoute.source}
                      placeholder="Where are they picking up from?"
                      onChange={e => setNewRoute(r => ({ ...r, source: e.target.value }))}
                      className={inputCls(addErrors.source)} />
                    {addErrors.source && <p className={fieldErrCls}>{addErrors.source}</p>}
                  </div>

                  <div className="flex flex-col gap-[6px]">
                    <label className={labelCls} htmlFor="wiz-dropoff">Drop-off Location</label>
                    <input id="wiz-dropoff" type="text" value={newRoute.destination}
                      placeholder="Where is it going?"
                      onChange={e => setNewRoute(r => ({ ...r, destination: e.target.value }))}
                      className={inputCls(addErrors.destination)} />
                    {addErrors.destination && <p className={fieldErrCls}>{addErrors.destination}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-[6px]">
                      <label className={labelCls}>Departure Time</label>
                      <input type="text" value={newRoute.departureTime}
                        placeholder="--:-- --"
                        onChange={e => setNewRoute(r => ({ ...r, departureTime: e.target.value }))}
                        className={inputCls(false)} />
                    </div>
                    <div className="flex flex-col gap-[6px]">
                      <label className={labelCls}>Arrival Time</label>
                      <input type="text" value={newRoute.arrivalTime}
                        placeholder="--:-- --"
                        onChange={e => setNewRoute(r => ({ ...r, arrivalTime: e.target.value }))}
                        className={inputCls(false)} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-[6px]">
                    <label className={labelCls}>Vehicle</label>
                    <VehicleDropdown
                      value={newRoute.vehicle}
                      onChange={v => setNewRoute(r => ({ ...r, vehicle: v }))}
                      hasError={!!addErrors.vehicle}
                    />
                    {addErrors.vehicle && <p className={fieldErrCls}>{addErrors.vehicle}</p>}
                  </div>

                  <div className="flex flex-col gap-[6px]">
                    <label className={labelCls}>Drivers Needed</label>
                    <SegmentedDrivers
                      value={newRoute.driversNeeded}
                      onChange={n => setNewRoute(r => ({ ...r, driversNeeded: n }))}
                    />
                  </div>
                </>
              )}

              {/* ── Step 3: First Schedule ── */}
              {addStep === 3 && (
                <>
                  <div className="flex flex-col gap-[6px]">
                    <label className={labelCls} htmlFor="wiz-date">First Occurrence Date</label>
                    <input id="wiz-date" type="date" value={newRoute.firstDate}
                      onChange={e => setNewRoute(r => ({ ...r, firstDate: e.target.value }))}
                      className={inputCls(addErrors.firstDate)} />
                    <p className="text-[13px] text-[#6b7280] -mt-1 leading-[18px]">
                      This will be the first entry in the schedule table
                    </p>
                    {addErrors.firstDate && <p className={fieldErrCls}>{addErrors.firstDate}</p>}
                  </div>

                  {/* Repeat Weekly toggle — standard track + knob, first toggle in this app */}
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-medium text-[#0a2a3a] leading-[20px]">Repeat Weekly</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={newRoute.repeatsWeekly}
                      onClick={() => setNewRoute(r => ({ ...r, repeatsWeekly: !r.repeatsWeekly }))}
                      className={`relative w-11 h-[26px] rounded-full border-none cursor-pointer p-0
                        transition-colors focus-visible:outline-2 focus-visible:outline-[#09665e]
                        focus-visible:outline-offset-2
                        ${newRoute.repeatsWeekly ? "bg-[#0d9488]" : "bg-[#d1d5db]"}`}
                    >
                      <span className={`absolute top-[3px] left-[3px] w-5 h-5 bg-white rounded-full
                        shadow-[0_1px_3px_rgba(10,42,58,.3)] transition-transform
                        ${newRoute.repeatsWeekly ? "translate-x-[18px]" : "translate-x-0"}`} />
                    </button>
                  </div>

                  {newRoute.repeatsWeekly && (
                    <div className="flex flex-col gap-[6px]">
                      <label className={labelCls} htmlFor="wiz-until">Repeat Until</label>
                      <input id="wiz-until" type="date" value={newRoute.repeatUntil}
                        onChange={e => setNewRoute(r => ({ ...r, repeatUntil: e.target.value }))}
                        className={inputCls(addErrors.repeatUntil)} />
                      {addErrors.repeatUntil && <p className={fieldErrCls}>{addErrors.repeatUntil}</p>}
                    </div>
                  )}

                  {newRoute.firstDate && (
                    <div className="bg-[#E6F5F3] border border-[#b3ddd8] rounded-[10px] px-4 py-3">
                      <p className="text-[#09665e] text-[13px] leading-[18px]">
                        {newRoute.repeatsWeekly && newRoute.repeatUntil
                          ? `${previewCount} occurrence${previewCount !== 1 ? "s" : ""} will be created from ${formatDateShort(newRoute.firstDate)} to ${formatDateShort(newRoute.repeatUntil)}`
                          : `1 occurrence will be created on ${formatDateShort(newRoute.firstDate)}`}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Wizard footer */}
            <div className="flex justify-between gap-3 px-7 py-5 mt-2">
              {addStep === 1 ? (
                <button onClick={closeAddModal}
                  className="h-[44px] px-5 rounded-full border border-[#e5e7eb] bg-white
                    text-[#0a2a3a] text-[14px] font-semibold cursor-pointer hover:bg-[#f5f5f5] transition-colors">
                  Cancel
                </button>
              ) : (
                <button onClick={() => { setAddErrors({}); setAddStep(s => s - 1); }}
                  className="h-[44px] px-5 rounded-full border border-[#e5e7eb] bg-white
                    text-[#0a2a3a] text-[14px] font-semibold cursor-pointer hover:bg-[#f5f5f5] transition-colors">
                  ← Back
                </button>
              )}
              {addStep < 3 ? (
                <button onClick={() => { if (validateStep(addStep)) setAddStep(s => s + 1); }}
                  className="h-[44px] px-5 rounded-full bg-[#09665e] text-white text-[14px]
                    font-semibold border-none cursor-pointer hover:bg-[#0f7a70] transition-colors">
                  Next →
                </button>
              ) : (
                <button onClick={handleSaveNewRoute}
                  className="h-[44px] px-5 rounded-full bg-[#09665e] text-white text-[14px]
                    font-semibold border-none cursor-pointer hover:bg-[#0f7a70] transition-colors">
                  Create Route
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
