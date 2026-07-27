// ManagerSettings.jsx — Operations Manager settings screen
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { X, AlertTriangle, Check } from "lucide-react";
import MobileNav from "../components/MobileNav";
import { db } from "../firebase";
import { ref, get, set, remove, update } from "firebase/database";
import Sidebar from "../components/Sidebar";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../contexts/AuthContext";

const DAY_OPTIONS = [
  { key: "monday",    label: "Mon" },
  { key: "tuesday",   label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday",  label: "Thu" },
  { key: "friday",    label: "Fri" },
  { key: "saturday",  label: "Sat" },
  { key: "sunday",    label: "Sun" },
];

const DEFAULTS = {
  displayName:  "",
  initials:     "",
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
  const { pantryId, updateProfile, logout, displayName: authDisplayName, initials: authInitials } = useAuth();

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


  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  }

  // ── Load from Firebase on mount ────────────────────────────────────────────
  useEffect(() => {
    if (!pantryId) return;
    async function load() {
      const snap = await get(ref(db, `pantries/${pantryId}/appSettings`));
      if (!snap.exists()) return;
      const data = snap.val();
      // Profile node takes precedence; fall back to auth node (covers accounts
      // that have never saved Settings, e.g. Amber on first login).
      if (data.profile?.displayName) {
        setDisplayName(data.profile.displayName);
        setInitials(data.profile.initials ?? deriveInitials(data.profile.displayName));
      } else if (data.auth?.displayName) {
        setDisplayName(data.auth.displayName);
        setInitials(data.auth.initials ?? deriveInitials(data.auth.displayName));
      }
      if (data.auth?.password)  setStoredPassword(data.auth.password);
      if (data.app?.orgName)    setOrgName(data.app.orgName);
      if (data.app?.location)   setAppLocation(data.app.location);
      if (data.app?.deliveryDays) {
        const dd = data.app.deliveryDays;
        // Firebase may store deliveryDays as an object { monday: true, ... }
        // or as an array ["monday", ...] — normalise to array either way.
        if (Array.isArray(dd)) {
          setDeliveryDays(dd);
        } else if (dd && typeof dd === "object") {
          setDeliveryDays(Object.entries(dd).filter(([, v]) => v).map(([k]) => k));
        }
      }
    }
    load();
  }, [pantryId]);

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
      await set(ref(db, `pantries/${pantryId}/appSettings/auth/password`), newPw);
      setStoredPassword(newPw);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    }

    const derived = deriveInitials(displayName);
    // Write to profile node (Settings source of truth) AND auth node (read on login).
    // Both must stay in sync so re-login always reflects the latest display name.
    await Promise.all([
      set(ref(db, `pantries/${pantryId}/appSettings/profile`), { displayName, initials: derived }),
      update(ref(db, `pantries/${pantryId}/appSettings/auth`), { displayName, initials: derived }),
    ]);

    // Sync sidebar and in-memory auth context immediately (no logout required)
    updateProfile({ displayName, initials: derived });

    showToast("Profile updated");
  }

  async function handleSaveApp() {
    await set(ref(db, `pantries/${pantryId}/appSettings/app`), { orgName, location: appLocation, deliveryDays });
    showToast("Settings saved");
  }

  async function handleReset(scope) {
    try {
      if (scope === "pantry" || scope === "all") {
        await remove(ref(db, `pantries/${pantryId}/tasks`));
        await remove(ref(db, `pantries/${pantryId}/completedTasks`));
      }
      if (scope === "delivery" || scope === "all") {
        await remove(ref(db, `pantries/${pantryId}/routeOccurrences`));
        await remove(ref(db, `pantries/${pantryId}/routeHistory`));
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
    { label: "History",   path: "/manager-history",              active: false },
    { label: "Settings",  path: "/manager-settings",             active: true  },
  ];

  // ── Shared card class ──────────────────────────────────────────────────────
  const card = "bg-white rounded-[20px] border border-[#e5e7eb] p-6";
  const inputCls = `w-full border border-[#e5e7eb] rounded-[10px] px-4 py-2.5 text-[14px]
    text-[#0a2a3a] placeholder-[#b3b3b3] outline-none focus:border-2 focus:border-[#09665e]`;
  const labelCls = "text-[#6b7280] text-[13px] font-medium mb-1.5 block";
  const saveBtnCls = `w-full bg-[#09665e] hover:bg-[#0f7a70] text-white px-4 h-[48px]
    rounded-full text-[14px] font-semibold mt-4 border-none cursor-pointer transition-colors`;

  return (
    <div className="min-h-screen bg-[#D3EDE9]"
      style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* ════════════════════════════════════════════════════════════════════
          MOBILE LAYOUT
      ════════════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden min-h-screen flex flex-col pb-10">

        {/* Mobile nav */}
        <div style={{ background: 'linear-gradient(143deg, #0f7a70 14%, #0a2a3a 86%)', borderRadius: '0 0 28px 28px', marginBottom: 20 }}>
          <MobileNav />
        </div>

        <div className="px-4 pt-2">
          <SettingsContent
            card={card} inputCls={inputCls} labelCls={labelCls} saveBtnCls={saveBtnCls}
            pantryId={pantryId}
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

        <div className="lg:ml-[var(--sidebar-w)] flex-1 flex flex-col min-h-screen">
          {/* Pill header */}
          <div className="px-6 pt-5 pb-3">
            <PageHeader initials={authInitials} label="Settings" />
          </div>

          <div className="px-6 pb-6">
            <SettingsContent
              card={card} inputCls={inputCls} labelCls={labelCls} saveBtnCls={saveBtnCls}
              pantryId={pantryId}
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
            bg-white rounded-[20px] p-6 w-[380px] max-w-[calc(100vw-2rem)] border border-[#e5e7eb]"
            style={{ boxShadow: "0 24px 60px rgba(10,42,58,0.28)" }}>

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
                    className="flex-1 border border-[#e5e7eb] text-[#6b7280] h-[44px] rounded-full
                      text-[14px] hover:bg-[#f5f5f5] bg-transparent cursor-pointer">
                    Cancel
                  </button>
                  <button
                    disabled={!resetScope}
                    onClick={() => setResetStep(2)}
                    className={`flex-1 bg-[#dc2626] text-white h-[44px] rounded-full text-[14px]
                      font-semibold border-none cursor-pointer transition-opacity
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
                    className="flex-1 border border-[#e5e7eb] text-[#6b7280] h-[44px] rounded-full
                      text-[14px] hover:bg-[#f5f5f5] bg-transparent cursor-pointer">
                    Go Back
                  </button>
                  <button onClick={() => handleReset(resetScope)}
                    className="flex-1 bg-[#dc2626] hover:bg-[#b91c1c] text-white h-[44px] rounded-full
                      text-[14px] font-semibold border-none cursor-pointer transition-colors">
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
  pantryId,
  displayName, initials, onDisplayNameChange,
  currentPw, setCurrentPw, newPw, setNewPw, confirmPw, setConfirmPw,
  profileError, onSaveProfile,
  orgName, setOrgName, appLocation, setAppLocation,
  deliveryDays, onToggleDay, onSaveApp,
  onOpenReset,
}) {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start mb-4">
      {/* ── Section 1: Profile ────────────────────────────────────────────── */}
      <div className={card}>
        <p className="text-[#0a2a3a] text-[17px] font-semibold mb-5">Profile</p>

        {/* Avatar preview */}
        <div className="flex justify-center mb-6">
          <div className="w-[72px] h-[72px] rounded-full bg-[#0d9488] flex items-center justify-center">
            <span className="text-white text-[22px] font-semibold">{initials}</span>
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
        <p className="text-[#0a2a3a] text-[17px] font-semibold mb-5">App Settings</p>

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

        {/* Delivery days only relevant for pantries that run delivery (not Amber) */}
        {pantryId !== 'amber' && (
          <div>
            <label className={labelCls + " mb-2"}>Active Delivery Days</label>
            <div className="flex flex-wrap gap-2">
              {DAY_OPTIONS.map(({ key, label }) => {
                const active = deliveryDays.includes(key);
                return (
                  <button key={key} type="button" onClick={() => onToggleDay(key)}
                    className={`inline-flex items-center gap-1.5 px-4 h-9 rounded-full text-[13px] font-medium border-none cursor-pointer transition-colors
                      ${active
                        ? "bg-[#09665e] text-white font-semibold"
                        : "bg-[#e5e7eb] text-[#6b7280] hover:bg-[#d1d5db]"}`}>
                    {active && <Check size={10} strokeWidth={3} />}
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <button onClick={onSaveApp} className={saveBtnCls}>
          Save Settings
        </button>
      </div>
      </div>{/* /grid: Profile + App Settings */}

      {/* ── Section 3: Reset System — hidden for Amber ───────────────────── */}
      {pantryId !== 'amber' && (
        <div className={card}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[#0a2a3a] text-[17px] font-semibold">Reset System</p>
            <AlertTriangle size={16} color="#dc2626" />
          </div>
          <p className="text-[#6b7280] text-[13px] mt-1 mb-4">
            Permanently delete data from the system. This cannot be undone.
          </p>
          <button onClick={onOpenReset}
            className="bg-[#fff0f0] text-[#dc2626] border border-[#dc2626] rounded-full
              h-[48px] text-[14px] font-semibold w-full cursor-pointer
              hover:bg-[#ffe0e0] transition-colors">
            Reset System Data
          </button>
        </div>
      )}
    </>
  );
}
