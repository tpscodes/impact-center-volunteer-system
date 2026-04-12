// DeliveryRouteDetail.jsx — Driver route detail + claim/complete flow
// Fetches fresh data by IDs to prevent stale state issues
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, MapPin, Clock, Truck, Package } from "lucide-react";
import { db } from "../firebase";
import { ref, onValue, update, set } from "firebase/database";

// ── Utilities ─────────────────────────────────────────────────────────────────

function formatTime(t) {
  if (!t) return "—";
  if (/AM|PM/i.test(t)) return t;
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

// ── Merge helper ──────────────────────────────────────────────────────────────
const mergeRouteData = (occurrence, templatesMap) => {
  const template = templatesMap[occurrence.templateId] || {};
  return {
    ...occurrence,
    name:          template.name          || "",
    dayOfWeek:     template.dayOfWeek     || "",
    source:        occurrence.overrideSource        || template.source        || "",
    destination:   occurrence.overrideDestination   || template.destination   || "",
    departureTime: occurrence.overrideDepartureTime || template.departureTime || "",
    arrivalTime:   occurrence.overrideArrivalTime   || template.arrivalTime   || "",
    vehicle:       occurrence.overrideVehicle       || template.vehicle       || "",
    driversNeeded: occurrence.overrideDriversNeeded || template.driversNeeded || 1,
  };
};

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

// ── Info row helper ───────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, iconColor, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon size={15} style={{ color: iconColor || "#6b7280" }} className="mt-0.5 shrink-0" />
      <span className="text-[#6b7280] text-[12px] w-20 shrink-0">{label}</span>
      <span className="text-[#0a2a3a] text-[13px] font-medium flex-1">{value}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DeliveryRouteDetail() {
  const navigate = useNavigate();
  const location = useLocation();

  const { occurrenceId, templateId, volunteer } = location.state || {};

  // Guard: missing context → back to task pool
  useEffect(() => {
    if (!occurrenceId || !volunteer) {
      navigate("/delivery-task-pool", { replace: true });
    }
  }, [occurrenceId, volunteer, navigate]);

  const [occurrence, setOccurrence] = useState(null);
  const [template,   setTemplate]   = useState(null);
  const [busy, setBusy] = useState(false);

  // Live occurrence from Firebase
  useEffect(() => {
    if (!occurrenceId) return;
    return onValue(ref(db, `routeOccurrences/${occurrenceId}`), snap => {
      setOccurrence(snap.exists() ? { id: occurrenceId, ...snap.val() } : null);
    });
  }, [occurrenceId]);

  // Live template from Firebase
  useEffect(() => {
    if (!templateId) return;
    return onValue(ref(db, `routeTemplates/${templateId}`), snap => {
      setTemplate(snap.exists() ? { id: templateId, ...snap.val() } : null);
    });
  }, [templateId]);

  if (!occurrenceId || !volunteer) return null;

  // Loading state
  if (!occurrence || !template) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] max-w-[390px] mx-auto flex items-center justify-center"
        style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>
        <p className="text-[#6b7280] text-[14px]">Loading…</p>
      </div>
    );
  }

  const merged = mergeRouteData(occurrence, { [templateId]: template });

  const volunteerName = volunteer.name;
  const drivers    = Array.isArray(merged.drivers) ? merged.drivers : [];
  const needed     = Number(merged.driversNeeded) || 1;
  const isClaimed  = drivers.includes(volunteerName);
  const isFull     = drivers.length >= needed;
  const isComplete = merged.status === "complete";

  // Build slot display
  const slots = Array.from({ length: needed }, (_, i) => {
    const val = drivers[i];
    if (!val) return { type: "open" };
    if (val === volunteerName) return { type: "me" };
    return { type: "other", name: val.split(" ")[0] };
  });

  function goBack() {
    navigate("/delivery-task-pool", { state: { volunteer } });
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleClaim() {
    if (busy) return;
    const currentDrivers = merged.drivers || [];
    if (currentDrivers.length >= needed) return;
    setBusy(true);
    try {
      const updatedDrivers = [...currentDrivers, volunteerName];
      await update(ref(db, `routeOccurrences/${occurrenceId}`), {
        drivers: updatedDrivers,
        status:  "inProgress",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleUnclaim() {
    if (busy) return;
    setBusy(true);
    try {
      const updatedDrivers = drivers.filter(d => d !== volunteerName);
      await update(ref(db, `routeOccurrences/${occurrenceId}`), {
        drivers: updatedDrivers,
        status:  updatedDrivers.length === 0 ? "pending" : "inProgress",
      });
      navigate("/delivery-task-pool", { state: { volunteer } });
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete() {
    if (busy) return;
    setBusy(true);
    try {
      await update(ref(db, `routeOccurrences/${occurrenceId}`), {
        status: "complete",
      });
      await set(ref(db, `routeHistory/${occurrenceId}`), {
        ...merged,
        completedAt:  Date.now(),
        completedBy:  volunteerName,
      });
      navigate("/delivery-task-pool", { state: { volunteer } });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] max-w-[390px] mx-auto flex flex-col pb-28"
      style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* Top bar */}
      <div className="bg-[#0a2a3a] px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <button onClick={goBack}
          className="text-white bg-transparent border-none cursor-pointer p-1 -ml-1">
          <ChevronLeft size={22} />
        </button>
        <p className="text-white text-[16px] font-semibold">Route Details</p>
        <div className="w-8" />
      </div>

      {/* Detail card */}
      <div className="bg-white rounded-2xl border border-[#e5e7eb] mx-4 mt-4 p-5">

        {/* Section 1 — Header */}
        <p className="text-[#0a2a3a] text-[18px] font-semibold">{merged.name}</p>
        <span className={`inline-block mt-1.5 text-[11px] px-2.5 py-0.5 rounded-full font-medium ${getStatusStyle(merged.status)}`}>
          {getStatusLabel(merged.status)}
        </span>

        {/* Section 2 — Route info */}
        <div className="mt-4 space-y-3">
          <InfoRow icon={MapPin}  iconColor="#6b7280"  label="Pickup"    value={merged.source} />
          <InfoRow icon={MapPin}  iconColor="#0d9488"  label="Drop-off"  value={merged.destination} />
          <InfoRow icon={Package} iconColor="#6b7280"  label="Items"     value={merged.items} />
          <InfoRow icon={Clock}   iconColor="#6b7280"  label="Departs"   value={formatTime(merged.departureTime)} />
          <InfoRow icon={Clock}   iconColor="#6b7280"  label="Arrives"   value={merged.arrivalTime ? formatTime(merged.arrivalTime) : null} />
          <InfoRow icon={Truck}   iconColor="#6b7280"  label="Vehicle"   value={merged.vehicle} />
        </div>

        {/* Section 3 — Driver slots */}
        <div className="mt-4">
          <p className="text-[#6b7280] text-[12px] mb-2">Drivers</p>
          <div className="flex flex-wrap gap-2">
            {slots.map((slot, i) => (
              <span key={i} className={`rounded-full px-3 py-1 text-[12px] font-medium ${
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
      </div>

      {/* Bottom action area */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-white border-t border-[#e5e7eb] px-4 py-4">

        {/* State D — Complete */}
        {isComplete && (
          <button disabled
            className="w-full bg-[#f0fff4] text-[#34c759] rounded-xl py-3.5 text-[15px] font-medium cursor-not-allowed border-none">
            Route Completed
          </button>
        )}

        {/* State C — Full, not claimed by me */}
        {!isComplete && isFull && !isClaimed && (
          <button disabled
            className="w-full bg-[#e6e6e6] text-[#6b7280] rounded-xl py-3.5 text-[15px] cursor-not-allowed border-none">
            Route Full
          </button>
        )}

        {/* State A — Available to claim */}
        {!isComplete && !isFull && !isClaimed && (
          <button onClick={handleClaim} disabled={busy}
            className="w-full bg-[#09665e] text-white rounded-xl py-3.5 text-[15px] font-semibold border-none cursor-pointer active:opacity-80 disabled:opacity-60">
            {busy ? "Claiming…" : "Claim Route"}
          </button>
        )}

        {/* State B — Claimed by this volunteer */}
        {!isComplete && isClaimed && (
          <div className="flex gap-3">
            <button onClick={handleUnclaim} disabled={busy}
              className="flex-1 bg-white border border-[#e5e7eb] text-[#6b7280] rounded-xl py-3.5 text-[14px] cursor-pointer active:opacity-80 disabled:opacity-60">
              {busy ? "…" : "Unclaim"}
            </button>
            <button onClick={handleComplete} disabled={busy}
              className="flex-1 bg-[#09665e] text-white rounded-xl py-3.5 text-[14px] font-semibold border-none cursor-pointer active:opacity-80 disabled:opacity-60 ml-0">
              {busy ? "…" : "Mark Complete"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
