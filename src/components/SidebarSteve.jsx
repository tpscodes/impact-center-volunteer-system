// SidebarSteve.jsx — Super-admin sidebar for Steve
// Modes: Overview / Food Pantry / Clothing / Volunteers
import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, ShoppingBasket, Shirt, Users, Settings } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const MANAGER_PATHS = [
  "/manager/dashboard", "/manager-tasks", "/manager-history",
  "/manager-volunteers", "/manager-settings", "/manager/create-task",
];

export default function SidebarSteve() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { activePantryId, displayName, initials, logout, switchPantry } = useAuth();

  const isOverview      = location.pathname === "/steve-overview";
  const isVolunteers    = location.pathname === "/manager-volunteers";
  const isManagerPage   = MANAGER_PATHS.some(p => location.pathname.startsWith(p));
  const isFoodPantry    = isManagerPage && !isVolunteers && activePantryId === "jason";
  const isClothing      = isManagerPage && !isVolunteers && activePantryId === "amber";

  function goToFoodPantry() {
    switchPantry("jason");
    navigate("/manager-tasks");
  }

  function goToClothing() {
    switchPantry("amber");
    navigate("/manager-tasks");
  }

  const navItems = [
    {
      label: "Overview",
      icon: LayoutDashboard,
      active: isOverview,
      onClick: () => navigate("/steve-overview"),
    },
    {
      label: "Food Pantry",
      icon: ShoppingBasket,
      active: isFoodPantry,
      onClick: goToFoodPantry,
    },
    {
      label: "Clothing",
      icon: Shirt,
      active: isClothing,
      onClick: goToClothing,
    },
    {
      label: "Volunteers",
      icon: Users,
      active: isVolunteers,
      onClick: () => navigate("/manager-volunteers"),
    },
  ];

  return (
    <div className="w-[220px] min-h-screen bg-[#0a2a3a] flex flex-col fixed left-0 top-0 z-20">

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
  );
}
