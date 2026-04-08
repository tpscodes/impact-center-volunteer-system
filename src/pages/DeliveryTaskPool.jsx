// DeliveryTaskPool.jsx — Driver's view of today's delivery routes
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, MapPin, Clock, Truck } from "lucide-react";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";

// ── Utilities ─────────────────────────────────────────────────────────────────

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getTodayDisplay() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function claimedArray(claimedBy) {
  if (!claimedBy) return [];
  return Array.isArray(claimedBy) ? claimedBy : Object.values(claimedBy);
}

const getStatusStyle = (status) => {
  if (status === "inProgress")  return "bg-[#fff3e0] text-[#ff9500]";
  if (status === "complete")    return "bg-[#f0fff4] text-[#34c759]";
  if (status === "incomplete")  return "bg-[#fff0f0] text-[#dc2626]";
  return "bg-[#e6e6e6] text-[#6b7280]";
};

const getStatusLabel = (status) => {
  if (status === "inProgress")  return "In Progress";
  if (status === "complete")    return "Complete";
  if (status === "incomplete")  return "Incomplete";
  return "Available";
};

// ── Route card ────────────────────────────────────────────────────────────────
function RouteCard({ route, volunteerId, volunteerName, volunteers, onTap }) {
  const claimed   = claimedArray(route.claimedBy);
  const needed    = Number(route.driversNeeded) || 1;
  const isClaimed = claimed.some(v => v === volunteerId || v === volunteerName);
  const isFull    = claimed.length >= needed && !isClaimed;
  const isComplete = route.status === "complete";

  // Resolve a claimedBy value to a display name
  function resolveName(val) {
    if (val === volunteerId || val === volunteerName) return "You";
    const found = volunteers.find(v => v.id === val || v.name === val);
    return found ? found.name : (val || "Driver");
  }

  // Build slot array
  const slots = Array.from({ length: needed }, (_, i) => {
    const val = claimed[i];
    if (!val) return { type: "open" };
    if (val === volunteerId || val === volunteerName) return { type: "me" };
    return { type: "other", name: resolveName(val) };
  });

  const cardBase = "rounded-xl p-4 mx-4 mb-3 border transition-colors";
  let cardClass = cardBase;
  if (isComplete)      cardClass += " bg-white border-[#e5e7eb] opacity-60 cursor-default";
  else if (isClaimed)  cardClass += " bg-[#f0fafa] border-[#0d9488] cursor-pointer";
  else if (isFull)     cardClass += " bg-white border-[#e5e7eb] opacity-70 cursor-default";
  else                 cardClass += " bg-white border-[#e5e7eb] cursor-pointer";

  function handleTap() {
    if (isComplete || (isFull && !isClaimed)) return;
    onTap(route);
  }

  return (
    <div className={cardClass} onClick={handleTap}>
      {/* Row 1 — name + status */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-[#0a2a3a] text-[14px] font-semibold truncate mr-3">{route.name}</p>
        <span className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 font-medium ${getStatusStyle(route.status)}`}>
          {getStatusLabel(route.status)}
        </span>
      </div>

      {/* Row 2 — source → destination */}
      <div className="flex items-center gap-1 mb-1.5 flex-wrap">
        <MapPin size={13} className="text-[#6b7280] shrink-0" />
        <span className="text-[#6b7280] text-[12px]">{route.source || "—"}</span>
        <span className="text-[#6b7280] text-[12px] mx-0.5">→</span>
        <span className="text-[#6b7280] text-[12px]">{route.destination || "—"}</span>
      </div>

      {/* Row 3 — time + vehicle */}
      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mb-3">
        {route.departureTime && (
          <div className="flex items-center gap-1">
            <Clock size={13} className="text-[#6b7280] shrink-0" />
            <span className="text-[#6b7280] text-[12px]">{formatTime(route.departureTime)}</span>
          </div>
        )}
        {route.vehicle && (
          <div className="flex items-center gap-1">
            <Truck size={13} className="text-[#6b7280] shrink-0" />
            <span className="text-[#6b7280] text-[12px]">{route.vehicle}</span>
          </div>
        )}
      </div>

      {/* Row 4 — driver slots */}
      <div className="flex flex-wrap gap-1.5">
        {slots.map((slot, i) => (
          <span key={i} className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${
            slot.type === "me"
              ? "bg-[#0d9488] text-white"
              : slot.type === "other"
              ? "bg-[#ccedeb] text-[#09665e]"
              : "bg-[#f0f0f0] text-[#6b7280]"
          }`}>
            {slot.type === "me" ? "You" : slot.type === "other" ? slot.name : "Open"}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DeliveryTaskPool() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const volunteer = location.state?.volunteer;

  const [routes,     setRoutes]     = useState([]);
  const [volunteers, setVolunteers] = useState([]);

  // Guard: no volunteer context → back to id entry
  useEffect(() => {
    if (!volunteer) navigate("/experienced", { replace: true });
  }, [volunteer, navigate]);

  // Firebase: today's delivery routes
  useEffect(() => {
    const unsub = onValue(ref(db, "deliveryRoutes"), (snap) => {
      const data = snap.val();
      if (!data) { setRoutes([]); return; }
      const today = getTodayStr();
      const arr = Object.entries(data)
        .map(([key, val]) => ({ key, ...val }))
        .filter(r => r.date === today)
        .sort((a, b) => (a.departureTime || "").localeCompare(b.departureTime || ""));
      setRoutes(arr);
    });
    return () => unsub();
  }, []);

  // Firebase: volunteers (for resolving driver names)
  useEffect(() => {
    const unsub = onValue(ref(db, "volunteers"), (snap) => {
      const data = snap.val();
      setVolunteers(data ? Object.values(data) : []);
    });
    return () => unsub();
  }, []);

  if (!volunteer) return null;

  const volunteerId   = volunteer.id;
  const volunteerName = volunteer.name;

  // Stats
  const available = routes.filter(r => {
    const claimed = claimedArray(r.claimedBy);
    return claimed.length < (Number(r.driversNeeded) || 1) && r.status !== "complete";
  }).length;

  const myClaimed = routes.filter(r =>
    claimedArray(r.claimedBy).some(v => v === volunteerId || v === volunteerName)
  ).length;

  function handleRouteTap(route) {
    navigate("/delivery-route-detail", {
      state: { route, volunteer },
    });
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] max-w-[390px] mx-auto flex flex-col"
      style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* Top bar */}
      <div className="bg-[#0a2a3a] px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => navigate("/volunteer-mode-select", { state: { volunteer } })}
          className="text-white bg-transparent border-none cursor-pointer p-1 -ml-1">
          <ChevronLeft size={22} />
        </button>
        <p className="text-white text-[16px] font-semibold">Delivery Routes</p>
        <p className="text-[#0d9488] text-[11px]">{getTodayDisplay()}</p>
      </div>

      {/* Stats pills */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
        {[
          `${routes.length} Routes Today`,
          `${available} Available`,
          `${myClaimed} Claimed`,
        ].map(label => (
          <span key={label}
            className="bg-white border border-[#e5e7eb] rounded-full px-3 py-1 text-[12px] text-[#6b7280] shrink-0">
            {label}
          </span>
        ))}
      </div>

      {/* Route list */}
      <div className="flex-1 pt-2 pb-8">
        {routes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <Truck size={40} style={{ color: "#ccedeb" }} />
            <p className="text-[#0a2a3a] text-[15px] font-semibold mt-3">No routes today</p>
            <p className="text-[#6b7280] text-[13px] mt-1">Check back later for delivery routes</p>
          </div>
        ) : (
          routes.map(route => (
            <RouteCard
              key={route.key}
              route={route}
              volunteerId={volunteerId}
              volunteerName={volunteerName}
              volunteers={volunteers}
              onTap={handleRouteTap}
            />
          ))
        )}
      </div>
    </div>
  );
}
