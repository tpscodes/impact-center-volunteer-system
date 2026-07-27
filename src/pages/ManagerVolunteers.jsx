// ManagerVolunteers.jsx — Experienced volunteer roster management
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import PageHeader from "../components/PageHeader";
import { Search, UserPlus, X, Menu, Check, Pencil, Trash2 } from "lucide-react";
import { db } from "../firebase";
import { ref, onValue, set, remove, update } from "firebase/database";
import { VOLUNTEER_PROFILES } from "../hooks/useSharedTasks";
import { useAuth } from "../contexts/AuthContext";
import VolunteerTable from "../components/VolunteerTable";
import VolunteerListItem from "../components/VolunteerListItem";
import DashboardHero from "../components/DashboardHero";

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
      <div className="lg:hidden min-h-screen bg-[#D3EDE9]"
        style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

        {/* Gradient hero */}
        <div style={{
          background: 'linear-gradient(143deg, #0f7a70 14%, #0a2a3a 86%)',
          borderRadius: '0 0 28px 28px',
          padding: '20px 20px 24px',
          display: 'flex', flexDirection: 'column', gap: 20, color: '#fff',
        }}>
          {/* Topbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileMenuOpen(o => !o)}
                className="w-10 h-10 rounded-full flex items-center justify-center border-none cursor-pointer"
                style={{ background: 'rgba(10,42,58,.55)' }}>
                <Menu size={18} color="#fff" />
              </button>
              <div className="w-10 h-10 rounded-full bg-[#1B4256] flex items-center justify-center shrink-0">
                <span className="text-white text-[14px] font-semibold">{initials}</span>
              </div>
              <div>
                <p className="m-0 text-white text-[14px] font-semibold leading-[18px]">Volunteers</p>
                <p className="m-0 text-[12px] leading-[16px]" style={{ color: 'rgba(255,255,255,.66)' }}>Operations Manager</p>
              </div>
            </div>
            <button className="w-9 h-9 rounded-[18px] flex items-center justify-center border-none cursor-pointer"
              style={{ background: '#0A2A3A' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/>
              </svg>
            </button>
          </div>

          {/* Stat row: Volunteers tag + big number + signal bars */}
          <div className="flex items-end justify-between">
            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full w-fit"
                style={{ background: '#E6F5F3', color: '#09665E' }}>Volunteers</span>
              <p className="m-0 text-[64px] leading-[64px]" style={{ fontWeight: 800 }}>{volunteers.length}</p>
            </div>
            <div className="flex items-end gap-[3px]" style={{ height: 32 }}>
              {[10, 16, 22, 32].map((h, i) => (
                <span key={i} style={{ width: 6, height: h, borderRadius: 2, background: '#0D9488', display: 'block' }} />
              ))}
            </div>
          </div>

          {/* Caption */}
          <p className="m-0 text-[12px]" style={{ color: '#D1D6DB' }}>
            {volunteers.filter(v => v.active).length} volunteers active
          </p>
        </div>

        {/* Add Volunteer button */}
        <div className="px-5 pt-[15px]">
          <button onClick={() => setShowAddModal(true)}
            className="w-full h-12 rounded-full text-[14px] font-semibold text-white border-none cursor-pointer flex items-center justify-center gap-2"
            style={{ background: '#0F7A70' }}>
            <UserPlus size={16} />
            Add Volunteer
          </button>
        </div>

        {/* Experienced Volunteers card */}
        <div className="mx-5 mt-[15px] mb-6 bg-white border border-[#E5E7EB] rounded-[20px] p-6 flex flex-col gap-4"
          style={{ boxShadow: '0 8px 20px rgba(10,42,58,.05)' }}>
          <h2 className="m-0 text-[21px] font-semibold text-[#0A2A3A]">Experienced Volunteers</h2>

          {/* Search */}
          <div className="flex items-center gap-2 border border-[#E5E7EB] rounded-lg px-3 py-2.5 bg-white">
            <Search size={14} className="text-[#b3b3b3] shrink-0" />
            <input type="text" placeholder="Search by name or ID..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 text-[13px] text-[#0A2A3A] placeholder-[#b3b3b3] outline-none bg-transparent" />
          </div>

          {/* Role filter chips — 3 per Figma */}
          <div className="flex gap-2">
            {[
              { value: 'all',    label: 'All Roles'   },
              { value: 'pantry', label: 'Pantry Only' },
              { value: 'driver', label: 'Driver'      },
            ].map(r => (
              <button key={r.value} onClick={() => setRoleFilter(r.value)}
                className="h-9 px-4 rounded-full text-[13px] cursor-pointer border-none"
                style={roleFilter === r.value
                  ? { background: '#0A2A3A', color: '#fff', fontWeight: 600 }
                  : { background: '#fff', border: '1px solid #E5E7EB', color: '#6B7280', fontWeight: 500 }}>
                {r.label}
              </button>
            ))}
          </div>

          {/* Volunteer rows */}
          <div className="flex flex-col">
            {filteredAndSorted.length === 0 ? (
              <p className="m-0 text-center text-[#6b7280] text-[14px] py-6">No volunteers found.</p>
            ) : (
              filteredAndSorted.map(vol => (
                <div key={vol.id}
                  className="flex items-center gap-3 py-3 border-b border-[#F3F4F6] last:border-0">
                  <span className="text-[12px] font-medium px-2.5 py-1 rounded-lg shrink-0"
                    style={{ background: '#E6F5F3', color: '#09665E' }}>
                    {vol.id}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="m-0 text-[14px] font-semibold text-[#0A2A3A] truncate">{vol.name}</p>
                    <div className="flex gap-1 mt-0.5 flex-wrap">
                      <span className="text-[11px] px-2 py-0.5 rounded-full"
                        style={{ background: '#E6F5F3', color: '#09665E' }}>Pantry</span>
                      {vol.isDriver && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full"
                          style={{ background: '#FFF3E0', color: '#9A5000' }}>Driver</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => handleEditOpen(vol)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border-none cursor-pointer"
                    style={{ background: '#E6F5F3' }}>
                    <Pencil size={13} color="#09665E" />
                  </button>
                  <button onClick={() => handleRemoveVolunteer(vol.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border-none cursor-pointer"
                    style={{ background: '#E6F5F3' }}>
                    <Trash2 size={13} color="#09665E" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Teal rounded drawer */}
        {mobileMenuOpen && (
          <>
            <div className="fixed inset-0 z-40"
              style={{ background: 'rgba(10,42,58,.4)' }}
              onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed left-5 right-5 overflow-hidden"
              style={{ top: 63, background: 'rgba(13,148,136,.97)', borderRadius: 27, zIndex: 41 }}>
              <nav className="flex flex-col p-2">
                {[
                  { label: 'Overview',   path: '/manager/dashboard', active: false },
                  { label: 'Tasks',      path: '/manager-tasks',      active: false },
                  { label: 'Volunteers', path: '/manager-volunteers', active: true  },
                  { label: 'History',    path: '/manager-history',    active: false },
                  { label: 'Settings',   path: '/manager-settings',   active: false },
                ].map(item => (
                  <button key={item.label}
                    onClick={() => { setMobileMenuOpen(false); if (!item.active) navigate(item.path); }}
                    className="flex items-center w-full h-[49px] px-4 rounded-[26px] text-[15px] text-left border-none cursor-pointer"
                    style={item.active
                      ? { background: '#fff', color: '#0A2A3A', fontWeight: 600 }
                      : { background: 'transparent', color: 'rgba(255,255,255,.82)', fontWeight: 500 }}>
                    {item.label}
                  </button>
                ))}
              </nav>
              {pantryId !== 'amber' && (
                <div className="flex gap-1 mx-2 mb-2 p-1"
                  style={{ background: 'rgba(255,255,255,.12)', borderRadius: 22 }}>
                  <button className="flex-1 h-9 text-[13px] font-semibold border-none cursor-pointer"
                    style={{ background: '#0A2A3A', color: '#fff', borderRadius: 18 }}>
                    Pantry
                  </button>
                  <button onClick={() => { setMobileMenuOpen(false); navigate('/manager-delivery'); }}
                    className="flex-1 h-9 text-[13px] font-semibold border-none cursor-pointer"
                    style={{ background: 'transparent', color: 'rgba(255,255,255,.66)', borderRadius: 18 }}>
                    Delivery
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TABLET LAYOUT (lg–xl: 1024–1280 px)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex xl:hidden min-h-screen bg-[#D3EDE9]"
        style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

        <Sidebar mode="pantry" activePath="/manager-volunteers" />

        <div className="lg:ml-[var(--sidebar-w)] flex-1 flex flex-col min-h-screen">

          {/* Pill header — Add Volunteer button only */}
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

          {/* Single card — no search, no filter chips */}
          <div className="px-6 pb-8">
            <div className="bg-white border border-[#e5e7eb] rounded-[20px] p-6 flex flex-col gap-4"
                 style={{ boxShadow: "0 8px 20px rgba(10,42,58,.05)" }}>
              <h2 className="m-0 text-[21px] font-semibold text-[#0a2a3a] leading-7">
                Experienced Volunteers
              </h2>
              <div className="flex flex-col">
                {filteredAndSorted.length === 0 ? (
                  <p className="text-center text-[13px] text-[#9ca3af] py-8 m-0">No volunteers found</p>
                ) : (
                  filteredAndSorted.map((v, i) => (
                    <VolunteerListItem
                      key={v.id}
                      volunteer={v}
                      tint={i % 2 === 0}
                      index={i}
                      onEdit={() => handleEditOpen(v)}
                      onDelete={() => handleRemoveVolunteer(v.id)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          DESKTOP LAYOUT  (xl and above)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden xl:flex min-h-screen bg-[#D3EDE9]"
        style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

        <Sidebar mode="pantry" activePath="/manager-volunteers" />

        {/* ── Main content ── */}
        <div className="xl:ml-[var(--sidebar-w)] flex-1 flex flex-col min-h-screen">

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

            {/* Hero stat summary */}
            <DashboardHero sections={[
              { label: "Total Volunteers",     value: volunteers.length,                        delta: "in roster",            chipTone: "brand"    },
              { label: "Active This Session",  value: volunteers.filter(v => v.active).length,  delta: "currently checked in", chipTone: "progress" },
              { label: "New Volunteers Today", value: 0,                                        delta: "no new signups yet",   chipTone: "complete" },
            ]} />

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
