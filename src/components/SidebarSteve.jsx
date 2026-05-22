// SidebarSteve.jsx — Super-admin sidebar for Steve
// Desktop: fixed sidebar. Mobile: overlay driven by mobileMenuOpen prop (or internal state).
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, ShoppingBasket, Shirt, Users, Settings, Menu, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const MANAGER_PATHS = [
  "/manager/dashboard", "/manager-tasks", "/manager-history",
  "/manager-volunteers", "/manager-settings", "/manager/create-task",
];

export default function SidebarSteve({ mobileMenuOpen: externalOpen = null, setMobileMenuOpen: externalSetOpen = null }) {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { activePantryId, displayName, initials, logout, switchPantry } = useAuth();

  const [internalOpen, setInternalOpen] = useState(false);
  const mobileMenuOpen    = externalOpen    ?? internalOpen;
  const setMobileMenuOpen = externalSetOpen ?? setInternalOpen;

  const isOverview    = location.pathname === "/steve-overview";
  const isVolunteers  = location.pathname === "/manager-volunteers";
  const isManagerPage = MANAGER_PATHS.some(p => location.pathname.startsWith(p));
  const isFoodPantry  = isManagerPage && !isVolunteers && activePantryId === "jason";
  const isClothing    = isManagerPage && !isVolunteers && activePantryId === "amber";

  function goToFoodPantry() { switchPantry("jason"); navigate("/manager-tasks"); }
  function goToClothing()   { switchPantry("amber"); navigate("/manager-tasks"); }

  const navItems = [
    { label: "Overview",    icon: LayoutDashboard, active: isOverview,   onClick: () => navigate("/steve-overview") },
    { label: "Food Pantry", icon: ShoppingBasket,  active: isFoodPantry, onClick: goToFoodPantry },
    { label: "Clothing",    icon: Shirt,           active: isClothing,   onClick: goToClothing },
    { label: "Volunteers",  icon: Users,           active: isVolunteers, onClick: () => navigate("/manager-volunteers") },
  ];

  const mobileNavItems = [
    { label: "Overview",    active: isOverview,   action: () => navigate("/steve-overview") },
    { label: "Food Pantry", active: isFoodPantry, action: goToFoodPantry },
    { label: "Clothing",    active: isClothing,   action: goToClothing },
    { label: "Volunteers",  active: isVolunteers, action: () => navigate("/manager-volunteers") },
  ];

  return (
    <>
      {/* ── Desktop sidebar (lg+) ─────────────────────────────────────────── */}
      <div className="hidden lg:flex w-[220px] min-h-screen bg-[#0a2a3a] flex-col fixed left-0 top-0 z-20">

        {/* Logo */}
        <div className="px-5 pt-7 pb-4">
          <p className="text-white text-[14px] font-medium tracking-wide">IMPACT CENTER</p>
          <p className="text-[#0d9488] text-[10px] mt-0.5">Super Admin</p>
          <div className="w-8 h-0.5 bg-[#0d9488] mt-3" />
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map(item => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-[13px] font-medium
                transition-colors flex items-center gap-2.5 border-none bg-transparent cursor-pointer
                ${item.active
                  ? "text-[#0d9488] border-l-2 border-[#0d9488] bg-[#ffffff08] pl-[10px]"
                  : "text-[#9ca3af] hover:text-white hover:bg-[#ffffff08]"
                }`}
            >
              <item.icon size={15} />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Bottom: user + settings + logout */}
        <div className="px-4 pb-5 pt-3 border-t border-[#ffffff12]">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-full bg-[#0d9488] flex items-center justify-center shrink-0">
              <span className="text-white text-[11px] font-semibold">{initials || "ST"}</span>
            </div>
            <div className="flex-1">
              <p className="text-white text-[12px] font-medium">{displayName || "Steve"}</p>
              <p className="text-[#6b7280] text-[10px]">Super Admin</p>
            </div>
            <button
              onClick={() => navigate("/manager-settings")}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-[#6b7280]
                hover:text-white hover:bg-[#ffffff12] transition-colors bg-transparent border-none cursor-pointer">
              <Settings size={14} />
            </button>
          </div>
          <button
            onClick={logout}
            className="text-[#ef4444] text-[12px] hover:text-[#dc2626] transition-colors bg-transparent border-none cursor-pointer">
            Logout
          </button>
        </div>
      </div>

      {/* ── Mobile overlay (< lg) ─────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <>
          {/* Dim background */}
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Slide-down panel */}
          <div
            className="fixed top-0 left-0 right-0 z-50 bg-[#0a2a3a]"
            style={{ animation: "slideDown 0.25s ease-out forwards" }}
          >
            {/* Top bar: user info + close */}
            <div className="px-8 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#0d9488] flex items-center justify-center shrink-0">
                  <span className="text-white text-sm font-semibold">{initials || "ST"}</span>
                </div>
                <div>
                  <p className="text-[#b3b3b3] text-[16px] font-semibold leading-tight">{displayName || "Steve"}</p>
                  <p className="text-[#757575] text-[14px] leading-tight">Super Admin</p>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setMobileMenuOpen(false); }}
                className="text-white p-1 bg-transparent border-none cursor-pointer"
              >
                <X size={24} />
              </button>
            </div>

            {/* Teal divider */}
            <div className="w-10 h-0.5 bg-[#0d9488] mx-8 mb-2" />

            {/* Nav items */}
            <nav className="flex flex-col py-2">
              {mobileNavItems.map(item => (
                <button
                  key={item.label}
                  onClick={() => { item.action(); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-8 py-4 text-[16px] font-semibold bg-transparent border-none cursor-pointer ${
                    item.active
                      ? "text-[#0d9488] border-l-[3px] border-[#0d9488]"
                      : "text-[#757575] border-l-[3px] border-transparent"
                  }`}
                >
                  {item.label}
                </button>
              ))}

              <div className="mx-8 my-3 h-px bg-[#1e3a4a]" />

              <button
                onClick={() => { setMobileMenuOpen(false); logout(); }}
                className="w-full text-left px-8 py-4 text-[16px] font-semibold text-[#dc2626] border-l-[3px] border-transparent bg-transparent border-none cursor-pointer"
              >
                Logout
              </button>
            </nav>
          </div>
        </>
      )}
    </>
  );
}
