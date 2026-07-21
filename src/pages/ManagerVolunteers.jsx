// ManagerVolunteers.jsx — Experienced volunteer roster management
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import PageHeader from "../components/PageHeader";
import { Search, UserPlus, X, Menu, Check, Pencil } from "lucide-react";
import { db } from "../firebase";
import { ref, onValue, set, remove, update } from "firebase/database";
import { VOLUNTEER_PROFILES } from "../hooks/useSharedTasks";
import { useAuth } from "../contexts/AuthContext";
import VolunteerTable from "../components/VolunteerTable";
import "../components/StatCards.css";

const VOL_STAT_ACCENTS = [
  { chipBg: "#E6F5F3", chipFg: "#09665E", valueFg: "#09665E" }, // Total
  { chipBg: "#FFF3E0", chipFg: "#9A5000", valueFg: "#FF9500" }, // Active
  { chipBg: "#F0FFF4", chipFg: "#15703C", valueFg: "#34C759" }, // New Today
];

// Default seed derived from VOLUNTEER_PROFILES
const SEED_VOLUNTEERS = VOLUNTEER_PROFILES.map(v => ({
  id: v.id,
  name: v.name,
  active: false,
  lastActive: null,
}));

function volunteersToFirebase(arr) {
  const obj = {};
  for (const v of arr) {
    const clean = {};
    for (const [k, val] of Object.entries(v)) {
      if (val !== undefined && val !== null) clean[k] = val;
    }
    obj[v.id] = clean;
  }
  return obj;
}

function volunteersFromFirebase(snap) {
  if (!snap) return null;
  return Object.values(snap);
}

// ── Add Volunteer Modal — module-level to prevent remount on every keystroke ──
const CHECK_ICON = (
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round"
       style={{ width: 14, height: 14, flexShrink: 0 }}>
    <path d="M2.5 7l3 3 6-6"/>
  </svg>
);

const CHIP_ON  = { background: "#E6F5F3", borderColor: "#E6F5F3", color: "#09665E", fontWeight: 600 };
const CHIP_OFF = { background: "#FFFFFF", borderColor: "#E5E7EB", color: "#6B7280", fontWeight: 500 };

function AddVolunteerModal({ volunteers, onClose, onAdd }) {
  const firstNameRef = useRef(null);
  const lastNameRef  = useRef(null);
  const idRef        = useRef(null);
  const [isDriver,   setIsDriver]   = useState(false);
  const [isClothing, setIsClothing] = useState(false);
  const [error,      setError]      = useState("");

  async function handleSubmit() {
    const firstName = firstNameRef.current?.value?.trim() ?? "";
    const lastName  = lastNameRef.current?.value?.trim() ?? "";
    const id        = idRef.current?.value?.trim() ?? "";
    const fullName  = `${firstName} ${lastName}`.trim();
    if (!fullName) { setError("Name is required"); return; }
    if (!id || id.length !== 4 || !/^\d{4}$/.test(id)) {
      setError("Volunteer ID must be exactly 4 digits"); return;
    }
    if (volunteers.some(v => v.id === id)) {
      setError("A volunteer with this ID already exists"); return;
    }
    await onAdd({ fullName, id, isDriver, isClothing });
    onClose();
  }

  const inputStyle = {
    width: "100%", height: 44, padding: "0 14px",
    border: "1px solid #E5E7EB", borderRadius: 10,
    font: "400 14px/20px 'Inter', sans-serif", color: "#0A2A3A",
    outline: "none", boxSizing: "border-box", transition: "border-color 120ms",
  };

  const chipStyle = (on) => ({
    display: "inline-flex", alignItems: "center", gap: 6,
    height: 36, padding: "0 16px",
    border: `1px solid ${on ? "#E6F5F3" : "#E5E7EB"}`,
    borderRadius: 9999,
    font: `${on ? 600 : 500} 13px/18px 'Inter', sans-serif`,
    cursor: "pointer",
    transition: "background 120ms, color 120ms, border-color 120ms",
    ...(on ? CHIP_ON : CHIP_OFF),
  });

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white w-[calc(100%-32px)]"
        style={{ maxWidth: 440, borderRadius: 20, padding: 28, boxShadow: "0 24px 60px rgba(10,42,58,0.28)" }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <span style={{ font: "600 20px/26px 'Inter', sans-serif", color: "#0A2A3A" }}>
            Add Experienced Volunteer
          </span>
          <button onClick={onClose}
            style={{ border: 0, background: "none", cursor: "pointer", color: "#6B7280",
                     display: "grid", placeItems: "center", width: 28, height: 28, borderRadius: 8 }}>
            <X size={18} />
          </button>
        </div>

        {/* Name row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          {[
            { label: "First Name", ref: firstNameRef, placeholder: "First Name", autoFocus: true },
            { label: "Last Name",  ref: lastNameRef,  placeholder: "Last Name"  },
          ].map(f => (
            <div key={f.label} style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
              <label style={{ font: "600 11px/16px 'Inter', sans-serif", letterSpacing: "0.04em",
                              color: "#6B7280", textTransform: "uppercase" }}>
                {f.label}
              </label>
              <input ref={f.ref} type="text" placeholder={f.placeholder}
                autoFocus={f.autoFocus} defaultValue="" style={inputStyle}
                onFocus={e => (e.target.style.borderColor = "#09665E")}
                onBlur={e  => (e.target.style.borderColor = "#E5E7EB")} />
            </div>
          ))}
        </div>

        {/* Volunteer ID */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
          <label style={{ font: "600 11px/16px 'Inter', sans-serif", letterSpacing: "0.04em",
                          color: "#6B7280", textTransform: "uppercase" }}>
            Volunteer ID (last 4 digits of phone number)
          </label>
          <input ref={idRef} type="text" placeholder="4 digits" maxLength={4} defaultValue=""
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = "#09665E")}
            onBlur={e  => (e.target.style.borderColor = "#E5E7EB")} />
        </div>

        {/* Role */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
          <label style={{ font: "600 11px/16px 'Inter', sans-serif", letterSpacing: "0.04em",
                          color: "#6B7280", textTransform: "uppercase" }}>
            Role
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
            {/* Pantry — always selected; all volunteers are pantry volunteers */}
            <div style={{ ...chipStyle(true), cursor: "default", opacity: 0.75 }}>
              {CHECK_ICON}Pantry
            </div>
            <button type="button" onClick={() => setIsDriver(d => !d)} style={chipStyle(isDriver)}>
              {isDriver && CHECK_ICON}Driver
            </button>
            <button type="button" onClick={() => setIsClothing(c => !c)} style={chipStyle(isClothing)}>
              {isClothing && CHECK_ICON}Clothing
            </button>
          </div>
        </div>

        {error && <p style={{ color: "#DC2626", fontSize: 13, marginBottom: 12 }}>{error}</p>}

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 28 }}>
          <button type="button" onClick={onClose}
            style={{ height: 44, padding: "0 20px", borderRadius: 9999,
                     border: "1px solid #E5E7EB", background: "#FFFFFF", color: "#0A2A3A",
                     font: "600 14px/20px 'Inter', sans-serif", cursor: "pointer" }}>
            Cancel
          </button>
          <button type="button" onClick={handleSubmit}
            style={{ height: 44, padding: "0 20px", borderRadius: 9999,
                     border: "none", background: "#09665E", color: "#FFFFFF",
                     font: "600 14px/20px 'Inter', sans-serif", cursor: "pointer" }}>
            Add Volunteer
          </button>
        </div>
      </div>
    </>
  );
}

export default function ManagerVolunteers() {
  const navigate = useNavigate();
  const { pantryId, displayName, initials, logout } = useAuth();

  // ── State ──────────────────────────────────────────────────────────────────
  const [volunteers, setVolunteers] = useState(SEED_VOLUNTEERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sortBy, setSortBy] = useState("name-asc");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVolunteer, setEditingVolunteer] = useState(null);
  const [editName, setEditName] = useState("");
  const [editIsDriver,   setEditIsDriver]   = useState(false);
  const [editIsClothing, setEditIsClothing] = useState(false);
  const [editIsActive, setEditIsActive] = useState(true);
  const [editErrors, setEditErrors] = useState({});

  // ── Firebase real-time listener ────────────────────────────────────────────
  useEffect(() => {
    const unsub = onValue(
      ref(db, 'volunteers'),
      (snap) => {
        const data = snap.val();
        if (data === null) {
          // First load — seed Firebase with default volunteers
          set(ref(db, 'volunteers'), volunteersToFirebase(SEED_VOLUNTEERS));
          setVolunteers(SEED_VOLUNTEERS);
        } else {
          const arr = volunteersFromFirebase(data);
          setVolunteers(arr && arr.length > 0 ? arr : SEED_VOLUNTEERS);
        }
      },
      (err) => {
        console.error("Firebase volunteers error:", err);
      }
    );
    return () => unsub();
  }, []);

  // ── Filtered + sorted list ─────────────────────────────────────────────────
  const filteredAndSorted = volunteers
    .filter(v => {
      const matchesSearch =
        !searchQuery ||
        v.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.id?.toString().includes(searchQuery);

      const matchesStatus =
        statusFilter === "all" ? true :
        statusFilter === "active" ? v.active === true :
        v.active !== true;

      const matchesRole =
        roleFilter === "all"      ? true :
        roleFilter === "pantry"   ? !v.isDriver && !v.isClothing :
        roleFilter === "driver"   ? v.isDriver === true :
        roleFilter === "clothing" ? v.isClothing === true :
        roleFilter === "both"     ? v.isDriver === true && v.isClothing === true : true;

      return matchesSearch && matchesStatus && matchesRole;
    })
    .sort((a, b) => {
      if (sortBy === "name-asc")  return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "name-desc") return (b.name || "").localeCompare(a.name || "");
      if (sortBy === "id-asc")    return (a.id || "").toString().localeCompare((b.id || "").toString());
      if (sortBy === "recent") {
        if (!a.lastActive) return 1;
        if (!b.lastActive) return -1;
        return new Date(b.lastActive) - new Date(a.lastActive);
      }
      return 0;
    });

  const hasActiveFilters = statusFilter !== "all" || roleFilter !== "all" || sortBy !== "name-asc";

  function clearFilters() {
    setStatusFilter("all");
    setRoleFilter("all");
    setSortBy("name-asc");
    setSearchQuery("");
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  async function handleRemoveVolunteer(id) {
    const updated = volunteers.filter(v => v.id !== id);
    setVolunteers(updated);
    await remove(ref(db, `volunteers/${id}`));
  }

  function handleEditOpen(volunteer) {
    setEditingVolunteer(volunteer);
    setEditName(volunteer.name || "");
    setEditIsDriver(volunteer.isDriver || false);
    setEditIsClothing(volunteer.isClothing || false);
    setEditIsActive(volunteer.active !== false);
    setEditErrors({});
    setShowEditModal(true);
  }

  async function handleEditSave() {
    if (!editName.trim()) {
      setEditErrors({ name: "Name is required" });
      return;
    }
    try {
      await update(ref(db, `volunteers/${editingVolunteer.id}`), {
        name: editName.trim(),
        isDriver: editIsDriver,
        isClothing: editIsClothing,
        active: editIsActive,
      });
      setShowEditModal(false);
      setEditingVolunteer(null);
    } catch (err) {
      console.error("Error updating volunteer:", err);
    }
  }

  async function handleAddVolunteer({ fullName, id, isDriver, isClothing }) {
    const newVol = { id, name: fullName, active: false, lastActive: null, isDriver, isClothing };
    setVolunteers(prev => [...prev, newVol]);
    await set(ref(db, `volunteers/${id}`), newVol);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ══════════════════════════════════════════════════════════════════════
          MOBILE LAYOUT  (below lg breakpoint)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden min-h-screen bg-[#f5f5f5] flex flex-col pb-24"
        style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

        {/* ── Mobile header ── */}
        <div className="bg-[#0a2a3a] px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-[#0d9488] text-[10px] uppercase tracking-widest">Operations Manager</p>
            <p className="text-white text-[18px] font-semibold leading-tight">Volunteers</p>
          </div>
          <button onClick={() => setMobileMenuOpen(o => !o)}
            className="text-white bg-transparent border-none cursor-pointer p-1">
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* ── Hamburger slide-down overlay ── */}
        {mobileMenuOpen && (
          <>
            <div className="fixed inset-0 bg-black/40 z-30"
              onClick={() => setMobileMenuOpen(false)} />
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
              {/* Mode toggle — hidden for Amber (pantry-only) */}
              {pantryId !== 'amber' && (
                <div className="flex mx-4 my-3 bg-[#0d2233] rounded-lg p-0.5">
                  <button className="flex-1 py-1.5 rounded-md text-[12px] font-medium bg-[#09665e] text-white">
                    Pantry
                  </button>
                  <button onClick={() => { setMobileMenuOpen(false); navigate('/manager-delivery'); }}
                    className="flex-1 py-1.5 rounded-md text-[12px] font-medium text-[#6b7280] hover:text-[#b3b3b3]">
                    Delivery
                  </button>
                </div>
              )}

              <nav className="flex flex-col py-2">
                {[
                  { label: "Dashboard", path: "/manager/dashboard", active: false },
                  { label: "Tasks",     path: "/manager-tasks",      active: false },
                  { label: "Volunteers",path: "/manager-volunteers", active: true  },
                  { label: "History",   path: "/manager-history",    active: false },
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

        {/* ── Stats grid ── */}
        <div className="px-4 pt-4 grid grid-cols-2 gap-3">
          <div className="bg-white border border-[#e5e7eb] rounded-xl px-4 py-3">
            <p className="text-[#6b7280] text-[11px] mb-1">Total Volunteers</p>
            <p className="text-[28px] font-semibold leading-none text-[#0d9488]">{volunteers.length}</p>
          </div>
          <div className="bg-white border border-[#e5e7eb] rounded-xl px-4 py-3">
            <p className="text-[#6b7280] text-[11px] mb-1">Active This Session</p>
            <p className="text-[28px] font-semibold leading-none text-[#ff9500]">{volunteers.filter(v => v.active).length}</p>
          </div>
          <div className="bg-white border border-[#e5e7eb] rounded-xl px-4 py-3 col-span-2">
            <p className="text-[#6b7280] text-[11px] mb-1">New Volunteers Today</p>
            <p className="text-[28px] font-semibold leading-none text-[#34c759]">0</p>
          </div>
        </div>

        {/* ── Search ── */}
        <div className="px-4 pt-4">
          <div className="flex items-center gap-2 border border-[#e5e7eb] rounded-lg px-3 py-2.5 bg-white">
            <Search size={14} className="text-[#b3b3b3] shrink-0" />
            <input type="text" placeholder="Search by name or ID..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 text-[13px] text-[#0a2a3a] placeholder-[#b3b3b3] outline-none bg-transparent" />
          </div>
        </div>

        {/* ── Controls row (mobile) ── */}
        <div className="px-4 pt-4 flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="border border-[#e5e7eb] rounded-lg px-3 py-1.5 text-[13px] text-[#0a2a3a] bg-white focus:outline-none focus:ring-2 focus:ring-[#0d9488]">
              <option value="name-asc">Name A → Z</option>
              <option value="name-desc">Name Z → A</option>
              <option value="id-asc">ID Ascending</option>
              <option value="recent">Most Recently Active</option>
            </select>
          </div>
          <div className="flex gap-2 flex-wrap">
            {["all", "active", "inactive"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors capitalize ${
                  statusFilter === s ? "bg-[#0d9488] text-white" : "bg-white border border-[#e5e7eb] text-[#6b7280]"
                }`}>
                {s === "all" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { value: "all",      label: "All Roles"   },
              { value: "pantry",   label: "Pantry Only" },
              { value: "driver",   label: "Driver"      },
              { value: "clothing", label: "Clothing"    },
              { value: "both",     label: "Both"        },
            ].map(r => (
              <button key={r.value} onClick={() => setRoleFilter(r.value)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                  roleFilter === r.value ? "bg-[#0d9488] text-white" : "bg-white border border-[#e5e7eb] text-[#6b7280]"
                }`}>
                {r.label}
              </button>
            ))}
          </div>
          <div className="flex items-center">
            <p className="text-[#6b7280] text-[12px]">
              Showing {filteredAndSorted.length} of {volunteers.length} volunteers
            </p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-[#0d9488] text-[12px] underline ml-auto bg-transparent border-none cursor-pointer">
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* ── Section header ── */}
        <div className="px-4 pt-3 pb-2">
          <p className="text-[#0a2a3a] text-[15px] font-semibold">Experienced Volunteers</p>
        </div>

        {/* ── Volunteer cards ── */}
        <div className="px-4 flex flex-col gap-3">
          {filteredAndSorted.length === 0 ? (
            <div className="bg-white border border-[#e5e7eb] rounded-xl px-5 py-10 text-center">
              <p className="text-[#6b7280] text-[14px]">No volunteers found.</p>
            </div>
          ) : (
            filteredAndSorted.map(vol => (
              <div key={vol.id} className="bg-white border border-[#e5e7eb] rounded-xl px-4 py-3.5 flex items-center gap-3">
                {/* ID pill */}
                <span className="bg-[#ccedeb] text-[#09665e] text-[12px] font-medium px-2.5 py-1 rounded-lg shrink-0">
                  {vol.id}
                </span>
                {/* Name + last active + role pills */}
                <div className="flex-1 min-w-0">
                  <p className="text-[#0a2a3a] text-[14px] font-semibold truncate">{vol.name}</p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    <span className="bg-[#ccedeb] text-[#09665e] text-[11px] px-2 py-0.5 rounded-full">Pantry</span>
                    {vol.isDriver && (
                      <span className="bg-[#fff3e0] text-[#ff9500] text-[11px] px-2 py-0.5 rounded-full">Driver</span>
                    )}
                    {vol.isClothing && (
                      <span className="bg-[#f3e8ff] text-[#7c3aed] text-[11px] px-2 py-0.5 rounded-full">Clothing</span>
                    )}
                  </div>
                  <p className="text-[#6b7280] text-[11px] mt-0.5">{vol.lastActive || "Never active"}</p>
                </div>
                {/* Status badge */}
                <span className={`text-[11px] font-medium px-2.5 py-1 rounded-lg shrink-0 ${
                  vol.active ? "bg-[#f0fff4] text-[#34c759]" : "bg-[#e6e6e6] text-[#6b7280]"
                }`}>
                  {vol.active ? "Active" : "Inactive"}
                </span>
                {/* Edit */}
                <button onClick={() => handleEditOpen(vol)}
                  className="text-[#0d9488] hover:text-[#09665e] shrink-0 bg-transparent border-none cursor-pointer">
                  <Pencil size={14} />
                </button>
                {/* Remove */}
                <button onClick={() => handleRemoveVolunteer(vol.id)}
                  className="text-[#dc2626] text-[12px] shrink-0 bg-transparent border-none cursor-pointer">
                  Remove
                </button>
              </div>
            ))
          )}
        </div>

        {/* ── Fixed bottom Add button ── */}
        <div className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-white border-t border-[#e5e7eb] z-20">
          <button onClick={() => setShowAddModal(true)}
            className="w-full flex items-center justify-center gap-2 bg-[#09665e] text-white py-3 rounded-xl text-[15px] font-semibold border-none cursor-pointer active:opacity-80">
            <UserPlus size={16} />
            Add Volunteer
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          DESKTOP LAYOUT  (lg and above)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex min-h-screen bg-[#f5f5f5]"
        style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

        <Sidebar mode="pantry" activePath="/manager-volunteers" />

        {/* ── Main content ── */}
        <div className="lg:ml-[var(--sidebar-w)] flex-1 flex flex-col min-h-screen">

          {/* Pill header */}
          <div className="px-6 pt-5 pb-3">
            <PageHeader
              initials={initials}
              label="Volunteers"
              action={{
                label: "Add Volunteer",
                icon: <UserPlus size={16}/>,
                onClick: () => setShowAddModal(true),
              }}
            />
          </div>

          {/* Page content */}
          <div className="p-6 flex flex-col gap-5">

            {/* Stats row */}
            {(() => {
              const stats = [
                { label: "Total Volunteers",    value: volunteers.length,                       chip: "Total"   },
                { label: "Active This Session", value: volunteers.filter(v => v.active).length, chip: "Session" },
                { label: "New Volunteers Today",value: 0,                                       chip: "Today"   },
              ];
              return (
                <div className="sc-row">
                  {stats.map((s, i) => (
                    <div
                      key={s.label}
                      className="sc-card"
                      style={{
                        "--chip-bg":  VOL_STAT_ACCENTS[i].chipBg,
                        "--chip-fg":  VOL_STAT_ACCENTS[i].chipFg,
                        "--value-fg": VOL_STAT_ACCENTS[i].valueFg,
                      }}
                    >
                      <div className="sc-top">
                        <span className="sc-chip">{s.chip}</span>
                      </div>
                      <p className="sc-value">{s.value}</p>
                      <p style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Volunteer list */}
            <VolunteerTable
              volunteers={volunteers}
              onEdit={handleEditOpen}
              onRemove={handleRemoveVolunteer}
            />
          </div>
        </div>
      </div>

      {/* ── Add Volunteer Modal (shared) ── */}
      {showAddModal && (
        <AddVolunteerModal
          volunteers={volunteers}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddVolunteer}
        />
      )}

      {/* ── Edit Volunteer Modal ── */}
      {showEditModal && editingVolunteer && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl border border-[#e5e7eb] w-full max-w-[400px] mx-4">

            {/* Header */}
            <div className="px-6 py-4 border-b border-[#e5e7eb] flex items-center justify-between">
              <p className="text-[#0a2a3a] text-[16px] font-semibold">Edit Volunteer</p>
              <button onClick={() => setShowEditModal(false)}
                className="text-[#6b7280] hover:text-[#0a2a3a] bg-transparent border-none cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="px-6 pt-5 pb-2 flex flex-col gap-4">

              {/* ID — read only */}
              <div>
                <p className="text-[#6b7280] text-[12px] mb-1">Volunteer ID</p>
                <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-lg px-3 py-2 text-[#6b7280] text-[14px]">
                  {editingVolunteer.id}
                </div>
                <p className="text-[#9ca3af] text-[11px] mt-1">ID cannot be changed as it is used for login</p>
              </div>

              {/* Name */}
              <div>
                <p className="text-[#6b7280] text-[12px] mb-1">Full Name</p>
                <input
                  type="text"
                  value={editName}
                  onChange={e => { setEditName(e.target.value); setEditErrors({}); }}
                  className={`w-full border rounded-lg px-4 py-2.5 text-[14px] text-[#0a2a3a] outline-none focus:border-[#0d9488] ${
                    editErrors.name ? "border-[#dc2626]" : "border-[#e5e7eb]"
                  }`}
                />
                {editErrors.name && (
                  <p className="text-[#dc2626] text-[11px] mt-1">{editErrors.name}</p>
                )}
              </div>

              {/* Role toggles */}
              <div>
                <p className="text-[#6b7280] text-[12px] mb-2">Role</p>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#ccedeb] text-[#09665e] text-[12px] font-medium opacity-70 cursor-not-allowed select-none">
                    <Check size={12} />
                    Pantry
                  </div>
                  <button type="button" onClick={() => setEditIsDriver(d => !d)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium cursor-pointer border transition-colors ${
                      editIsDriver
                        ? "bg-[#fff3e0] text-[#ff9500] border-[#ff9500]"
                        : "bg-[#f0f0f0] text-[#6b7280] border-transparent"
                    }`}>
                    {editIsDriver && <Check size={12} />}
                    Driver
                  </button>
                  <button type="button" onClick={() => setEditIsClothing(c => !c)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium cursor-pointer border transition-colors ${
                      editIsClothing
                        ? "bg-[#f3e8ff] text-[#7c3aed] border-[#7c3aed]"
                        : "bg-[#f0f0f0] text-[#6b7280] border-transparent"
                    }`}>
                    {editIsClothing && <Check size={12} />}
                    Clothing
                  </button>
                </div>
              </div>

              {/* Active status toggle */}
              <div>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-[#0a2a3a] text-[13px] font-medium">Active Volunteer</p>
                  <button type="button" onClick={() => setEditIsActive(a => !a)}
                    className={`relative w-11 h-6 rounded-full transition-colors border-none cursor-pointer ${
                      editIsActive ? "bg-[#0d9488]" : "bg-[#e5e7eb]"
                    }`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      editIsActive ? "translate-x-[22px]" : "translate-x-0"
                    }`} />
                  </button>
                </div>
                <p className={`text-[11px] mt-1 ${editIsActive ? "text-[#6b7280]" : "text-[#dc2626]"}`}>
                  {editIsActive ? "Volunteer can log in and claim tasks" : "Volunteer cannot log in"}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#e5e7eb] flex gap-3">
              <button onClick={() => setShowEditModal(false)}
                className="flex-1 bg-white border border-[#e5e7eb] text-[#6b7280] rounded-xl py-2.5 text-[13px] cursor-pointer hover:bg-[#f9fafb]">
                Cancel
              </button>
              <button onClick={handleEditSave}
                className="flex-1 bg-[#09665e] text-white rounded-xl py-2.5 text-[13px] font-medium hover:bg-[#0d9488] border-none cursor-pointer">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
