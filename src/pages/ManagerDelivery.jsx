// ManagerDelivery.jsx — Delivery route management screen
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, Menu, X, Truck, Clock, ChevronRight } from "lucide-react";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";

const PRIORITY_STYLE = {
  Urgent: "bg-[#fff0f0] text-[#dc2626]",
  High:   "bg-[#fff3e0] text-[#ff9500]",
  Normal: "bg-[#f0f0f0] text-[#6b7280]",
};

export default function ManagerDelivery() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState(location.pathname.includes("delivery") ? "delivery" : "pantry");
  const [routes, setRoutes] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });

  // Live listener on deliveryRoutes/
  useEffect(() => {
    const unsub = onValue(ref(db, "deliveryRoutes"), (snap) => {
      const data = snap.val();
      if (data) {
        const arr = Object.entries(data).map(([key, val]) => ({ ...val, _key: key }));
        setRoutes(arr.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)));
      } else {
        setRoutes([]);
      }
    });
    return () => unsub();
  }, []);

  const activeRoutes   = routes.filter(r => r.status === "available" || r.status === "claimed");
  const claimedRoutes  = routes.filter(r => r.status === "claimed");
  const todayRoutes    = routes.filter(r => r.date === new Date().toISOString().slice(0, 10));

  // ── Shared Sidebar Toggle ──────────────────────────────────────────────────
  const ModeToggle = () => (
    <div className="flex mx-4 mb-4 bg-[#0d2233] rounded-lg p-0.5">
      <button onClick={() => { setMode("pantry"); navigate("/manager-tasks"); }}
        className={`flex-1 py-1.5 rounded-md text-[12px] font-medium transition-colors ${mode === "pantry" ? "bg-[#09665e] text-white" : "text-[#6b7280] hover:text-[#b3b3b3]"}`}>
        Pantry
      </button>
      <button onClick={() => setMode("delivery")}
        className={`flex-1 py-1.5 rounded-md text-[12px] font-medium transition-colors ${mode === "delivery" ? "bg-[#09665e] text-white" : "text-[#6b7280] hover:text-[#b3b3b3]"}`}>
        Delivery
      </button>
    </div>
  );

  // ── Shared Nav Items ───────────────────────────────────────────────────────
  const NAV_ITEMS = [
    { label: "Dashboard", path: "/manager/dashboard" },
    { label: "Tasks",     path: "/manager-tasks"      },
    { label: "Volunteers",path: "/manager-volunteers"  },
    { label: "History",   path: "/manager/history"     },
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f5]"
      style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* ══════════════════════════════════════════════════════════════════════
          MOBILE LAYOUT
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden flex flex-col min-h-screen pb-24">

        {/* Mobile header */}
        <div className="bg-[#0a2a3a] px-4 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <p className="text-[#0d9488] text-[10px] uppercase tracking-widest">Operations Manager</p>
            <p className="text-white text-[18px] font-semibold leading-tight">Delivery</p>
          </div>
          <button onClick={() => setMobileMenuOpen(o => !o)}
            className="text-white bg-transparent border-none cursor-pointer p-1">
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile hamburger overlay */}
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
              {/* Mode toggle */}
              <div className="flex mx-4 my-3 bg-[#0d2233] rounded-lg p-0.5">
                <button onClick={() => { setMode("pantry"); setMobileMenuOpen(false); navigate("/manager-tasks"); }}
                  className={`flex-1 py-1.5 rounded-md text-[12px] font-medium transition-colors ${mode === "pantry" ? "bg-[#09665e] text-white" : "text-[#6b7280] hover:text-[#b3b3b3]"}`}>
                  Pantry
                </button>
                <button onClick={() => { setMode("delivery"); setMobileMenuOpen(false); }}
                  className={`flex-1 py-1.5 rounded-md text-[12px] font-medium transition-colors ${mode === "delivery" ? "bg-[#09665e] text-white" : "text-[#6b7280] hover:text-[#b3b3b3]"}`}>
                  Delivery
                </button>
              </div>
              <nav className="flex flex-col py-2">
                {NAV_ITEMS.map(item => (
                  <button key={item.label}
                    onClick={() => { setMobileMenuOpen(false); navigate(item.path); }}
                    className="w-full text-left px-5 py-3.5 text-[15px] font-semibold bg-transparent border-none text-[#9ca3af] border-l-[3px] border-transparent">
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

        {/* Stats */}
        <div className="px-4 pt-4 grid grid-cols-2 gap-3">
          <div className="bg-white border border-[#e5e7eb] rounded-xl px-4 py-3">
            <p className="text-[#6b7280] text-[11px] mb-1">Today's Routes</p>
            <p className="text-[28px] font-semibold leading-none text-[#0d9488]">{todayRoutes.length}</p>
          </div>
          <div className="bg-white border border-[#e5e7eb] rounded-xl px-4 py-3">
            <p className="text-[#6b7280] text-[11px] mb-1">Active Routes</p>
            <p className="text-[28px] font-semibold leading-none text-[#ff9500]">{activeRoutes.length}</p>
          </div>
        </div>

        {/* Route cards */}
        <div className="px-4 pt-4 flex flex-col gap-3">
          {routes.length === 0 ? (
            <div className="bg-white border border-[#e5e7eb] rounded-xl px-5 py-12 text-center">
              <Truck size={40} className="text-[#0d9488] mx-auto mb-3" />
              <p className="text-[#0a2a3a] text-[15px] font-semibold mb-1">No delivery routes yet</p>
              <p className="text-[#6b7280] text-[13px]">Create your first route to get started.</p>
            </div>
          ) : (
            routes.map(route => (
              <div key={route._key} className="bg-white border border-[#e5e7eb] rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-[#0a2a3a] text-[14px] font-semibold flex-1 pr-2">{route.name}</p>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-lg shrink-0 ${PRIORITY_STYLE[route.priority] || PRIORITY_STYLE.Normal}`}>
                    {route.priority || "Normal"}
                  </span>
                </div>
                <p className="text-[#6b7280] text-[12px] mb-1">{route.source} → {route.destination}</p>
                {route.departureTime && (
                  <div className="flex items-center gap-1 text-[#6b7280] text-[11px]">
                    <Clock size={11} />
                    <span>Departs {route.departureTime}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Fixed bottom Add button */}
        <div className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-white border-t border-[#e5e7eb] z-20">
          <button onClick={() => navigate("/create-delivery-route")}
            className="w-full flex items-center justify-center gap-2 bg-[#09665e] text-white py-3 rounded-xl text-[15px] font-semibold border-none cursor-pointer active:opacity-80">
            <Plus size={16} />
            Add Route
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          DESKTOP LAYOUT
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex min-h-screen">

        {/* Sidebar */}
        <div className="w-[220px] min-h-screen bg-[#0a2a3a] flex flex-col fixed left-0 top-0 z-20">
          <div className="px-5 pt-7 pb-4">
            <p className="text-white text-[14px] font-medium tracking-wide">IMPACT CENTER</p>
            <p className="text-[#0d9488] text-[10px] mt-0.5">Volunteer Task Management</p>
            <div className="w-8 h-0.5 bg-[#0d9488] mt-3" />
          </div>
          <ModeToggle />
          <nav className="flex flex-col mt-2">
            {NAV_ITEMS.map(item => (
              <button key={item.label} onClick={() => navigate(item.path)}
                className="w-full text-left px-5 py-3 text-[14px] font-semibold bg-transparent border-none transition-colors text-[#767676] border-l-[3px] border-transparent hover:text-[#b3b3b3] cursor-pointer">
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

        {/* Main content */}
        <div className="ml-[220px] flex-1 flex flex-col min-h-screen">

          {/* Top bar */}
          <div className="bg-white border-b border-[#e5e7eb] h-16 flex items-center justify-between px-6 sticky top-0 z-10">
            <div>
              <p className="text-[#0d9488] text-[10px] uppercase tracking-widest">Operations Manager</p>
              <h1 className="text-[22px] font-semibold text-[#0a2a3a] tracking-tight leading-tight">Delivery Routes</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[#6b7280] text-[13px]">{todayStr}</span>
              <button onClick={() => navigate("/create-delivery-route")}
                className="flex items-center gap-2 bg-[#09665e] text-white px-4 py-2 rounded-lg text-[13px] font-medium hover:opacity-90 border-none cursor-pointer">
                <Plus size={14} />
                Add Route
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 flex flex-col gap-5">

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Today's Routes",   value: todayRoutes.length,   color: "#0d9488" },
                { label: "Active Routes",     value: activeRoutes.length,  color: "#ff9500" },
                { label: "Claimed Routes",    value: claimedRoutes.length, color: "#34c759" },
              ].map(stat => (
                <div key={stat.label} className="bg-white border border-[#e5e7eb] rounded-xl px-4 py-3 h-[80px] flex flex-col justify-center">
                  <p className="text-[#6b7280] text-[12px] mb-1">{stat.label}</p>
                  <p className="text-[28px] font-semibold leading-none" style={{ color: stat.color }}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Routes card */}
            <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#e5e7eb]">
                <p className="text-[#0a2a3a] text-[16px] font-semibold">Delivery Routes</p>
              </div>

              {routes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Truck size={48} className="text-[#0d9488] mb-4" />
                  <p className="text-[#0a2a3a] text-[16px] font-semibold mb-2">No delivery routes yet</p>
                  <p className="text-[#6b7280] text-[13px]">Create your first route to get started.</p>
                </div>
              ) : (
                <>
                  {/* Column headers */}
                  <div className="px-5 py-2 bg-[#f9fafb] border-b border-[#e5e7eb]">
                    <div className="grid items-center" style={{ gridTemplateColumns: "2fr 1.2fr 1.4fr 90px 90px 90px" }}>
                      {["ROUTE NAME", "VEHICLE", "PICKUP → DROP-OFF", "DEPARTURE", "DATE", "PRIORITY"].map(h => (
                        <p key={h} className="text-[#6b7280] text-[11px] uppercase tracking-widest">{h}</p>
                      ))}
                    </div>
                  </div>

                  {routes.map((route) => (
                    <div key={route._key}
                      className="px-5 border-b border-[#e5e7eb] last:border-b-0 flex items-center"
                      style={{ minHeight: 56 }}>
                      <div className="grid items-center w-full" style={{ gridTemplateColumns: "2fr 1.2fr 1.4fr 90px 90px 90px" }}>
                        <p className="text-[#0a2a3a] text-[14px] font-semibold truncate pr-3">{route.name}</p>
                        <p className="text-[#6b7280] text-[12px] truncate pr-3">{route.vehicle || "—"}</p>
                        <p className="text-[#6b7280] text-[12px] truncate pr-3">
                          {route.source && route.destination ? `${route.source} → ${route.destination}` : route.source || route.destination || "—"}
                        </p>
                        <p className="text-[#6b7280] text-[12px]">{route.departureTime || "—"}</p>
                        <p className="text-[#6b7280] text-[12px]">{route.date || "—"}</p>
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-lg ${PRIORITY_STYLE[route.priority] || PRIORITY_STYLE.Normal}`}>
                          {route.priority || "Normal"}
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
