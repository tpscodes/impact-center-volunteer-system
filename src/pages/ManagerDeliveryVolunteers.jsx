// ManagerDeliveryVolunteers.jsx — Delivery drivers roster
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { Search, UserPlus, UserCheck, X, Menu, Check, User, Truck } from "lucide-react";
import { db } from "../firebase";
import { ref, onValue, set, remove } from "firebase/database";

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
  return {
    start: mon.toISOString().slice(0, 10),
    end:   sun.toISOString().slice(0, 10),
  };
}

function claimedArray(claimedBy) {
  if (!claimedBy) return [];
  return Array.isArray(claimedBy) ? claimedBy : Object.values(claimedBy);
}

// ── Driver card ───────────────────────────────────────────────────────────────
function DriverCard({ vol, weekCount, onRemoveTag, onRemove }) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-xl p-4 mb-0">
      {/* Row 1 — avatar · name · tags */}
      <div className="flex items-center mb-2">
        <div className="w-9 h-9 bg-[#0d9488] rounded-full flex items-center justify-center text-white text-[12px] font-semibold shrink-0">
          {getInitials(vol.name)}
        </div>
        <p className="text-[#0a2a3a] text-[14px] font-semibold ml-3 flex-1 min-w-0 truncate">
          {vol.name}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          <span className="bg-[#ccedeb] text-[#09665e] text-[11px] px-2 py-0.5 rounded-full">
            Driver
          </span>
          {vol.isPantry === true && (
            <span className="bg-[#ccedeb] text-[#09665e] text-[11px] px-2 py-0.5 rounded-full ml-1">
              Pantry
            </span>
          )}
        </div>
      </div>

      {/* Row 2 — ID · routes this week */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-1 text-[#6b7280] text-[12px]">
          <User size={13} />
          <span>ID: {vol.id}</span>
        </div>
        <div className="flex items-center gap-1 text-[#6b7280] text-[12px]">
          <Truck size={13} />
          <span>{weekCount} route{weekCount !== 1 ? "s" : ""} this week</span>
        </div>
      </div>

      {/* Row 3 — actions */}
      <div className="flex items-center gap-2">
        <button onClick={() => onRemoveTag(vol)}
          className="text-[#ff9500] text-[12px] border border-[#ff9500] rounded-lg px-3 py-1 hover:bg-[#fff3e0] bg-transparent cursor-pointer">
          Remove Driver Tag
        </button>
        <button onClick={() => onRemove(vol)}
          className="text-[#dc2626] text-[12px] border border-[#dc2626] rounded-lg px-3 py-1 hover:bg-[#fff0f0] bg-transparent cursor-pointer">
          Remove Volunteer
        </button>
      </div>
    </div>
  );
}

// ── Add Driver Modal ──────────────────────────────────────────────────────────
// State lives here so typing never causes the parent component to re-render,
// preventing the input focus loss bug on every keystroke.
function AddDriverModal({ volunteers, onClose, onAdd }) {
  const firstNameRef = useRef(null);
  const lastNameRef  = useRef(null);
  const idRef        = useRef(null);
  const [isPantry,   setIsPantry]   = useState(false);
  const [modalError, setModalError] = useState("");

  async function handleSubmit() {
    const firstName = firstNameRef.current?.value?.trim() ?? "";
    const lastName  = lastNameRef.current?.value?.trim() ?? "";
    const id        = idRef.current?.value?.trim() ?? "";
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
                      bg-white rounded-xl p-6 w-[340px] lg:w-[480px] border border-[#e5e7eb]">
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
                              bg-[#ccedeb] text-[#09665e] text-[12px] font-medium
                              cursor-not-allowed select-none">
                <Check size={12} strokeWidth={2.5} />
                Driver
              </div>
              <button type="button" onClick={() => setIsPantry(p => !p)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px]
                            font-medium border-none cursor-pointer transition-colors
                            ${isPantry ? "bg-[#ccedeb] text-[#09665e]" : "bg-[#f0f0f0] text-[#6b7280]"}`}>
                {isPantry && <Check size={12} strokeWidth={2.5} />}
                Pantry
              </button>
            </div>
          </div>

          {modalError && <p className="text-[#dc2626] text-[13px]">{modalError}</p>}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 border border-[#e5e7eb] text-[#6b7280] py-2.5 rounded-lg
                       text-[14px] hover:bg-[#f5f5f5] bg-transparent cursor-pointer">
            Cancel
          </button>
          <button onClick={handleSubmit}
            className="flex-1 bg-[#09665e] text-white py-2.5 rounded-lg text-[14px]
                       font-medium hover:opacity-90 border-none cursor-pointer">
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

  const [volunteers, setVolunteers] = useState([]);
  const [routes,     setRoutes]     = useState([]);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [showAddModal,   setShowAddModal]   = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Firebase listeners
  useEffect(() => {
    const unsub = onValue(ref(db, "volunteers"), (snap) => {
      const data = snap.val();
      setVolunteers(data ? Object.values(data) : []);
    });
    return () => unsub();
  }, []);

  // TODO: migrate to routeOccurrences/ — deliveryRoutes/ is deprecated
  useEffect(() => {
    const unsub = onValue(ref(db, "deliveryRoutes"), (snap) => {
      const data = snap.val();
      setRoutes(data ? Object.entries(data).map(([key, val]) => ({ key, ...val })) : []);
    });
    return () => unsub();
  }, []);

  // Derived
  const drivers    = volunteers.filter(v => v.isDriver === true);
  const todayStr   = getTodayStr();
  const { start: weekStart, end: weekEnd } = getWeekRange();

  const todayRoutes = routes.filter(r => r.date === todayStr);

  // Active Today: drivers who appear in claimedBy of any route today
  const activeTodaySet = new Set();
  todayRoutes.forEach(r => {
    claimedArray(r.claimedBy).forEach(val => {
      drivers.forEach(d => {
        if (val === d.name || val === d.id) activeTodaySet.add(d.id);
      });
    });
  });

  const routesCompleted = routes.filter(
    r => r.date === todayStr && r.status === "complete"
  ).length;

  function weekCountFor(vol) {
    return routes.filter(r => {
      if (r.date < weekStart || r.date > weekEnd) return false;
      return claimedArray(r.claimedBy).some(val => val === vol.name || val === vol.id);
    }).length;
  }

  const filtered = drivers.filter(v => {
    const q = searchQuery.toLowerCase();
    return !q || v.name?.toLowerCase().includes(q) || String(v.id).includes(q);
  });

  // Handlers
  async function handleRemoveDriverTag(vol) {
    await set(ref(db, `volunteers/${vol.id}/isDriver`), false);
  }

  async function handleRemoveVolunteer(vol) {
    if (!window.confirm(`Remove ${vol.name} from volunteers entirely?`)) return;
    await remove(ref(db, `volunteers/${vol.id}`));
  }

  async function handleAddDriver({ fullName, id, isPantry }) {
    await set(ref(db, `volunteers/${id}`), {
      id,
      name:       fullName,
      active:     false,
      lastActive: null,
      isDriver:   true,
      ...(isPantry ? { isPantry: true } : {}),
    });
  }

  const todayDisplay = new Date().toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });

  const MOBILE_NAV = [
    { label: "Dashboard", path: "/manager-delivery",           active: false },
    { label: "Routes",    path: "/manager-delivery-routes",    active: false },
    { label: "Drivers",   path: "/manager-delivery-volunteers",active: true  },
    { label: "History",   path: "/manager-delivery-history",   active: false },
  ];

  // ── Shared stats data ──────────────────────────────────────────────────────
  const STATS = [
    { label: "Total Drivers",    value: drivers.length,        color: "#0d9488" },
    { label: "Active Today",     value: activeTodaySet.size,   color: "#ff9500" },
    { label: "Routes Completed", value: routesCompleted,        color: "#34c759" },
  ];

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════════════
          MOBILE LAYOUT
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden min-h-screen bg-[#f5f5f5] flex flex-col pb-24"
        style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

        {/* Mobile top bar */}
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

        {/* Hamburger overlay */}
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
              {/* Mode toggle — Delivery active */}
              <div className="flex mx-4 my-3 bg-[#0d2233] rounded-lg p-0.5">
                <button onClick={() => { setMobileMenuOpen(false); navigate("/manager/dashboard"); }}
                  className="flex-1 py-1.5 rounded-md text-[12px] font-medium text-[#6b7280] hover:text-[#b3b3b3]">
                  Pantry
                </button>
                <button className="flex-1 py-1.5 rounded-md text-[12px] font-medium bg-[#09665e] text-white">
                  Delivery
                </button>
              </div>
              <nav className="flex flex-col py-2">
                {MOBILE_NAV.map(item => (
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
          <h1 className="text-[22px] font-semibold text-[#0a2a3a] tracking-tight">Drivers</h1>
        </div>

        {/* Stats grid */}
        <div className="px-4 pt-4 grid grid-cols-2 gap-3">
          <div className="bg-white border border-[#e5e7eb] rounded-xl px-4 py-3">
            <p className="text-[#6b7280] text-[11px] mb-1">Total Drivers</p>
            <p className="text-[28px] font-semibold leading-none" style={{ color: STATS[0].color }}>
              {STATS[0].value}
            </p>
          </div>
          <div className="bg-white border border-[#e5e7eb] rounded-xl px-4 py-3">
            <p className="text-[#6b7280] text-[11px] mb-1">Active Today</p>
            <p className="text-[28px] font-semibold leading-none" style={{ color: STATS[1].color }}>
              {STATS[1].value}
            </p>
          </div>
          <div className="bg-white border border-[#e5e7eb] rounded-xl px-4 py-3 col-span-2">
            <p className="text-[#6b7280] text-[11px] mb-1">Routes Completed</p>
            <p className="text-[28px] font-semibold leading-none" style={{ color: STATS[2].color }}>
              {STATS[2].value}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pt-4">
          <div className="flex items-center gap-2 border border-[#e5e7eb] rounded-lg px-3 py-2.5 bg-white">
            <Search size={14} className="text-[#b3b3b3] shrink-0" />
            <input type="text" placeholder="Search by name or ID..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 text-[13px] text-[#0a2a3a] placeholder-[#b3b3b3] outline-none bg-transparent" />
          </div>
        </div>

        {/* Driver cards */}
        <div className="px-4 pt-4 flex flex-col gap-3">
          {filtered.length === 0 ? (
            <div className="bg-white border border-[#e5e7eb] rounded-xl px-5 py-12 text-center flex flex-col items-center">
              <UserCheck size={40} style={{ color: "#ccedeb" }} />
              <p className="text-[#0a2a3a] text-[15px] font-semibold mt-3">No drivers added yet</p>
              <p className="text-[#6b7280] text-[13px] mt-1">Add your first driver to get started</p>
              <button onClick={() => setShowAddModal(true)}
                className="mt-4 flex items-center gap-2 bg-[#09665e] text-white px-4 py-2
                           rounded-lg text-[13px] font-medium border-none cursor-pointer">
                <UserPlus size={14} />
                Add Driver
              </button>
            </div>
          ) : (
            filtered.map(vol => (
              <DriverCard key={vol.id} vol={vol} weekCount={weekCountFor(vol)}
                onRemoveTag={handleRemoveDriverTag} onRemove={handleRemoveVolunteer} />
            ))
          )}
        </div>

        {/* Fixed bottom button */}
        <div className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-white border-t border-[#e5e7eb] z-20">
          <button onClick={() => setShowAddModal(true)}
            className="w-full flex items-center justify-center gap-2 bg-[#09665e] text-white
                       py-3 rounded-xl text-[15px] font-semibold border-none cursor-pointer active:opacity-80">
            <UserPlus size={16} />
            Add Driver
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          DESKTOP LAYOUT
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex min-h-screen bg-[#f5f5f5]"
        style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

        <Sidebar mode="delivery" activePath="/manager-delivery-volunteers" />

        <div className="lg:ml-[220px] flex-1 flex flex-col min-h-screen">

          {/* Top bar */}
          <div className="bg-white border-b border-[#e5e7eb] h-16 flex items-center justify-between px-6 sticky top-0 z-10">
            <div>
              <p className="text-[#0d9488] text-[10px] uppercase tracking-widest">Operations Manager</p>
              <h1 className="text-[22px] font-semibold text-[#0a2a3a] tracking-tight leading-tight">
                Drivers
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[#6b7280] text-[13px]">{todayDisplay}</span>
              <button onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 bg-[#09665e] text-white px-4 py-2 rounded-lg
                           text-[13px] font-medium hover:opacity-90 border-none cursor-pointer">
                <UserPlus size={14} />
                Add Driver
              </button>
            </div>
          </div>

          <div className="p-6 flex flex-col gap-5">

            {/* Stats row */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {STATS.map(s => (
                <div key={s.label} className="bg-white border border-[#e5e7eb] rounded-xl px-4 py-3 h-[80px] flex flex-col justify-center">
                  <p className="text-[#6b7280] text-[12px] mb-1">{s.label}</p>
                  <p className="text-[28px] font-semibold leading-none" style={{ color: s.color }}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 border border-[#e5e7eb] rounded-lg px-3 py-2.5 bg-white max-w-[420px]">
              <Search size={14} className="text-[#b3b3b3] shrink-0" />
              <input type="text" placeholder="Search by name or ID..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 text-[13px] text-[#0a2a3a] placeholder-[#b3b3b3] outline-none bg-transparent" />
            </div>

            {/* Driver list */}
            {filtered.length === 0 ? (
              <div className="bg-white border border-[#e5e7eb] rounded-xl px-5 py-16 flex flex-col items-center">
                <UserCheck size={40} style={{ color: "#ccedeb" }} />
                <p className="text-[#0a2a3a] text-[15px] font-semibold mt-3">No drivers added yet</p>
                <p className="text-[#6b7280] text-[13px] mt-1">Add your first driver to get started</p>
                <button onClick={() => setShowAddModal(true)}
                  className="mt-4 flex items-center gap-2 bg-[#09665e] text-white px-4 py-2
                             rounded-lg text-[13px] font-medium border-none cursor-pointer">
                  <UserPlus size={14} />
                  Add Driver
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filtered.map(vol => (
                  <DriverCard key={vol.id} vol={vol} weekCount={weekCountFor(vol)}
                    onRemoveTag={handleRemoveDriverTag} onRemove={handleRemoveVolunteer} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

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
