import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import SidebarSteve from "./SidebarSteve";
import "./SidebarLiquid.css";

const ITEM_STEP = 60; // px — must match --item-step in CSS

// ── Icons ────────────────────────────────────────────────────────────────────
// Two viewBox families matching the reference design:
//   svg24: standard 24-unit viewBox, stroke-width 1.8
//   svg16: Fluent 16-unit viewBox, stroke-width 1 (Overview, Volunteers)

function IconOverview() {
  return (
    <svg width="24" height="24" viewBox="0 0 16 16" fill="none" stroke="currentColor"
         strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <g transform="translate(2.667,2.438)">
        <path d="M0 5.196v3.566c0 .747 0 1.12.145 1.406.128.251.332.455.583.583.285.145.658.145 1.403.145h6.404c.746 0 1.118 0 1.403-.145.251-.128.456-.332.584-.583.145-.285.145-.658.145-1.404V5.196c0-.356 0-.534-.043-.7a1.74 1.74 0 0 0-.187-.611c-.096-.141-.23-.259-.498-.494L6.738.791C6.241.355 5.992.138 5.712.055a1.74 1.74 0 0 0-.757 0C4.675.138 4.427.355 3.93.79L.729 3.591c-.269.235-.402.352-.5.494a1.74 1.74 0 0 0-.186.61C0 4.862 0 5.04 0 5.196z"/>
      </g>
    </svg>
  );
}

function IconTasks() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4"/>
      <path d="m8 12.2 2.8 2.8L16 9.4"/>
    </svg>
  );
}

function IconVolunteers() {
  return (
    <svg width="24" height="24" viewBox="0 0 16 16" fill="none" stroke="currentColor"
         strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <g transform="translate(2,3.333)">
        <path d="M4 4a2 2 0 1 0 4 0 2 2 0 0 0-4 0M9.333 10c0-1.105-1.492-2-3.333-2S2.667 8.895 2.667 10M12 8c0-.82-.823-1.525-2-1.833M0 8c0-.82.823-1.525 2-1.833M10 3.49A2 2 0 0 0 8.667 0a2 2 0 0 0-1.334.51M2 3.49A2 2 0 0 1 3.333 0a2 2 0 0 1 1.334.51"/>
      </g>
    </svg>
  );
}

function IconHistory() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5"/>
      <path d="M12 7.4V12l3.4 2"/>
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7.4h16M4 16.6h16"/>
      <circle cx="16" cy="7.4" r="2.8" fill="currentColor" stroke="none"/>
      <circle cx="8" cy="16.6" r="2.8" fill="currentColor" stroke="none"/>
    </svg>
  );
}

function IconDashboard() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2"/>
      <rect x="13" y="3.5" width="7.5" height="7.5" rx="2"/>
      <rect x="3.5" y="13" width="7.5" height="7.5" rx="2"/>
      <rect x="13" y="13" width="7.5" height="7.5" rx="2"/>
    </svg>
  );
}

function IconRoutes() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5c3-1 4-3.5 4-6s-1-4.5 1.5-5.5S14 9 14 12.5s2 5 4.5 4"/>
      <circle cx="18.5" cy="16.5" r="1.6" fill="currentColor" stroke="none"/>
      <circle cx="4" cy="19.5" r="1.6" fill="currentColor" stroke="none"/>
    </svg>
  );
}

function IconDrivers() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7.4" r="3.4"/>
      <path d="M5.5 20.4v-1.6a4.9 4.9 0 0 1 4.9-4.9h3.2a4.9 4.9 0 0 1 4.9 4.9v1.6"/>
    </svg>
  );
}

// ── Nav sets ─────────────────────────────────────────────────────────────────
const PANTRY_NAV = [
  { label: "Overview",   path: "/manager/dashboard",     Icon: IconOverview },
  { label: "Tasks",      path: "/manager-tasks",          Icon: IconTasks },
  { label: "Volunteers", path: "/manager-volunteers",     Icon: IconVolunteers },
  { label: "History",    path: "/manager-history",        Icon: IconHistory },
  { label: "Settings",   path: "/manager-settings",       Icon: IconSettings },
];

const DELIVERY_NAV = [
  { label: "Dashboard",  path: "/manager-delivery",              Icon: IconDashboard },
  { label: "Routes",     path: "/manager-delivery-routes",       Icon: IconRoutes },
  { label: "Drivers",    path: "/manager-delivery-volunteers",   Icon: IconDrivers },
  { label: "History",    path: "/manager-delivery-history",      Icon: IconHistory },
  { label: "Settings",   path: "/manager-settings",              Icon: IconSettings },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function SidebarLiquid({ mode: modeProp }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { activePantryId, role, displayName, initials, logout } = useAuth();

  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 1280);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState(null);
  const leadRef = useRef(null);
  const trailRef = useRef(null);
  const profileRef = useRef(null);

  // Auto-collapse below xl (1280 px), auto-expand at xl+
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1280px)");
    const handle = (e) => setCollapsed(!e.matches);
    handle(mql);
    mql.addEventListener("change", handle);
    return () => mql.removeEventListener("change", handle);
  }, []);

  // Derive mode: prop wins, then pathname heuristic
  const isDelivery =
    modeProp === "delivery" ||
    (!modeProp && (pathname.startsWith("/manager-delivery") || pathname === "/create-delivery-route"));
  const mode = isDelivery ? "delivery" : "pantry";
  const nav = mode === "delivery" ? DELIVERY_NAV : PANTRY_NAV;

  // Map child routes back to their parent nav path so the correct icon stays active
  const CHILD_MAP = {
    "/manager/create-task": "/manager-tasks",
  };
  const resolvedPath = CHILD_MAP[pathname] ?? pathname;
  const activeIndex = Math.max(0, nav.findIndex((item) => resolvedPath === item.path));

  // Keep CSS variable in sync so pages can use ml-[var(--sidebar-w)]
  useEffect(() => {
    // 16px left margin + sidebar width + 16px gap before content
    document.documentElement.style.setProperty("--sidebar-w", collapsed ? "108px" : "296px");
    return () => document.documentElement.style.removeProperty("--sidebar-w");
  }, [collapsed]);

  // Move blobs whenever active item changes
  useEffect(() => {
    const y = `${activeIndex * ITEM_STEP}px`;
    leadRef.current?.style.setProperty("--y", y);
    trailRef.current?.style.setProperty("--y", y);
  }, [activeIndex, mode]);

  // Close popover on outside click
  useEffect(() => {
    if (!popoverOpen) return;
    const close = () => setPopoverOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [popoverOpen]);

  // Close popover on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && popoverOpen) setPopoverOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [popoverOpen]);

  // Superadmin uses their own sidebar (after all hooks)
  if (role === "superadmin") return <SidebarSteve />;

  const showModes = activePantryId !== "amber";

  return (
    <>
      {/* SVG goo filter — hidden, must be in DOM */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
        <defs>
          <filter id="sl-goo-filter">
            <feGaussianBlur in="SourceGraphic" stdDeviation="11" result="blur"/>
            <feColorMatrix in="blur" mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo"/>
            <feComposite in="SourceGraphic" in2="goo" operator="atop"/>
          </filter>
        </defs>
      </svg>

      <div
        className={`sl-shell${collapsed ? " sl-collapsed" : ""}`}
        style={{ width: collapsed ? "88px" : "264px" }}
      >

        {/* Layer 1 — liquid blobs (aria-hidden, pointer-events:none in CSS) */}
        <div className="sl-goo" aria-hidden="true">
          <div className="sl-blob sl-blob-trail" ref={trailRef}/>
          <div className="sl-blob sl-blob-lead"  ref={leadRef}/>
        </div>

        {/* Layer 2 — legible UI */}
        <div className="sl-ui">

          {/* Header */}
          <div className="sl-rail-head">
            <div className="sl-brand">
              <button
                className="sl-toggle"
                type="button"
                aria-expanded={!collapsed}
                aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
                onClick={() => { setCollapsed((c) => !c); setPopoverOpen(false); }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2"
                     strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 5.5 8 12l6.5 6.5"/>
                </svg>
              </button>
              <span className="sl-brand-text">
                <span className="sl-brand-name">IMPACT CENTER</span>
                <span className="sl-brand-sub">Volunteer Task Management</span>
              </span>
            </div>

            <div className="sl-rule" aria-hidden="true"/>

            {showModes && (
              <div className="sl-modes" role="group" aria-label="Programme">
                <button
                  className="sl-mode"
                  type="button"
                  aria-pressed={mode === "pantry"}
                  onClick={() => navigate(collapsed && mode === "pantry" ? "/manager-delivery" : "/manager/dashboard")}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="2"
                       strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3 20.5 7.5v9L12 21 3.5 16.5v-9z"/>
                    <path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>
                  </svg>
                  <span>Pantry</span>
                </button>
                <button
                  className="sl-mode"
                  type="button"
                  aria-pressed={mode === "delivery"}
                  onClick={() => navigate(collapsed && mode === "delivery" ? "/manager/dashboard" : "/manager-delivery")}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="2"
                       strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2.5 6.5h10v9h-10z"/>
                    <path d="M12.5 10h4l3.5 3.5v2h-7.5z"/>
                    <circle cx="6.5" cy="18" r="1.8"/>
                    <circle cx="16.5" cy="18" r="1.8"/>
                  </svg>
                  <span>Delivery</span>
                </button>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="sl-nav" aria-label="Main">
            {nav.map(({ label, path, Icon }, i) => {
              const active = i === activeIndex;
              return (
                <button
                  key={path}
                  className={`sl-item${active ? " sl-item-active" : ""}`}
                  type="button"
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  onClick={() => navigate(path)}
                >
                  <Icon/>
                  <span className="sl-item-label">{label}</span>
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="sl-rail-foot">
            <button
              ref={profileRef}
              className="sl-profile"
              type="button"
              aria-haspopup="dialog"
              aria-expanded={popoverOpen}
              aria-label={`${displayName}, Operations Manager. Open account menu`}
              onClick={(e) => {
              e.stopPropagation();
              if (!popoverOpen) {
                const rect = profileRef.current?.getBoundingClientRect();
                if (rect) setPopoverPos({ left: rect.left, bottom: window.innerHeight - rect.top + 8 });
              }
              setPopoverOpen((v) => !v);
            }}
            >
              <span className="sl-avatar" aria-hidden="true">{initials}</span>
              <span className="sl-profile-text">
                <span className="sl-profile-name">{displayName}</span>
                <span className="sl-profile-role">Operations Manager</span>
              </span>
            </button>
          </div>

        </div>
      </div>

      {/* Account popover — portalled to document.body so it escapes sl-ui overflow:hidden
          and the sidebar's stacking context entirely, even when collapsed */}
      {popoverOpen && popoverPos && createPortal(
        <div
          className="sl-popover sl-popover-open"
          role="dialog"
          aria-label="Account"
          style={{ position: "fixed", left: popoverPos.left, bottom: popoverPos.bottom, zIndex: 200, background: "#ffffff", border: "1px solid #E5E7EB", borderRadius: 20, boxShadow: "0 12px 32px rgba(10,42,58,.28)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sl-popover-name">{displayName}</div>
          <div className="sl-popover-role">Operations Manager</div>
          <div className="sl-popover-div"/>
          <button
            className="sl-popover-link"
            type="button"
            onClick={() => { navigate("/manager-settings"); setPopoverOpen(false); }}
          >
            Account settings
          </button>
          <button
            className="sl-popover-link"
            type="button"
            onClick={logout}
          >
            Sign out
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
