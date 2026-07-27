// MobileNav.jsx — glassmorphism inline-accordion nav, mobile only (< lg)
// Renders inside the page's gradient hero div so the glass composites over
// the dark background. Returns null for superadmin (SidebarSteve handles that).

import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./MobileNav.css";

// ── Icons ─────────────────────────────────────────────────────────────────────
function IconOverview() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 10.5L12 4L20 10.5V19C20 19.552 19.552 20 19 20H15V14H9V20H5C4.448 20 4 19.552 4 19V10.5Z"
            stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
    </svg>
  );
}

function IconTasks() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="4" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M8.5 12.2L10.7 14.4L15.5 9.5" stroke="currentColor" strokeWidth="1.6"
            strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconVolunteers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.6"/>
      <circle cx="17" cy="10.5" r="2.3" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M4 19.5C4 16.5 6.2 14.5 9 14.5C11.8 14.5 14 16.5 14 19.5"
            stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M14.5 15.2C17 15.2 19 17 19 19.5"
            stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function IconHistory() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M12 7.4V12L15.4 13.9" stroke="currentColor" strokeWidth="1.6"
            strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="2.8" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M12 4V6.4M12 17.6V20M20 12H17.6M6.4 12H4M17 7L15.3 8.7M8.7 15.3L7 17M17 17L15.3 15.3M8.7 8.7L7 7"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconDashboard() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
      <rect x="13" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
      <rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
      <rect x="13" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
    </svg>
  );
}

function IconRoutes() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 19.5c3-1 4-3.5 4-6s-1-4.5 1.5-5.5S14 9 14 12.5s2 5 4.5 4"
            stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <circle cx="18.5" cy="16.5" r="1.6" fill="currentColor"/>
      <circle cx="4" cy="19.5" r="1.6" fill="currentColor"/>
    </svg>
  );
}

function IconDrivers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 12.5h1.5l1.2-4h9l2 4H21v4.5h-2a2 2 0 01-4 0H9a2 2 0 01-4 0H3v-4.5z"
            stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <circle cx="7" cy="17" r="1.4" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="17" cy="17" r="1.4" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  );
}

// Mode indicator icons (shown in the collapsed toggle bar)
function IconPantryMode() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 6L8 2L14 6V13.5C14 13.776 13.776 14 13.5 14H2.5C2.224 14 2 13.776 2 13.5V6Z"
            stroke="white" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  );
}

function IconDeliveryMode() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M1 4H10V11H1V4Z" stroke="white" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M10 6.5H12.5L15 9V11H10V6.5Z" stroke="white" strokeWidth="1.4" strokeLinejoin="round"/>
      <circle cx="4" cy="12.5" r="1.4" stroke="white" strokeWidth="1.2"/>
      <circle cx="12" cy="12.5" r="1.4" stroke="white" strokeWidth="1.2"/>
    </svg>
  );
}

// ── Nav data ──────────────────────────────────────────────────────────────────
const PANTRY_NAV = [
  { key: "overview",   label: "Overview",   path: "/manager/dashboard",           Icon: IconOverview   },
  { key: "tasks",      label: "Tasks",       path: "/manager-tasks",               Icon: IconTasks      },
  { key: "volunteers", label: "Volunteers",  path: "/manager-volunteers",          Icon: IconVolunteers },
  { key: "history",    label: "History",     path: "/manager-history",             Icon: IconHistory    },
  { key: "settings",   label: "Settings",    path: "/manager-settings",            Icon: IconSettings   },
];

const DELIVERY_NAV = [
  { key: "dashboard",  label: "Dashboard",  path: "/manager-delivery",            Icon: IconDashboard  },
  { key: "routes",     label: "Routes",     path: "/manager-delivery-routes",     Icon: IconRoutes     },
  { key: "drivers",    label: "Drivers",    path: "/manager-delivery-volunteers", Icon: IconDrivers    },
  { key: "history",    label: "History",    path: "/manager-delivery-history",    Icon: IconHistory    },
  { key: "settings",   label: "Settings",   path: "/manager-settings",            Icon: IconSettings   },
];

// Sub-routes that should keep a parent nav item active
const CHILD_MAP = {
  "/manager/create-task": "/manager-tasks",
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function MobileNav({ mode: modeProp }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { role, activePantryId, displayName, initials } = useAuth();

  const [open, setOpen]               = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const navListRef = useRef(null);

  // Derive mode from prop, then from pathname
  const isDelivery =
    modeProp === "delivery" ||
    (!modeProp && (pathname.startsWith("/manager-delivery") || pathname === "/create-delivery-route"));
  const mode = isDelivery ? "delivery" : "pantry";
  const nav  = mode === "delivery" ? DELIVERY_NAV : PANTRY_NAV;

  // Derive active item from pathname
  const resolved    = CHILD_MAP[pathname] ?? pathname;
  const activeIndex = Math.max(0, nav.findIndex(item => resolved === item.path));

  const showModes = activePantryId !== "amber";

  // Re-trigger staggered animation every time the panel opens
  useEffect(() => {
    if (!open || !navListRef.current) return;
    const el = navListRef.current;
    el.classList.remove("mn-animate-in");
    void el.offsetWidth; // force reflow so animation restarts
    el.classList.add("mn-animate-in");
  }, [open]);

  // Escape key closes the panel
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function toggle() { setOpen(o => !o); }
  function close()  { setOpen(false); }

  // Mode switch: crossfade the list, then navigate to the new mode's root
  function switchMode(target) {
    if (target === mode || transitioning) return;
    setTransitioning(true);
    const el = navListRef.current;
    if (el) el.classList.add("mn-menu-fade-out");
    setTimeout(() => {
      navigate(target === "delivery" ? "/manager-delivery" : "/manager/dashboard");
      setTransitioning(false);
      if (el) {
        el.classList.remove("mn-menu-fade-out");
        el.classList.add("mn-menu-fade-in");
        setTimeout(() => el?.classList.remove("mn-menu-fade-in"), 320);
      }
    }, 170);
  }

  // Superadmin uses SidebarSteve — mobile nav not needed
  if (role === "superadmin") return null;

  return (
    <div style={{ paddingTop: 12 }}>
    <div className="mn-shell">
      {/* ── Collapsed toggle bar ─────────────────────────────────────────── */}
      <button
        className="mn-toggle"
        type="button"
        aria-expanded={open}
        aria-controls="mn-collapsible"
        onClick={toggle}
      >
        <div className="mn-profile-left">
          <div className="mn-avatar" aria-hidden="true">{initials}</div>
          <div className="mn-profile-text">
            <p className="mn-name">{displayName}</p>
            <p className="mn-role">Operations Manager</p>
          </div>
        </div>
        <div className="mn-right">
          <div className="mn-mode-indicator" aria-hidden="true">
            {mode === "pantry" ? <IconPantryMode /> : <IconDeliveryMode />}
          </div>
        </div>
      </button>

      {/* ── Collapsible body ─────────────────────────────────────────────── */}
      <div className={`mn-collapsible${open ? " mn-open" : ""}`} id="mn-collapsible">
        <div className="mn-collapsible-inner">
          <div className="mn-list-wrap">
            <div className="mn-list" ref={navListRef}>
              {nav.map((item, i) => (
                <button
                  key={item.path}
                  className={`mn-item${i === activeIndex ? " mn-active" : ""}`}
                  type="button"
                  aria-current={i === activeIndex ? "page" : undefined}
                  onClick={() => { navigate(item.path); close(); }}
                >
                  <item.Icon />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {showModes && (
            <div
              className="mn-mode-toggle"
              data-mode={mode}
              role="tablist"
              aria-label="Module switcher"
            >
              <div className="mn-mode-slider" aria-hidden="true" />
              <button
                className={`mn-mode-btn${mode === "pantry" ? " mn-mode-active" : ""}`}
                type="button"
                role="tab"
                aria-selected={mode === "pantry"}
                onClick={() => switchMode("pantry")}
              >
                <IconPantryMode /> Pantry
              </button>
              <button
                className={`mn-mode-btn${mode === "delivery" ? " mn-mode-active" : ""}`}
                type="button"
                role="tab"
                aria-selected={mode === "delivery"}
                onClick={() => switchMode("delivery")}
              >
                <IconDeliveryMode /> Delivery
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
