// ManagerDeliveryVolunteers.jsx — Delivery drivers roster
//
// [FLAGGED] Reference screenshot (drivers-list-screen.html) showed "Remove Driver Tag"
// and "Remove Volunteer" as two always-visible outlined buttons per row. They are
// collapsed into a kebab+popover here to match the established list pattern from
// VolunteerTable. Confirm this is preferred; if faster per-row access to these
// actions is needed, revert to always-visible buttons.
//
// [FLAGGED] "Routes This Week" kept as a column on the reasoning that it provides
// real signal once data exists. Not yet validated against actual usage — remove if
// consistently zero or not useful to managers.

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import SidebarLiquid from "../components/SidebarLiquid";
import PageHeader from "../components/PageHeader";
import DeliveryHero from "../components/DeliveryHero";
import { Search, UserPlus, UserCheck, X, Menu, Check, User, Truck, Pencil, Trash2 } from "lucide-react";
import { db } from "../firebase";
import { ref, onValue, set, remove } from "firebase/database";
import { useAuth } from "../contexts/AuthContext";

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

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
  return { start: mon.toISOString().slice(0, 10), end: sun.toISOString().slice(0, 10) };
}

function driverNames(driversField) {
  if (!driversField) return [];
  if (Array.isArray(driversField)) return driversField.filter(Boolean);
  if (typeof driversField === "object") return Object.values(driversField).filter(Boolean);
  return [];
}

// ── Two-view driver popover (menu → confirm for the destructive action) ───────
// Mirrors VolunteerTable's VolunteerPopover exactly, but with driver-specific options:
//   View 1 (menu):    "Remove Driver Tag" (default, fires immediately, no confirm)
//                     "Remove Volunteer"  (destructive, transitions to confirm view)
//   View 2 (confirm): name-personalised warning → Cancel / Remove pill
function DriverPopover({ open, rect, vol, onRemoveTag, onRemoveVolunteer, onClose }) {
  const [view, setView] = useState("menu");
  const elRef = useRef(null);

  // Reset to menu each time a new row's popover opens
  useEffect(() => { if (open) setView("menu"); }, [open, vol?.id]);

  useEffect(() => {
    const el = elRef.current;
    if (!el || !rect) return;
    el.style.top  = `${rect.bottom + 6}px`;
    el.style.left = `${Math.max(8, rect.right - 220)}px`;
  }, [rect, open]);

  useEffect(() => {
    if (!open) return;
    const tid = setTimeout(() => {
      document.addEventListener("click", onClose);
      document.addEventListener("keydown", handleKey);
    }, 0);
    function handleKey(e) { if (e.key === "Escape") onClose(); }
    return () => {
      clearTimeout(tid);
      document.removeEventListener("click", onClose);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  return createPortal(
    <div
      ref={elRef}
      role="menu"
      aria-label="Driver actions"
      onClick={e => e.stopPropagation()}
      style={{
        position: "fixed",
        minWidth: 220,
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 20,
        boxShadow: "0 12px 32px rgba(10,42,58,.28)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 18,
        zIndex: 100,
        opacity: open ? 1 : 0,
        visibility: open ? "visible" : "hidden",
        transform: open ? "translateY(0) scale(1)" : "translateY(6px) scale(.97)",
        transformOrigin: "top left",
        transition: "opacity 200ms cubic-bezier(0.16,1,0.3,1), transform 200ms cubic-bezier(0.16,1,0.3,1), visibility 0s linear " + (open ? "0s" : "200ms"),
      }}
    >
      {view === "menu" ? (
        <>
          {/* Default tone — fires immediately, no confirm needed */}
          <button
            role="menuitem"
            onClick={() => { onRemoveTag(vol); onClose(); }}
            style={{
              border: 0, background: "none", padding: 0, textAlign: "left", cursor: "pointer",
              font: "500 17px/22px Inter, sans-serif", color: "#0a2a3a",
            }}
          >
            Remove Driver Tag
          </button>
          {/* Destructive tone — transitions to confirm sub-view */}
          <button
            role="menuitem"
            onClick={() => setView("confirm")}
            style={{
              border: 0, background: "none", padding: 0, textAlign: "left", cursor: "pointer",
              font: "500 17px/22px Inter, sans-serif", color: "#dc2626",
            }}
          >
            Remove Volunteer
          </button>
        </>
      ) : (
        <>
          <p style={{ font: "400 14px/20px Inter, sans-serif", color: "#0a2a3a", margin: 0 }}>
            Remove <strong>{vol?.name}</strong> as a volunteer entirely? This can't be undone.
          </p>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <button
              onClick={() => setView("menu")}
              style={{
                border: 0, background: "none", padding: 0, cursor: "pointer",
                font: "500 14px/20px Inter, sans-serif", color: "#6b7280",
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => { onRemoveVolunteer(vol); onClose(); }}
              style={{
                border: 0, padding: "6px 14px", borderRadius: 9999, cursor: "pointer",
                font: "600 14px/20px Inter, sans-serif", color: "#fff", background: "#dc2626",
              }}
            >
              Remove
            </button>
          </div>
        </>
      )}
    </div>,
    document.body
  );
}

// ── Mobile driver card — always-visible buttons (better ergonomics on touch) ──
function DriverCard({ vol, weekCount, onRemoveTag, onRemove }) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-xl p-4">
      <div className="flex items-center mb-2">
        <div className="w-9 h-9 bg-[#0d9488] rounded-full flex items-center justify-center
                        text-white text-[12px] font-semibold shrink-0">
          {getInitials(vol.name)}
        </div>
        <p className="text-[#0a2a3a] text-[14px] font-semibold ml-3 flex-1 min-w-0 truncate">
          {vol.name}
        </p>
        <span className="bg-[#E6F5F3] text-[#09665e] text-[11px] px-2 py-0.5 rounded-full shrink-0">
          Driver
        </span>
      </div>
      <div className="flex items-center gap-4 mb-3">
        <span className="flex items-center gap-1 text-[#6b7280] text-[12px]">
          <User size={13} />ID: {vol.id}
        </span>
        <span className="flex items-center gap-1 text-[#6b7280] text-[12px]">
          <Truck size={13} />{weekCount} route{weekCount !== 1 ? "s" : ""} this week
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => onRemoveTag(vol)}
          className="text-[#ff9500] text-[12px] border border-[#ff9500] rounded-lg px-3 py-1
                     hover:bg-[#fff3e0] bg-transparent cursor-pointer">
          Remove Driver Tag
        </button>
        <button onClick={() => onRemove(vol)}
          className="text-[#dc2626] text-[12px] border border-[#dc2626] rounded-lg px-3 py-1
                     hover:bg-[#fff0f0] bg-transparent cursor-pointer">
          Remove Volunteer
        </button>
      </div>
    </div>
  );
}

// ── Add Driver Modal ──────────────────────────────────────────────────────────
function AddDriverModal({ volunteers, onClose, onAdd }) {
  const firstNameRef = useRef(null);
  const lastNameRef  = useRef(null);
  const idRef        = useRef(null);
  const [isPantry,   setIsPantry]   = useState(false);
  const [modalError, setModalError] = useState("");

  async function handleSubmit() {
    const firstName = firstNameRef.current?.value?.trim() ?? "";
    const lastName  = lastNameRef.current?.value?.trim()  ?? "";
    const id        = idRef.current?.value?.trim()        ?? "";
    const fullName  = `${firstName} ${lastName}`.trim();
    if (!fullName) { setModalError("Name is required"); return; }
    if (!id || id.length !== 4 || !/^\d{4}$/.test(id)) {
      setModalError("Volunteer ID must be exactly 4 digits"); return;
    }
    if (volunteers.some(v => v.id === id)) {
      setModalError("A volunteer with this ID already exists"); return;
    }
    await onAdd({ fullName, id, isPantry });
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                      bg-white rounded-[20px] p-6 w-[340px] lg:w-[480px] border border-[#e5e7eb]
                      shadow-[0_24px_60px_rgba(10,42,58,.28)]">
        <div className="flex items-center justify-between mb-6">
          <p className="text-[#0a2a3a] text-[18px] font-semibold">Add Driver</p>
          <button onClick={onClose}
            className="text-[#6b7280] hover:text-[#0a2a3a] bg-transparent border-none cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-4 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[#6b7280] text-[11px] uppercase tracking-widest mb-1">First Name</p>
              <input ref={firstNameRef} type="text" placeholder="First Name" autoFocus defaultValue=""
                className="w-full border border-[#e5e7eb] rounded-lg px-4 py-2.5 text-[14px]
                           text-[#0a2a3a] placeholder-[#b3b3b3] outline-none focus:border-[#0d9488]" />
            </div>
            <div>
              <p className="text-[#6b7280] text-[11px] uppercase tracking-widest mb-1">Last Name</p>
              <input ref={lastNameRef} type="text" placeholder="Last Name" defaultValue=""
                className="w-full border border-[#e5e7eb] rounded-lg px-4 py-2.5 text-[14px]
                           text-[#0a2a3a] placeholder-[#b3b3b3] outline-none focus:border-[#0d9488]" />
            </div>
          </div>
          <div>
            <p className="text-[#6b7280] text-[11px] uppercase tracking-widest mb-1">
              Volunteer ID (last 4 digits of phone number)
            </p>
            <input ref={idRef} type="text" placeholder="4 digits" maxLength={4} defaultValue=""
              className="w-full border border-[#e5e7eb] rounded-lg px-4 py-2.5 text-[14px]
                         text-[#0a2a3a] placeholder-[#b3b3b3] outline-none focus:border-[#0d9488]" />
          </div>
          <div>
            <p className="text-[#6b7280] text-[12px] mb-2">Role</p>
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                              bg-[#E6F5F3] text-[#09665e] text-[12px] font-medium
                              cursor-not-allowed select-none">
                <Check size={12} strokeWidth={2.5} />
                Driver
              </div>
              <button type="button" onClick={() => setIsPantry(p => !p)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px]
                            font-medium border-none cursor-pointer transition-colors
                            ${isPantry ? "bg-[#E6F5F3] text-[#09665e]" : "bg-[#f0f0f0] text-[#6b7280]"}`}>
                {isPantry && <Check size={12} strokeWidth={2.5} />}
                Pantry
              </button>
            </div>
          </div>
          {modalError && <p className="text-[#dc2626] text-[13px]">{modalError}</p>}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 border border-[#e5e7eb] text-[#6b7280] py-2.5 rounded-full
                       text-[14px] font-semibold hover:bg-[#f5f5f5] bg-transparent cursor-pointer">
            Cancel
          </button>
          <button onClick={handleSubmit}
            className="flex-1 bg-[#09665e] text-white py-2.5 rounded-full text-[14px]
                       font-semibold hover:bg-[#0f7a70] border-none cursor-pointer">
            Add Driver
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ManagerDeliveryVolunteers() {
  const navigate = useNavigate();
  const { pantryId, displayName, initials, logout } = useAuth();

  const [volunteers,     setVolunteers]     = useState([]);
  const [occurrences,    setOccurrences]    = useState([]);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [showAddModal,   setShowAddModal]   = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileConfirm,  setMobileConfirm]  = useState(null); // vol to confirm-remove on mobile
  const [popover,        setPopover]        = useState(null); // { rect, vol }
  const [driverFilter,   setDriverFilter]   = useState('All Drivers');

  // Firebase listeners
  useEffect(() => {
    return onValue(ref(db, "volunteers"), snap => {
      const data = snap.val();
      setVolunteers(data ? Object.values(data) : []);
    });
  }, []);

  useEffect(() => {
    return onValue(ref(db, `pantries/${pantryId}/routeOccurrences`), snap => {
      const data = snap.val();
      setOccurrences(data
        ? Object.entries(data).map(([id, v]) => ({ id, ...v }))
        : []);
    });
  }, [pantryId]);

  // Derived
  const drivers = volunteers.filter(v => v.isDriver === true);
  const today   = getTodayStr();
  const { start: weekStart, end: weekEnd } = getWeekRange();

  const todayOccs = occurrences.filter(o => o.date === today);

  // Active Today: drivers whose name appears in any today occurrence's drivers array
  const activeTodaySet = new Set();
  todayOccs.forEach(occ => {
    driverNames(occ.drivers).forEach(name => {
      const match = drivers.find(d => d.name === name || d.id === name);
      if (match) activeTodaySet.add(match.id);
    });
  });

  const routesCompleted = todayOccs.filter(o => o.status === "complete").length;

  function weekCountFor(vol) {
    return occurrences.filter(occ => {
      if (!occ.date || occ.date < weekStart || occ.date > weekEnd) return false;
      return driverNames(occ.drivers).some(n => n === vol.name || n === vol.id);
    }).length;
  }

  const filtered = drivers.filter(v => {
    const q = searchQuery.toLowerCase();
    return !q || v.name?.toLowerCase().includes(q) || String(v.id).includes(q);
  });

  const todayMs = new Date().setHours(0, 0, 0, 0);
  const newDriversToday = drivers.filter(v => v.createdAt && v.createdAt >= todayMs).length;

  const BARS = [11, 18, 14, 25, 21, 32];
  const heroSections = [
    { label: "Total Drivers",      chipTone: "brand",    value: drivers.length,      bars: BARS },
    { label: "Active This Session", chipTone: "progress", value: activeTodaySet.size, bars: BARS },
    { label: "New Drivers Today",  chipTone: "complete",  value: newDriversToday,     bars: BARS },
  ];

  // Handlers
  async function handleRemoveDriverTag(vol) {
    await set(ref(db, `volunteers/${vol.id}/isDriver`), false);
  }

  async function handleRemoveVolunteer(vol) {
    await remove(ref(db, `volunteers/${vol.id}`));
  }

  async function handleAddDriver({ fullName, id, isPantry }) {
    await set(ref(db, `volunteers/${id}`), {
      id, name: fullName, active: false, lastActive: null,
      isDriver: true, createdAt: Date.now(),
      ...(isPantry ? { isPantry: true } : {}),
    });
  }

  const closePopover = useCallback(() => setPopover(null), []);

  function handleKebab(e, vol) {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setPopover(p => p?.vol.id === vol.id ? null : { rect, vol });
  }

  const MOBILE_NAV = [
    { label: "Dashboard", path: "/manager-delivery",            active: false },
    { label: "Routes",    path: "/manager-delivery-routes",     active: false },
    { label: "Drivers",   path: "/manager-delivery-volunteers", active: true  },
    { label: "History",   path: "/manager-delivery-history",    active: false },
  ];

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
              <p style={{ margin: 0, fontSize: 16, fontWeight: 600, lineHeight: '20px', color: '#fff' }}>Drivers</p>
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

          {/* Stats row */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 999, width: 'fit-content', background: '#E6F5F3', color: '#09665E' }}>
                Drivers
              </span>
              <p style={{ margin: 0, fontSize: 56, fontWeight: 700, lineHeight: '56px', color: '#fff' }}>{drivers.length}</p>
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,.7)' }}>{activeTodaySet.size} drivers active today</p>
            </div>
            {/* Signal bars */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, paddingBottom: 6 }}>
              {[10, 16, 22, 32].map((h, i) => (
                <div key={i} style={{ width: 6, height: h, borderRadius: 2, background: '#0D9488' }} />
              ))}
            </div>
          </div>
        </div>

        {/* ── Add Driver button ─────────────────────────────────────────────── */}
        <div style={{ padding: '16px 20px 0' }}>
          <button onClick={() => setShowAddModal(true)}
            style={{
              width: '100%', height: 48, borderRadius: 14, border: 'none', cursor: 'pointer',
              background: '#0F7A70', color: '#fff', fontSize: 15, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
            Add Driver
          </button>
        </div>

        {/* ── Experienced Drivers card ──────────────────────────────────────── */}
        <div style={{
          margin: '15px 20px 32px', background: '#fff', borderRadius: 20,
          border: '1px solid #E5E7EB', padding: '20px 20px 8px',
          boxShadow: '0 8px 20px rgba(10,42,58,.05)',
        }}>
          {/* Card header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#0A2A3A' }}>Experienced Drivers</h2>
            {/* Sort stub */}
            <button style={{
              display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 12px',
              border: '1px solid #E5E7EB', borderRadius: 10, background: '#fff', cursor: 'pointer',
              fontSize: 13, color: '#0A2A3A',
            }}>
              Sort
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M1 1l4 4 4-4"/>
              </svg>
            </button>
          </div>

          {/* Search */}
          <label style={{
            display: 'flex', alignItems: 'center', gap: 10, height: 42, padding: '0 14px',
            border: '1px solid #E5E7EB', borderRadius: 12, background: '#fff', marginBottom: 12,
          }}>
            <Search size={14} color="#9CA3AF" />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 14, color: '#0A2A3A' }}
            />
          </label>

          {/* Filter chips — "Experienced" and "New" show full list until experience-level field exists in Firebase */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {['All Drivers', 'Experienced', 'New'].map(chip => (
              <button key={chip} onClick={() => setDriverFilter(chip)}
                style={{
                  height: 32, padding: '0 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 500,
                  background: driverFilter === chip ? '#0F7A70' : '#F3F4F6',
                  color: driverFilter === chip ? '#fff' : '#374151',
                }}>
                {chip}
              </button>
            ))}
          </div>

          {/* Driver rows */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <UserCheck size={36} color="#E6F5F3" style={{ margin: '0 auto 8px' }} />
                <p style={{ margin: 0, fontSize: 14, color: '#6B7280' }}>
                  {searchQuery ? 'No drivers match your search.' : 'No drivers added yet'}
                </p>
              </div>
            ) : (
              filtered.map((vol, i) => (
                <div key={vol.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 14px', borderRadius: 14,
                    background: i % 2 === 0 ? '#D3EDE9' : 'transparent',
                  }}>
                  {/* ID pill */}
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                    background: '#E6F5F3', color: '#09665E', flexShrink: 0, whiteSpace: 'nowrap',
                  }}>
                    #{String(vol.id).slice(-4)}
                  </span>
                  {/* Name */}
                  <p style={{ flex: 1, margin: 0, fontSize: 13, fontWeight: 500, color: '#0A2A3A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {vol.name}
                  </p>
                  {/* Driver tag */}
                  <span style={{
                    fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 999,
                    background: '#FFF3E0', color: '#9A5000', flexShrink: 0,
                  }}>
                    Driver
                  </span>
                  {/* Action buttons */}
                  <button
                    onClick={() => {}}
                    style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Pencil size={13} color="#6B7280" />
                  </button>
                  <button
                    onClick={() => setMobileConfirm(vol)}
                    style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #FEE2E2', background: '#FFF5F5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Trash2 size={13} color="#DC2626" />
                  </button>
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
                  { label: 'Drivers',  path: '/manager-delivery-volunteers', active: true  },
                  { label: 'History',  path: '/manager-delivery-history',    active: false },
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

        {/* ── Mobile confirm overlay ────────────────────────────────────────── */}
        {mobileConfirm && (
          <>
            <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setMobileConfirm(null)} />
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[20px] p-6 border-t border-[#e5e7eb]">
              <p className="text-[#0a2a3a] text-[15px] leading-[22px] mb-5">
                Remove <strong>{mobileConfirm.name}</strong> as a volunteer entirely? This can't be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setMobileConfirm(null)}
                  className="flex-1 border border-[#e5e7eb] text-[#0a2a3a] py-3 rounded-full text-[14px] font-semibold bg-transparent cursor-pointer">
                  Cancel
                </button>
                <button onClick={() => { handleRemoveVolunteer(mobileConfirm); setMobileConfirm(null); }}
                  className="flex-1 bg-[#dc2626] text-white py-3 rounded-full text-[14px] font-semibold border-none cursor-pointer">
                  Remove
                </button>
              </div>
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
            <PageHeader
              initials={initials}
              label="Drivers"
              action={{ label: "+ Add Driver", icon: <UserPlus size={16} />, onClick: () => setShowAddModal(true) }}
            />
          </div>
          <div className="px-6 pb-8">
            <div className="bg-white border border-[#e5e7eb] rounded-[20px] p-6 flex flex-col gap-4"
              style={{ boxShadow: "0 8px 20px rgba(10,42,58,.05)" }}>
              <h2 className="m-0 text-[21px] font-semibold text-[#0a2a3a] leading-7">Drivers</h2>
              <div className="flex flex-col">
                {filtered.length === 0 ? (
                  <div className="py-12 text-center flex flex-col items-center gap-2">
                    <UserCheck size={36} className="text-[#E6F5F3]" />
                    <p className="text-[#0a2a3a] text-[15px] font-semibold">No drivers added yet</p>
                    <p className="text-[#6b7280] text-[13px]">Add your first driver to get started</p>
                  </div>
                ) : (
                  filtered.map((vol, i) => (
                    <div key={vol.id}
                      className={`flex items-center gap-3 px-3 py-[15px] rounded-[15px] ${i % 2 === 0 ? "bg-[#D3EDE9]" : ""}`}>
                      <div className="w-10 h-10 rounded-full bg-[#0d9488] flex items-center justify-center shrink-0">
                        <span className="text-white text-[13px] font-semibold leading-none">{getInitials(vol.name)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="m-0 text-[14px] font-semibold text-[#0a2a3a] leading-5">{vol.name}</p>
                        <p className="m-0 text-[13px] text-[#6b7280] leading-[18px] mt-0.5">
                          {weekCountFor(vol)} route{weekCountFor(vol) !== 1 ? "s" : ""} this week
                        </p>
                      </div>
                      <span className="bg-[#E6F5F3] text-[#09665E] text-[11px] font-semibold px-[10px] py-[2px] rounded-full shrink-0">
                        Driver
                      </span>
                      <div className="flex gap-[9px] ml-3 shrink-0">
                        <button aria-label={`Edit ${vol.name}`}
                          onClick={e => handleKebab(e, vol)}
                          className="w-7 h-7 border-0 rounded-[8px] bg-[#E6F5F3] grid place-items-center cursor-pointer hover:bg-[#D3EDE9] transition-colors">
                          <Pencil size={14} color="#0a2a3a" />
                        </button>
                        <button aria-label={`Delete ${vol.name}`}
                          onClick={() => setMobileConfirm(vol)}
                          className="w-7 h-7 border-0 rounded-[8px] bg-[#E6F5F3] grid place-items-center cursor-pointer hover:bg-[#D3EDE9] transition-colors">
                          <Trash2 size={14} color="#0a2a3a" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
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
            <PageHeader
              initials={initials}
              label="Drivers"
            />
          </div>

          <div className="px-6 pb-6 flex flex-col gap-5">

            {/* Gradient hero — same DeliveryHero component as Delivery Dashboard */}
            <DeliveryHero sections={heroSections} />

            {/* List card — same shell as Volunteer List */}
            <div className="bg-white border border-[#e5e7eb] rounded-[20px] overflow-visible
                            shadow-[0_1px_2px_rgba(10,42,58,.04),0_8px_20px_rgba(10,42,58,.05)]">

              {/* Search + Add Driver row */}
              <div className="flex items-center gap-3 mx-6 my-5">
              <label className="flex items-center gap-[10px] flex-1 h-[44px] px-[14px]
                                border border-[#e5e7eb] rounded-[12px] bg-white
                                transition-colors focus-within:border-[#09665e]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" className="text-[#6b7280] shrink-0">
                  <circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 border-0 outline-0 bg-transparent text-[14px] leading-[20px]
                             text-[#0a2a3a] placeholder:text-[#6b7280]"
                />
              </label>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-[6px] h-[44px] px-5 rounded-[12px]
                  bg-[#09665e] text-white text-[14px] font-semibold border-none
                  cursor-pointer hover:bg-[#0f7a70] transition-colors shrink-0"
              >
                <UserPlus size={15} />
                Add Driver
              </button>
              </div>

              {/* Table */}
              {filtered.length === 0 ? (
                <div className="px-6 py-[40px] text-center text-[#6b7280] text-[14px] leading-[20px]">
                  {searchQuery
                    ? "No drivers match your search."
                    : <span className="flex flex-col items-center gap-2 py-6">
                        <UserCheck size={36} className="text-[#E6F5F3]" />
                        <span className="text-[#0a2a3a] text-[15px] font-semibold">No drivers added yet</span>
                        <span className="text-[#6b7280] text-[13px]">Add your first driver to get started</span>
                      </span>
                  }
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["ID", "Name", "Routes This Week", "Role", ""].map((h, i) => (
                        <th key={i} style={{
                          textAlign: i === 4 ? "right" : "left",
                          padding: "12px 24px",
                          background: "#f5f5f5",
                          borderTop: "1px solid #e5e7eb",
                          borderBottom: "1px solid #e5e7eb",
                          font: "600 12px/16px Inter, sans-serif",
                          letterSpacing: ".02em",
                          color: "#6b7280",
                          textTransform: "uppercase",
                          whiteSpace: "nowrap",
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((vol, i) => {
                      const week = weekCountFor(vol);
                      const isLast = i === filtered.length - 1;
                      return (
                        <tr key={vol.id}
                          style={{ borderBottom: isLast ? 0 : "1px solid #e5e7eb", transition: "background 120ms" }}
                          onMouseEnter={e => e.currentTarget.style.background = "#f5f5f5"}
                          onMouseLeave={e => e.currentTarget.style.background = ""}
                        >
                          {/* ID badge */}
                          <td style={{ padding: "14px 24px", verticalAlign: "middle" }}>
                            <span style={{
                              display: "inline-flex", padding: "3px 12px", borderRadius: 9999,
                              background: "#E6F5F3", color: "#09665e",
                              font: "600 13px/18px Inter, sans-serif",
                            }}>
                              {vol.id}
                            </span>
                          </td>

                          {/* Avatar + name */}
                          <td style={{ padding: "14px 24px", verticalAlign: "middle" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <span style={{
                                flexShrink: 0, width: 36, height: 36, borderRadius: "50%",
                                background: "#0D9488", color: "#fff",
                                display: "grid", placeItems: "center",
                                font: "600 12px/1 Inter, sans-serif",
                              }}>
                                {getInitials(vol.name)}
                              </span>
                              <span style={{ font: "500 14px/20px Inter, sans-serif", color: "#0a2a3a" }}>
                                {vol.name}
                              </span>
                            </div>
                          </td>

                          {/* Routes this week */}
                          <td style={{ padding: "14px 24px", verticalAlign: "middle",
                                       font: "400 14px/20px Inter, sans-serif", color: "#0a2a3a" }}>
                            {week} route{week !== 1 ? "s" : ""} this week
                          </td>

                          {/* Role tag */}
                          <td style={{ padding: "14px 24px", verticalAlign: "middle" }}>
                            <span style={{
                              display: "inline-flex", padding: "3px 12px", borderRadius: 9999,
                              background: "#E6F5F3", color: "#09665e",
                              font: "600 12px/16px Inter, sans-serif",
                            }}>
                              Driver
                            </span>
                          </td>

                          {/* Kebab */}
                          <td style={{ padding: "14px 24px", verticalAlign: "middle", textAlign: "right" }}>
                            <button
                              type="button"
                              aria-haspopup="menu"
                              aria-expanded={popover?.vol.id === vol.id}
                              aria-label={`Actions for ${vol.name}`}
                              onClick={e => handleKebab(e, vol)}
                              style={{
                                display: "inline-flex", alignItems: "center", justifyContent: "center",
                                width: 32, height: 32, border: 0, borderRadius: 8, cursor: "pointer",
                                background: "#E6F5F3", color: "#0a2a3a",
                                transition: "background 120ms",
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = "#D3EDE9"}
                              onMouseLeave={e => e.currentTarget.style.background = "#E6F5F3"}
                            >
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                                <circle cx="8" cy="3" r="1.4"/>
                                <circle cx="8" cy="8" r="1.4"/>
                                <circle cx="8" cy="13" r="1.4"/>
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-view popover (portal) ── */}
      <DriverPopover
        open={!!popover}
        rect={popover?.rect}
        vol={popover?.vol}
        onRemoveTag={handleRemoveDriverTag}
        onRemoveVolunteer={handleRemoveVolunteer}
        onClose={closePopover}
      />

      {/* ── Add Driver modal ── */}
      {showAddModal && (
        <AddDriverModal
          volunteers={volunteers}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddDriver}
        />
      )}
    </>
  );
}
