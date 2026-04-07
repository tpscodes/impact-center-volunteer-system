// ManagerVolunteers.jsx — Experienced volunteer roster management
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, UserPlus, X } from "lucide-react";
import { db } from "../firebase";
import { ref, onValue, set, remove } from "firebase/database";
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

export default function ManagerVolunteers() {
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────────────────────
  const [volunteers, setVolunteers] = useState(SEED_VOLUNTEERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newId, setNewId] = useState("");
  const [error, setError] = useState("");

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

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = volunteers.filter(v => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      v.name?.toLowerCase().includes(q) ||
      String(v.id).includes(q)
    );
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  async function handleRemoveVolunteer(id) {
    const updated = volunteers.filter(v => v.id !== id);
    setVolunteers(updated);
    await remove(ref(db, `volunteers/${id}`));
  }

  async function handleAddVolunteer() {
    const fullName = `${newFirstName.trim()} ${newLastName.trim()}`.trim();
    if (!fullName) { setError("Name is required"); return; }
    if (!newId || newId.length !== 4 || !/^\d{4}$/.test(newId)) {
      setError("Volunteer ID must be exactly 4 digits");
      return;
    }
    if (volunteers.some(v => v.id === newId)) {
      setError("A volunteer with this ID already exists");
      return;
    }
    const newVol = {
      id: newId,
      name: fullName,
      active: false,
      lastActive: null,
    };
    const updated = [...volunteers, newVol];
    setVolunteers(updated);
    await set(ref(db, "volunteers"), volunteersToFirebase(updated));
    setShowAddModal(false);
    setNewFirstName("");
    setNewLastName("");
    setNewId("");
    setError("");
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f5f5f5] flex" style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Sidebar ── */}
      <div className="w-[220px] min-h-screen bg-[#0a2a3a] flex flex-col fixed left-0 top-0 z-20">
        <div className="px-5 pt-7 pb-4">
          <p className="text-white text-[14px] font-medium tracking-wide">IMPACT CENTER</p>
          <p className="text-[#0d9488] text-[10px] mt-0.5">Volunteer Task Management</p>
          <div className="w-8 h-0.5 bg-[#0d9488] mt-3" />
        </div>
        <nav className="flex flex-col mt-2">
          {[
            { label: "Dashboard", path: "/manager/dashboard", active: false, enabled: true },
            { label: "Tasks",     path: "/manager-tasks",      active: false, enabled: true },
            { label: "Volunteers",path: "/manager-volunteers", active: true,  enabled: true },
            { label: "History",   path: "/manager/history",    active: false, enabled: true },
          ].map(item => (
            <button key={item.label}
              onClick={() => item.enabled && item.path && navigate(item.path)}
              className={`w-full text-left px-5 py-3 text-[14px] font-semibold bg-transparent border-none transition-colors ${
                item.active
                  ? "text-[#0d9488] border-l-[3px] border-[#0d9488] cursor-default"
                  : item.enabled
                  ? "text-[#767676] border-l-[3px] border-transparent hover:text-[#b3b3b3] cursor-pointer"
                  : "text-[#3a4a52] border-l-[3px] border-transparent cursor-not-allowed opacity-40"
              }`}>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto px-4 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#0d9488] flex items-center justify-center shrink-0">
              <span className="text-white text-[12px] font-semibold">JB</span>
            </div>
            <div>
              <p className="text-[#b3b3b3] text-[13px] font-semibold leading-tight">Jason Bratina</p>
              <p className="text-[#757575] text-[11px] leading-tight">Operations Manager</p>
            </div>
          </div>
          <button onClick={() => navigate("/")}
            className="text-[#dc2626] text-[10px] mt-2 ml-12 hover:underline bg-transparent border-none cursor-pointer">
            Logout
          </button>
        </div>
      </div>

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

            {/* Column headers */}
            <div className="px-5 py-2 bg-[#f9fafb] border-b border-[#e5e7eb]">
              <div className="grid grid-cols-12 gap-4 items-center">
                <p className="text-[#6b7280] text-[11px] uppercase tracking-widest col-span-1">ID</p>
                <p className="text-[#6b7280] text-[11px] uppercase tracking-widest col-span-5">Name</p>
                <p className="text-[#6b7280] text-[11px] uppercase tracking-widest col-span-3">Last Active</p>
                <p className="text-[#6b7280] text-[11px] uppercase tracking-widest col-span-2">Status</p>
                <p className="text-[#6b7280] text-[11px] uppercase tracking-widest col-span-1 text-right">Action</p>
              </div>
            </div>

            {/* Volunteer rows */}
            {filtered.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-[#6b7280] text-[14px]">No volunteers found.</p>
              </div>
            ) : (
              filtered.map(vol => (
                <div key={vol.id} className="px-5 py-4 border-b border-[#e5e7eb] last:border-b-0">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* ID pill */}
                    <div className="col-span-1">
                      <span className="bg-[#ccedeb] text-[#09665e] text-[12px] font-medium px-2.5 py-1 rounded-lg">
                        {vol.id}
                      </span>
                    </div>
                    {/* Name */}
                    <p className="text-[#0a2a3a] text-[14px] font-semibold col-span-5">{vol.name}</p>
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
                    {/* Remove */}
                    <div className="col-span-1 flex justify-end">
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

      {/* ── Add Volunteer Modal ── */}
      {showAddModal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40"
            onClick={() => { setShowAddModal(false); setError(""); }} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-xl p-6 w-[480px] border border-[#e5e7eb]">

            {/* Modal header */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-[#0a2a3a] text-[18px] font-semibold">Add Experienced Volunteer</p>
              <button onClick={() => { setShowAddModal(false); setError(""); }}
                className="text-[#6b7280] hover:text-[#0a2a3a] bg-transparent border-none cursor-pointer">
                <X size={20} />
              </button>
            </div>

            {/* Fields */}
            <div className="flex flex-col gap-4 mb-6">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[#6b7280] text-[11px] uppercase tracking-widest mb-1">First Name</p>
                  <input type="text" placeholder="First Name"
                    value={newFirstName} onChange={e => setNewFirstName(e.target.value)}
                    className="w-full border border-[#e5e7eb] rounded-lg px-4 py-2.5 text-[14px] text-[#0a2a3a] placeholder-[#b3b3b3] outline-none focus:border-[#0d9488]" />
                </div>
                <div>
                  <p className="text-[#6b7280] text-[11px] uppercase tracking-widest mb-1">Last Name</p>
                  <input type="text" placeholder="Last Name"
                    value={newLastName} onChange={e => setNewLastName(e.target.value)}
                    className="w-full border border-[#e5e7eb] rounded-lg px-4 py-2.5 text-[14px] text-[#0a2a3a] placeholder-[#b3b3b3] outline-none focus:border-[#0d9488]" />
                </div>
              </div>
              <div>
                <p className="text-[#6b7280] text-[11px] uppercase tracking-widest mb-1">
                  Volunteer ID (last 4 digits of phone number)
                </p>
                <input type="text" placeholder="4 digits" maxLength={4}
                  value={newId} onChange={e => setNewId(e.target.value)}
                  className="w-full border border-[#e5e7eb] rounded-lg px-4 py-2.5 text-[14px] text-[#0a2a3a] placeholder-[#b3b3b3] outline-none focus:border-[#0d9488]" />
              </div>
              {error && <p className="text-[#dc2626] text-[13px]">{error}</p>}
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button onClick={() => { setShowAddModal(false); setError(""); }}
                className="flex-1 border border-[#e5e7eb] text-[#6b7280] py-2.5 rounded-lg text-[14px] hover:bg-[#f5f5f5] bg-transparent cursor-pointer">
                Cancel
              </button>
              <button onClick={handleAddVolunteer}
                className="flex-1 bg-[#09665e] text-white py-2.5 rounded-lg text-[14px] font-medium hover:opacity-90 border-none cursor-pointer">
                Add Volunteer
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
