// Sidebar.jsx — Reusable desktop manager sidebar
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, ClipboardList, Users, Clock, Truck, UserCheck } from "lucide-react";

const PANTRY_NAV = [
  { label: "Dashboard", path: "/manager/dashboard", icon: LayoutDashboard, disabled: false },
  { label: "Tasks",     path: "/manager-tasks",      icon: ClipboardList,   disabled: false },
  { label: "Volunteers",path: "/manager-volunteers",  icon: Users,           disabled: false },
  { label: "History",   path: "/manager/history",     icon: Clock,           disabled: false },
];

const DELIVERY_NAV = [
  { label: "Dashboard", path: "/manager-delivery",          icon: LayoutDashboard, disabled: false },
  { label: "Routes",    path: "/manager-delivery-routes",   icon: Truck,           disabled: false },
  { label: "Drivers",   path: "/manager-delivery-drivers",  icon: UserCheck,       disabled: true  },
  { label: "History",   path: "/manager-delivery-history",  icon: Clock,           disabled: true  },
];

export default function Sidebar({ mode, activePath }) {
  const navigate = useNavigate();
  const navItems = mode === "delivery" ? DELIVERY_NAV : PANTRY_NAV;

  return (
    <div className="w-[220px] min-h-screen bg-[#0a2a3a] flex flex-col fixed left-0 top-0 z-20">

      {/* Logo */}
      <div className="px-5 pt-7 pb-4">
        <p className="text-white text-[14px] font-medium tracking-wide">IMPACT CENTER</p>
        <p className="text-[#0d9488] text-[10px] mt-0.5">Volunteer Task Management</p>
        <div className="w-8 h-0.5 bg-[#0d9488] mt-3" />
      </div>

      {/* Pantry / Delivery toggle */}
      <div className="flex mx-4 mb-4 bg-[#0d2233] rounded-lg p-0.5">
        <button
          onClick={() => navigate("/manager/dashboard")}
          className={`flex-1 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
            mode === "pantry" ? "bg-[#09665e] text-white" : "text-[#6b7280] hover:text-[#b3b3b3]"
          }`}>
          Pantry
        </button>
        <button
          onClick={() => navigate("/manager-delivery")}
          className={`flex-1 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
            mode === "delivery" ? "bg-[#09665e] text-white" : "text-[#6b7280] hover:text-[#b3b3b3]"
          }`}>
          Delivery
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map(item => {
          const isActive = activePath === item.path;
          return (
            <button
              key={item.path}
              onClick={() => !item.disabled && navigate(item.path)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-[13px] font-medium
                transition-colors flex items-center gap-2.5 border-none bg-transparent
                ${item.disabled
                  ? "opacity-40 cursor-not-allowed text-[#9ca3af]"
                  : isActive
                  ? "text-[#0d9488] border-l-2 border-[#0d9488] bg-[#ffffff08] pl-[10px] cursor-default"
                  : "text-[#9ca3af] hover:text-white hover:bg-[#ffffff08] cursor-pointer"
                }`}>
              <item.icon size={15} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Bottom: user + logout */}
      <div className="px-4 pb-5 pt-3 border-t border-[#ffffff12]">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-full bg-[#0d9488] flex items-center justify-center shrink-0">
            <span className="text-white text-[11px] font-semibold">JB</span>
          </div>
          <div>
            <p className="text-white text-[12px] font-medium">Jason Bratina</p>
            <p className="text-[#6b7280] text-[10px]">Operations Manager</p>
          </div>
        </div>
        <button
          onClick={() => navigate("/")}
          className="text-[#ef4444] text-[12px] hover:text-[#dc2626] transition-colors bg-transparent border-none cursor-pointer">
          Logout
        </button>
      </div>
    </div>
  );
}
