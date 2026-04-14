// ManagerVolunteers.jsx — Experienced volunteer roster management
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { Search, UserPlus, X, Menu, Check, Pencil } from "lucide-react";
import { db } from "../firebase";
import { ref, onValue, set, remove, update } from "firebase/database";
import { VOLUNTEER_PROFILES } from "../hooks/useSharedTasks";

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
function AddVolunteerModal({ volunteers, onClose, onAdd }) {
  const firstNameRef = useRef(null);
  const lastNameRef  = useRef(null);
  const idRef        = useRef(null);
  const [isDriver, setIsDriver] = useState(false);
  const [error,    setError]    = useState("");

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
    await onAdd({ fullName, id, isDriver });
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-xl p-6 w-[340px] lg:w-[480px] border border-[#e5e7eb]">
        <div className="flex items-center justify-between mb-6">
          <p className="text-[#0a2a3a] text-[18px] font-semibold">Add Experienced Volunteer</p>
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
                className="w-full border border-[#e5e7eb] rounded-lg px-4 py-2.5 text-[14px] text-[#0a2a3a] placeholder-[#b3b3b3] outline-none focus:border-[#0d9488]" />
            </div>
            <div>
              <p className="text-[#6b7280] text-[11px] uppercase tracking-widest mb-1">Last Name</p>
              <input ref={lastNameRef} type="text" placeholder="Last Name" defaultValue=""
                className="w-full border border-[#e5e7eb] rounded-lg px-4 py-2.5 text-[14px] text-[#0a2a3a] placeholder-[#b3b3b3] outline-none focus:border-[#0d9488]" />
            </div>
          </div>
          <div>
            <p className="text-[#6b7280] text-[11px] uppercase tracking-widest mb-1">
              Volunteer ID (last 4 digits of phone number)
            </p>
            <input ref={idRef} type="text" placeholder="4 digits" maxLength={4} defaultValue=""
              className="w-full border border-[#e5e7eb] rounded-lg px-4 py-2.5 text-[14px] text-[#0a2a3a] placeholder-[#b3b3b3] outline-none focus:border-[#0d9488]" />
          </div>
          {/* Role toggles */}
          <div>
            <p className="text-[#6b7280] text-[12px] mb-2">Role</p>
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ccedeb] text-[#09665e] text-[12px] font-medium cursor-not-allowed opacity-70 select-none">
                <Check size={12} strokeWidth={2.5} />
                Pantry
              </div>
              <button type="button"
                onClick={() => setIsDriver(d => !d)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium border-none cursor-pointer transition-colors ${
                  isDriver ? "bg-[#ccedeb] text-[#09665e]" : "bg-[#f0f0f0] text-[#6b7280]"
                }`}>
                {isDriver && <Check size={12} strokeWidth={2.5} />}
                Driver
              </button>
            </div>
          </div>
          {error && <p className="text-[#dc2626] text-[13px]">{error}</p>}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 border border-[#e5e7eb] text-[#6b7280] py-2.5 rounded-lg text-[14px] hover:bg-[#f5f5f5] bg-transparent cursor-pointer">
            Cancel
          </button>
          <button onClick={handleSubmit}
            className="flex-1 bg-[#09665e] text-white py-2.5 rounded-lg text-[14px] font-medium hover:opacity-90 border-none cursor-pointer">
            Add Volunteer
          </button>
        </div>
      </div>
    </>
  );
}

export default function ManagerVolunteers() {
  const navigate = useNavigate();

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
  const [editIsDriver, setEditIsDriver] = useState(false);
  const [editIsActive, setEditIsActive] = useState(true);
  const [editErrors, setEditErrors] = useState({});

  // ── Firebase real-time listener ────────────────────────────────────────────
  useEffect(() => {
    const unsub = onValue(
      ref(db, "volunteers"),
      (snap) => {
        const data = snap.val();
        if (data === null) {
          // First load — seed Firebase with default volunteers
          set(ref(db, "volunteers"), volunteersToFirebase(SEED_VOLUNTEERS));
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
        roleFilter === "all"    ? true :
        roleFilter === "pantry" ? !v.isDriver :
        roleFilter === "driver" ? v.isDriver === true && !v.active :
        roleFilter === "both"   ? v.isDriver === true : true;

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
        active: editIsActive,
      });
      setShowEditModal(false);
      setEditingVolunteer(null);
    } catch (err) {
      console.error("Error updating volunteer:", err);
    }
  }

  async function handleAddVolunteer({ fullName, id, isDriver }) {
    const newVol = { id, name: fullName, active: false, lastActive: null, isDriver };
    const updated = [...volunteers, newVol];
    setVolunteers(updated);
    await set(ref(db, "volunteers"), volunteersToFirebase(updated));
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
              {/* Mode toggle */}
              <div className="flex mx-4 my-3 bg-[#0d2233] rounded-lg p-0.5">
                <button className="flex-1 py-1.5 rounded-md text-[12px] font-medium bg-[#09665e] text-white">
                  Pantry
                </button>
                <button onClick={() => { setMobileMenuOpen(false); navigate('/manager-delivery'); }}
                  className="flex-1 py-1.5 rounded-md text-[12px] font-medium text-[#6b7280] hover:text-[#b3b3b3]">
                  Delivery
                </button>
              </div>

              <nav className="flex flex-col py-2">
                {[
                  { label: "Dashboard", path: "/manager/dashboard", active: false },
                  { label: "Tasks",     path: "/manager-tasks",      active: false },
                  { label: "Volunteers",path: "/manager-volunteers", active: true  },
                  { label: "History",   path: "/manager/history",    active: false },
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
              { value: "all",    label: "All Roles"   },
              { value: "pantry", label: "Pantry Only" },
              { value: "driver", label: "Driver"      },
              { value: "both",   label: "Both"        },
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
        <div className="ml-[220px] flex-1 flex flex-col min-h-screen">

          {/* Top bar */}
          <div className="bg-white border-b border-[#e5e7eb] h-16 flex items-center justify-between px-6 sticky top-0 z-10">
            <div>
              <p className="text-[#0d9488] text-[10px] uppercase tracking-widest">Operations Manager</p>
              <h1 className="text-[22px] font-semibold text-[#0a2a3a] tracking-tight leading-tight">
                Volunteers
              </h1>
            </div>
          </div>

          {/* Page content */}
          <div className="p-6 flex flex-col gap-5">

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Total Volunteers",      value: volunteers.length,                         color: "#0d9488" },
                { label: "Active This Session",    value: volunteers.filter(v => v.active).length,   color: "#ff9500" },
                { label: "New Volunteers Today",   value: 0,                                         color: "#34c759" },
              ].map(stat => (
                <div key={stat.label} className="bg-white border border-[#e5e7eb] rounded-xl px-4 py-3 h-[80px] flex flex-col justify-center">
                  <p className="text-[#6b7280] text-[12px] mb-1">{stat.label}</p>
                  <p className="text-[28px] font-semibold leading-none" style={{ color: stat.color }}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Volunteer list card */}
            <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">

              {/* Card header */}
              <div className="px-5 py-4 border-b border-[#e5e7eb] flex items-center justify-between">
                <p className="text-[#0a2a3a] text-[16px] font-semibold">Experienced Volunteers</p>
                <button onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 bg-[#09665e] text-white px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 border-none cursor-pointer">
                  <UserPlus size={14} />
                  Add Volunteer
                </button>
              </div>

              {/* Search bar */}
              <div className="px-5 py-3 border-b border-[#e5e7eb]">
                <div className="flex items-center gap-2 border border-[#e5e7eb] rounded-lg px-3 py-2 bg-[#f9fafb]">
                  <Search size={14} className="text-[#b3b3b3] shrink-0" />
                  <input type="text" placeholder="Search by name or ID..."
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    className="flex-1 text-[13px] text-[#0a2a3a] placeholder-[#b3b3b3] outline-none bg-transparent" />
                </div>
              </div>

              {/* Controls row */}
              <div className="px-5 py-3 border-b border-[#e5e7eb] flex items-center gap-3 flex-wrap">
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                  className="border border-[#e5e7eb] rounded-lg px-3 py-1.5 text-[13px] text-[#0a2a3a] bg-white focus:outline-none focus:ring-2 focus:ring-[#0d9488]">
                  <option value="name-asc">Name A → Z</option>
                  <option value="name-desc">Name Z → A</option>
                  <option value="id-asc">ID Ascending</option>
                  <option value="recent">Most Recently Active</option>
                </select>

                <div className="flex gap-2">
                  {["all", "active", "inactive"].map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors capitalize ${
                        statusFilter === s ? "bg-[#0d9488] text-white" : "bg-white border border-[#e5e7eb] text-[#6b7280]"
                      }`}>
                      {s === "all" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  {[
                    { value: "all",    label: "All Roles"   },
                    { value: "pantry", label: "Pantry Only" },
                    { value: "driver", label: "Driver"      },
                    { value: "both",   label: "Both"        },
                  ].map(r => (
                    <button key={r.value} onClick={() => setRoleFilter(r.value)}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                        roleFilter === r.value ? "bg-[#0d9488] text-white" : "bg-white border border-[#e5e7eb] text-[#6b7280]"
                      }`}>
                      {r.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center ml-auto gap-3">
                  <p className="text-[#6b7280] text-[12px]">
                    Showing {filteredAndSorted.length} of {volunteers.length} volunteers
                  </p>
                  {hasActiveFilters && (
                    <button onClick={clearFilters}
                      className="text-[#0d9488] text-[12px] underline bg-transparent border-none cursor-pointer">
                      Clear filters
                    </button>
                  )}
                </div>
              </div>

              {/* Column headers */}
              <div className="px-5 py-2 bg-[#f9fafb] border-b border-[#e5e7eb]">
                <div className="grid grid-cols-12 gap-4 items-center">
                  <p className="text-[#6b7280] text-[11px] uppercase tracking-widest col-span-1">ID</p>
                  <p className="text-[#6b7280] text-[11px] uppercase tracking-widest col-span-4">Name</p>
                  <p className="text-[#6b7280] text-[11px] uppercase tracking-widest col-span-3">Last Active</p>
                  <p className="text-[#6b7280] text-[11px] uppercase tracking-widest col-span-2">Status</p>
                  <p className="text-[#6b7280] text-[11px] uppercase tracking-widest col-span-2 text-right">Action</p>
                </div>
              </div>

              {/* Volunteer rows */}
              {filteredAndSorted.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <p className="text-[#6b7280] text-[14px]">No volunteers found.</p>
                </div>
              ) : (
                filteredAndSorted.map(vol => (
                  <div key={vol.id} className="px-5 py-4 border-b border-[#e5e7eb] last:border-b-0">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* ID pill */}
                      <div className="col-span-1">
                        <span className="bg-[#ccedeb] text-[#09665e] text-[12px] font-medium px-2.5 py-1 rounded-lg">
                          {vol.id}
                        </span>
                      </div>
                      {/* Name + role pills */}
                      <div className="col-span-4">
                        <p className="text-[#0a2a3a] text-[14px] font-semibold">{vol.name}</p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          <span className="bg-[#ccedeb] text-[#09665e] text-[11px] px-2 py-0.5 rounded-full">Pantry</span>
                          {vol.isDriver && (
                            <span className="bg-[#fff3e0] text-[#ff9500] text-[11px] px-2 py-0.5 rounded-full">Driver</span>
                          )}
                        </div>
                      </div>
                      {/* Last active */}
                      <p className="text-[#6b7280] text-[12px] col-span-3">{vol.lastActive || "Never"}</p>
                      {/* Status badge */}
                      <div className="col-span-2">
                        <span className={`text-[12px] font-medium px-3 py-1 rounded-lg ${
                          vol.active ? "bg-[#f0fff4] text-[#34c759]" : "bg-[#e6e6e6] text-[#6b7280]"
                        }`}>
                          {vol.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      {/* Edit + Remove */}
                      <div className="col-span-2 flex items-center justify-end gap-2">
                        <button onClick={() => handleEditOpen(vol)}
                          className="text-[#0d9488] hover:text-[#09665e] bg-transparent border-none cursor-pointer">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleRemoveVolunteer(vol.id)}
                          className="text-[#dc2626] text-[12px] hover:underline bg-transparent border-none cursor-pointer">
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
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
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      editIsActive ? "translate-x-5" : "translate-x-0.5"
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
