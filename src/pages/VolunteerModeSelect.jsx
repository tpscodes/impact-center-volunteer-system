// VolunteerModeSelect.jsx — Driver volunteers choose Pantry vs Delivery
import { useNavigate, useLocation } from "react-router-dom";
import { ClipboardList, Truck } from "lucide-react";
import { useEffect } from "react";

export default function VolunteerModeSelect() {
  const navigate = useNavigate();
  const location = useLocation();
  const volunteer = location.state?.volunteer;

  // Guard: if no volunteer in state, redirect back to ID entry
  useEffect(() => {
    if (!volunteer) navigate("/volunteer-id", { replace: true });
  }, [volunteer, navigate]);

  if (!volunteer) return null;

  const firstName = volunteer.name?.split(" ")[0] || volunteer.name || "Volunteer";

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col items-center"
      style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      <div className="w-full max-w-[390px] flex flex-col">

        {/* Greeting */}
        <div className="pt-10 pb-6 px-4 text-center">
          <p className="text-[#0a2a3a] text-[18px] font-semibold">Hi, {firstName}!</p>
          <p className="text-[#6b7280] text-[14px] mt-1">What are you doing today?</p>
        </div>

        {/* Mode cards */}
        <div className="flex flex-col gap-4 mx-4">

          {/* Pantry card */}
          <button
            onClick={() => navigate("/task-pool", { state: { volunteer } })}
            className="bg-white border border-[#e5e7eb] rounded-2xl p-6 text-left hover:border-[#0d9488] hover:shadow-sm transition-all cursor-pointer w-full">
            <ClipboardList size={32} color="#0d9488" />
            <p className="text-[#0a2a3a] text-[16px] font-semibold mt-3">Pantry Operations</p>
            <p className="text-[#6b7280] text-[13px] mt-1">Help with today's distribution tasks</p>
          </button>

          {/* Delivery card */}
          <button
            onClick={() => navigate("/delivery-task-pool", { state: { volunteer } })}
            className="bg-white border border-[#e5e7eb] rounded-2xl p-6 text-left hover:border-[#0d9488] hover:shadow-sm transition-all cursor-pointer w-full">
            <Truck size={32} color="#0d9488" />
            <p className="text-[#0a2a3a] text-[16px] font-semibold mt-3">Delivery Routes</p>
            <p className="text-[#6b7280] text-[13px] mt-1">View and claim your delivery routes</p>
          </button>

        </div>
      </div>
    </div>
  );
}
