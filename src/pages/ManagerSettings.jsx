// ManagerSettings.jsx — Operations Manager settings screen
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { X, Menu, AlertTriangle, Check } from "lucide-react";
import { db } from "../firebase";
import { ref, get, set, remove } from "firebase/database";
import Sidebar from "../components/Sidebar";

const DAY_OPTIONS = [
  { key: "monday",    label: "Mon" },
  { key: "tuesday",   label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday",  label: "Thu" },
  { key: "friday",    label: "Fri" },
];

const DEFAULTS = {
  displayName:  "Jason Bratina",
  initials:     "JB",
  password:     "admin",
  orgName:      "IMPACT Center",
  location:     "Greenwood, IN",
  deliveryDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
};

function deriveInitials(name) {
  if (!name?.trim()) return "?";
  return name.trim().split(/\s+/).map(w => w[0].toUpperCase()).join("").slice(0, 2);
}

export default function ManagerSettings() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const sidebarMode = location.state?.mode ?? "pantry";

  // ── Profile state ──────────────────────────────────────────────────────────
  const [displayName,   setDisplayName]   = useState(DEFAULTS.displayName);
  const [initials,      setInitials]      = useState(DEFAULTS.initials);
  const [currentPw,     setCurrentPw]     = useState("");
  const [newPw,         setNewPw]         = useState("");
  const [confirmPw,     setConfirmPw]     = useState("");
  const [profileError,  setProfileError]  = useState("");

  // ── App settings state ─────────────────────────────────────────────────────
  const [orgName,       setOrgName]       = useState(DEFAULTS.orgName);
  const [appLocation,   setAppLocation]   = useState(DEFAULTS.location);
  const [deliveryDays,  setDeliveryDays]  = useState(DEFAULTS.deliveryDays);

  // ── Stored password (for validation) ──────────────────────────────────────
  const [storedPassword, setStoredPassword] = useState(DEFAULTS.password);

  // ── Reset modal state ──────────────────────────────────────────────────────
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetScope,     setResetScope]     = useState(null);
  const [resetStep,      setResetStep]      = useState(1);

  // ── Toast ──────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState(null);

  // ── Mobile menu ────────────────────────────────────────────────────────────
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  }

  // ── Load from Firebase on mount ────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const snap = await get(ref(db, "appSettings"));
      if (!snap.exists()) return;
      const data = snap.val();
      if (data.profile?.displayName) {
        setDisplayName(data.profile.displayName);
        setInitials(data.profile.initials ?? deriveInitials(data.profile.displayName));
      }
      if (data.auth?.password)  setStoredPassword(data.auth.password);
      if (data.app?.orgName)    setOrgName(data.app.orgName);
      if (data.app?.location)   setAppLocation(data.app.location);
      if (data.app?.deliveryDays) setDeliveryDays(data.app.deliveryDays);
    }
    load();
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleDisplayNameChange(val) {
    setDisplayName(val);
    setInitials(deriveInitials(val));
  }

  function toggleDay(day) {
    setDeliveryDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  }

  async function handleSaveProfile() {
    setProfileError("");

    // If any password field is filled, validate all three
    if (currentPw || newPw || confirmPw) {
      if (currentPw !== storedPassword) {
        setProfileError("Current password is incorrect.");
        return;
      }
      if (newPw.length < 4) {
        setProfileError("New password must be at least 4 characters.");
        return;
      }
      if (newPw !== confirmPw) {
        setProfileError("New passwords do not match.");
        return;
      }
      await set(ref(db, "appSettings/auth/password"), newPw);
      setStoredPassword(newPw);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    }

    const derived = deriveInitials(displayName);
    await set(ref(db, "appSettings/profile"), { displayName, initials: derived });

    // Sync sidebar display
    const nameEl = document.getElementById("sidebar-name");
    const initEl = document.getElementById("sidebar-initials");
    if (nameEl) nameEl.textContent = displayName;
    if (initEl) initEl.textContent = derived;

    showToast("Profile updated");
  }

  async function handleSaveApp() {
    await set(ref(db, "appSettings/app"), { orgName, location: appLocation, deliveryDays });
    showToast("Settings saved");
  }

  async function handleReset(scope) {
    try {
      if (scope === "pantry" || scope === "all") {
        await remove(ref(db, "tasks"));
        await remove(ref(db, "completedTasks"));
      }
      if (scope === "delivery" || scope === "all") {
        await remove(ref(db, "routeOccurrences"));
        await remove(ref(db, "routeHistory"));
      }
      setShowResetModal(false);
      setResetScope(null);
      setResetStep(1);
      showToast(
        scope === "all"      ? "System reset complete" :
        scope === "pantry"   ? "Pantry data cleared"   :
                               "Delivery data cleared"
      );
    } catch (err) {
      console.error("Reset error:", err);
    }
  }

  const todayDisplay = new Date().toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });

  const RESET_OPTIONS = [
    {
      key:   "pantry",
      title: "Pantry Data",
      desc:  "Clears all tasks and task history",
      danger: false,
    },
    {
      key:   "delivery",
      title: "Delivery Data",
      desc:  "Clears all route occurrences and delivery history",
      danger: false,
    },
    {
      key:   "all",
      title: "Everything",
      desc:  "Clears all pantry and delivery data",
      danger: true,
    },
  ];

  const SCOPE_LABEL = {
    pantry:   "Pantry Data",
    delivery: "Delivery Data",
    all:      "Everything",
  };

  const MOBILE_NAV = [
    { label: "Dashboard", path: "/manager/dashboard",            active: false },
    { label: "Tasks",     path: "/manager-tasks",                active: false },
    { label: "Volunteers",path: "/manager-volunteers",           active: false },
    { label: "History",   path: "/manager/history",              active: false },
    { label: "Settings",  path: "/manager-settings",             active: true  },
  ];

  // ── Shared card class ──────────────────────────────────────────────────────
  const card = "bg-white rounded-xl border border-[#e5e7eb] p-5 mb-4";
  const inputCls = `w-full border border-[#e5e7eb] rounded-lg px-4 py-2.5 text-[14px]
    text-[#0a2a3a] placeholder-[#b3b3b3] outline-none focus:border-[#0d9488]`;
  const labelCls = "text-[#6b7280] text-[12px] mb-1 block";
  const saveBtnCls = `w-full bg-[#09665e] hover:bg-[#0d9488] text-white px-4 py-2
    rounded-lg text-[13px] font-medium mt-4 border-none cursor-pointer transition-colors`;

  return (
    <div className="min-h-screen bg-[#f5f5f5]"
      style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* ════════════════════════════════════════════════════════════════════
          MOBILE LAYOUT
      ════════════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden min-h-screen flex flex-col pb-10">

        {/* Mobile header */}
        <div className="bg-[#0a2a3a] px-4 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <p className="text-[#0d9488] text-[10px] uppercase tracking-widest">Operations Manager</p>
            <p className="text-white text-[18px] font-semibold leading-tight">Settings</p>
          </div>
          <button onClick={() => setMobileMenuOpen(o => !o)}
            className="text-white bg-transparent border-none cursor-pointer p-1">
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Hamburger overlay */}
        {mobileMenuOpen && (
          <>
            <div className="fixed inset-0 bg-black/40 z-30" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed top-0 left-0 right-0 z-40 bg-[#0a2a3a]"
              style={{ animation: "slideDown 0.22s ease" }}>
              <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-[#1a3a4a]">
                <p className="text-white text-[14px] font-semibold tracking-wide">IMPACT CENTER</p>
                <button onClick={() => setMobileMenuOpen(false)}
                  className="text-white bg-transparent border-none cursor-pointer p-1">
                  <X size={20} />
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
                <p className="text-[#b3b3b3] text-[13px] font-semibold">{displayName}</p>
                <button onClick={() => navigate("/")}
                  className="text-[#dc2626] text-[12px] bg-transparent border-none cursor-pointer">
                  Logout
                </button>
              </div>
            </div>
          </>
        )}

        <div className="px-4 pt-5">
          <SettingsContent
            card={card} inputCls={inputCls} labelCls={labelCls} saveBtnCls={saveBtnCls}
            displayName={displayName} initials={initials}
            onDisplayNameChange={handleDisplayNameChange}
            currentPw={currentPw} setCurrentPw={setCurrentPw}
            newPw={newPw} setNewPw={setNewPw}
            confirmPw={confirmPw} setConfirmPw={setConfirmPw}
            profileError={profileError} onSaveProfile={handleSaveProfile}
            orgName={orgName} setOrgName={setOrgName}
            appLocation={appLocation} setAppLocation={setAppLocation}
            deliveryDays={deliveryDays} onToggleDay={toggleDay}
            onSaveApp={handleSaveApp}
            onOpenReset={() => setShowResetModal(true)}
          />
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          DESKTOP LAYOUT
      ════════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex min-h-screen">
        <Sidebar mode={sidebarMode} activePath="/manager-settings" />

        <div className="ml-[220px] flex-1 flex flex-col min-h-screen">
          {/* Top bar */}
          <div className="bg-white border-b border-[#e5e7eb] h-16 flex items-center justify-between px-6 sticky top-0 z-10">
            <div>
              <p className="text-[#0d9488] text-[10px] uppercase tracking-widest">Operations Manager</p>
              <h1 className="text-[22px] font-semibold text-[#0a2a3a] tracking-tight leading-tight">Settings</h1>
            </div>
            <span className="text-[#6b7280] text-[13px]">{todayDisplay}</span>
          </div>

          <div className="p-6 max-w-[640px]">
            <SettingsContent
              card={card} inputCls={inputCls} labelCls={labelCls} saveBtnCls={saveBtnCls}
              displayName={displayName} initials={initials}
              onDisplayNameChange={handleDisplayNameChange}
              currentPw={currentPw} setCurrentPw={setCurrentPw}
              newPw={newPw} setNewPw={setNewPw}
              confirmPw={confirmPw} setConfirmPw={setConfirmPw}
              profileError={profileError} onSaveProfile={handleSaveProfile}
              orgName={orgName} setOrgName={setOrgName}
              appLocation={appLocation} setAppLocation={setAppLocation}
              deliveryDays={deliveryDays} onToggleDay={toggleDay}
              onSaveApp={handleSaveApp}
              onOpenReset={() => setShowResetModal(true)}
            />
          </div>
        </div>
      </div>

      {/* ── Reset Modal ─────────────────────────────────────────────────────── */}
      {showResetModal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40"
            onClick={() => { setShowResetModal(false); setResetScope(null); setResetStep(1); }} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50
            bg-white rounded-xl p-6 w-[360px] max-w-[calc(100vw-2rem)] border border-[#e5e7eb]">

            {resetStep === 1 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[#0a2a3a] text-[18px] font-semibold">Reset System</p>
                  <button onClick={() => { setShowResetModal(false); setResetScope(null); setResetStep(1); }}
                    className="text-[#6b7280] hover:text-[#0a2a3a] bg-transparent border-none cursor-pointer">
                    <X size={20} />
                  </button>
                </div>
                <p className="text-[#6b7280] text-[13px] mb-4">What would you like to reset?</p>

                {RESET_OPTIONS.map(opt => (
                  <div key={opt.key}
                    onClick={() => setResetScope(opt.key)}
                    className={`bg-[#f9fafb] border rounded-xl p-4 mb-3 cursor-pointer transition-colors
                      ${resetScope === opt.key
                        ? "border-[#dc2626] bg-[#fff0f0]"
                        : "border-[#e5e7eb] hover:border-[#dc2626]"}`}>
                    <p className={`text-[14px] font-medium ${opt.danger ? "text-[#dc2626]" : "text-[#0a2a3a]"}`}>
                      {opt.title}
                    </p>
                    <p className="text-[#6b7280] text-[12px] mt-0.5">{opt.desc}</p>
                  </div>
                ))}

                <div className="flex gap-3 mt-2">
                  <button onClick={() => { setShowResetModal(false); setResetScope(null); }}
                    className="flex-1 border border-[#e5e7eb] text-[#6b7280] py-2.5 rounded-lg
                      text-[14px] hover:bg-[#f5f5f5] bg-transparent cursor-pointer">
                    Cancel
                  </button>
                  <button
                    disabled={!resetScope}
                    onClick={() => setResetStep(2)}
                    className={`flex-1 bg-[#dc2626] text-white py-2.5 rounded-lg text-[14px]
                      font-medium border-none cursor-pointer transition-opacity
                      ${!resetScope ? "opacity-40 cursor-not-allowed" : "hover:bg-[#b91c1c]"}`}>
                    Continue →
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[#0a2a3a] text-[18px] font-semibold">Are you sure?</p>
                  <button onClick={() => { setShowResetModal(false); setResetScope(null); setResetStep(1); }}
                    className="text-[#6b7280] hover:text-[#0a2a3a] bg-transparent border-none cursor-pointer">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex flex-col items-center py-2 mb-4">
                  <AlertTriangle size={40} color="#dc2626" className="mb-3" />
                  <p className="text-[#0a2a3a] text-[14px] font-medium text-center">
                    You are about to reset: {SCOPE_LABEL[resetScope]}
                  </p>
                  <p className="text-[#6b7280] text-[13px] text-center mt-2">
                    This action cannot be undone. All selected data will be permanently deleted.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setResetStep(1)}
                    className="flex-1 border border-[#e5e7eb] text-[#6b7280] py-2.5 rounded-lg
                      text-[14px] hover:bg-[#f5f5f5] bg-transparent cursor-pointer">
                    Go Back
                  </button>
                  <button onClick={() => handleReset(resetScope)}
                    className="flex-1 bg-[#dc2626] hover:bg-[#b91c1c] text-white py-2.5 rounded-lg
                      text-[14px] font-medium border-none cursor-pointer transition-colors">
                    Yes, Reset
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* ── Toast ───────────────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
          bg-[#0a2a3a] text-white px-5 py-2.5 rounded-xl text-[13px]
          font-medium shadow-lg whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  );
}

// ── Extracted shared content (used in both mobile and desktop layouts) ────────
function SettingsContent({
  card, inputCls, labelCls, saveBtnCls,
  displayName, initials, onDisplayNameChange,
  currentPw, setCurrentPw, newPw, setNewPw, confirmPw, setConfirmPw,
  profileError, onSaveProfile,
  orgName, setOrgName, appLocation, setAppLocation,
  deliveryDays, onToggleDay, onSaveApp,
  onOpenReset,
}) {
  return (
    <>
      {/* ── Section 1: Profile ────────────────────────────────────────────── */}
      <div className={card}>
        <p className="text-[#0a2a3a] text-[15px] font-semibold mb-4">Profile</p>

        {/* Avatar preview */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-[#0d9488] flex items-center justify-center">
            <span className="text-white text-[20px] font-semibold">{initials}</span>
          </div>
        </div>

        {/* Display name */}
        <div className="mb-4">
          <label className={labelCls}>Display Name</label>
          <input type="text" value={displayName}
            onChange={e => onDisplayNameChange(e.target.value)}
            className={inputCls} />
        </div>

        {/* Password fields */}
        <div className="mb-1">
          <label className={labelCls}>Current Password</label>
          <input type="password" placeholder="Enter current password"
            value={currentPw} onChange={e => setCurrentPw(e.target.value)}
            className={inputCls} />
        </div>
        <div className="mt-3 mb-1">
          <label className={labelCls}>New Password</label>
          <input type="password" placeholder="Enter new password"
            value={newPw} onChange={e => setNewPw(e.target.value)}
            className={inputCls} />
        </div>
        <div className="mt-3">
          <label className={labelCls}>Confirm New Password</label>
          <input type="password" placeholder="Confirm new password"
            value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
            className={inputCls} />
        </div>

        {profileError && (
          <p className="text-[#dc2626] text-[11px] mt-2">{profileError}</p>
        )}

        <button onClick={onSaveProfile} className={saveBtnCls}>
          Save Profile
        </button>
      </div>

      {/* ── Section 2: App Settings ───────────────────────────────────────── */}
      <div className={card}>
        <p className="text-[#0a2a3a] text-[15px] font-semibold mb-4">App Settings</p>

        <div className="mb-4">
          <label className={labelCls}>Organization Name</label>
          <input type="text" value={orgName}
            onChange={e => setOrgName(e.target.value)}
            className={inputCls} />
        </div>

        <div className="mb-4">
          <label className={labelCls}>Location</label>
          <input type="text" value={appLocation}
            onChange={e => setAppLocation(e.target.value)}
            className={inputCls} />
        </div>

        <div>
          <label className={labelCls + " mb-2"}>Active Delivery Days</label>
          <div className="flex flex-wrap gap-2">
            {DAY_OPTIONS.map(({ key, label }) => {
              const active = deliveryDays.includes(key);
              return (
                <button key={key} type="button" onClick={() => onToggleDay(key)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium border-none cursor-pointer transition-colors
                    ${active
                      ? "bg-[#0d9488] text-white"
                      : "bg-[#f0f0f0] text-[#6b7280] hover:bg-[#e5e5e5]"}`}>
                  {active && <Check size={10} className="inline mr-1" strokeWidth={3} />}
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <button onClick={onSaveApp} className={saveBtnCls}>
          Save Settings
        </button>
      </div>

      {/* ── Section 3: Reset System ───────────────────────────────────────── */}
      <div className={card}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[#0a2a3a] text-[15px] font-semibold">Reset System</p>
          <AlertTriangle size={16} color="#dc2626" />
        </div>
        <p className="text-[#6b7280] text-[13px] mt-1 mb-4">
          Permanently delete data from the system. This cannot be undone.
        </p>
        <button onClick={onOpenReset}
          className="bg-[#fff0f0] text-[#dc2626] border border-[#dc2626] rounded-xl
            px-4 py-2.5 text-[13px] font-medium w-full cursor-pointer
            hover:bg-[#dc2626] hover:text-white transition-colors">
          Reset System Data
        </button>
      </div>
    </>
  );
}
