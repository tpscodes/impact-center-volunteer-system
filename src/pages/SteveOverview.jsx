// SteveOverview.jsx — Super-admin read-only overview of both pantries
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import { useAuth } from "../contexts/AuthContext";
import SidebarSteve from "../components/SidebarSteve";

const PANTRIES = [
  { id: "jason", label: "Food Pantry",  manager: "Jason Bratina" },
  { id: "amber", label: "Clothing",     manager: "Amber Clark"   },
];

const todayIso = () => new Date().toISOString().slice(0, 10);

function usePantryStats(pantryId) {
  const [stats, setStats] = useState({
    activeTasks:       0,
    completedToday:    0,
    volunteersActive:  0,
    sessionActive:     false,
    synced:            false,
  });

  useEffect(() => {
    const base = `pantries/${pantryId}`;
    let tasksData    = null;
    let completedData = null;
    let sessionData  = null;

    function compute() {
      const tasks     = tasksData     ? Object.values(tasksData)     : [];
      const completed = completedData ? Object.values(completedData) : [];

      const today         = todayIso();
      const activeTasks   = tasks.filter(t => t.status !== "complete").length;
      const completedToday = completed.filter(t =>
        t.completedAtMs && new Date(t.completedAtMs).toISOString().slice(0, 10) === today
      ).length;
      const volunteersActive = new Set(
        tasks.filter(t => t.status === "in-progress" && t.assignedTo).map(t => t.assignedTo)
      ).size;
      const sessionActive = !!(sessionData?.isActive && (
        sessionData.type !== "timed" || !sessionData.endTime || Date.now() < sessionData.endTime
      ));

      setStats({ activeTasks, completedToday, volunteersActive, sessionActive, synced: true });
    }

    const unsubTasks = onValue(ref(db, `${base}/tasks`), snap => {
      tasksData = snap.val();
      compute();
    });
    const unsubCT = onValue(ref(db, `${base}/completedTasks`), snap => {
      completedData = snap.val();
      compute();
    });
    const unsubSession = onValue(ref(db, `${base}/session/current`), snap => {
      sessionData = snap.val();
      compute();
    });

    return () => { unsubTasks(); unsubCT(); unsubSession(); };
  }, [pantryId]);

  return stats;
}

function PantryCard({ pantry }) {
  const navigate             = useNavigate();
  const { switchPantry }     = useAuth();
  const stats                = usePantryStats(pantry.id);

  function handleManage() {
    switchPantry(pantry.id);
    navigate("/manager-tasks");
  }

  return (
    <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden flex flex-col">

      {/* Card header */}
      <div className="bg-[#0a2a3a] px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[#0d9488] text-[10px] uppercase tracking-widest font-medium mb-1">
              {stats.sessionActive ? "● Session Active" : "○ No Session"}
            </p>
            <h2 className="text-white text-[18px] font-semibold leading-tight">{pantry.label}</h2>
            <p className="text-[#6b7280] text-[12px] mt-0.5">{pantry.manager}</p>
          </div>
          <div className={`w-3 h-3 rounded-full shrink-0 ${stats.sessionActive ? "bg-[#34c759]" : "bg-[#6b7280]"}`} />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 divide-x divide-[#e5e7eb] border-b border-[#e5e7eb]">
        {[
          { label: "Active Tasks",     value: stats.activeTasks,      color: "#0d9488" },
          { label: "Completed Today",  value: stats.completedToday,   color: "#34c759" },
          { label: "Volunteers Active",value: stats.volunteersActive,  color: "#0a2a3a" },
        ].map(m => (
          <div key={m.label} className="px-4 py-4 flex flex-col justify-center">
            <p className="text-[#6b7280] text-[11px] mb-1 leading-tight">{m.label}</p>
            <p className="text-[26px] font-semibold leading-none" style={{ color: m.color }}>
              {stats.synced ? m.value : "—"}
            </p>
          </div>
        ))}
      </div>

      {/* Manage button */}
      <div className="px-5 py-4 flex justify-end">
        <button
          onClick={handleManage}
          className="flex items-center gap-2 bg-[#09665e] text-white px-4 py-2 rounded-lg
            text-[13px] font-medium hover:opacity-90 cursor-pointer border-none transition-opacity">
          Manage →
        </button>
      </div>
    </div>
  );
}

export default function SteveOverview() {
  const { displayName } = useAuth();

  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });

  const hour    = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const firstName = (displayName || "Steve").split(" ")[0];

  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}
         className="min-h-screen bg-[#f5f5f5]">

      {/* Desktop layout */}
      <div className="hidden lg:flex min-h-screen">
        <SidebarSteve />

        <div className="lg:ml-[var(--sidebar-w)] flex-1 flex flex-col min-h-screen">

          {/* Top bar */}
          <div className="bg-white border-b border-[#e5e7eb] h-16 flex items-center justify-between px-6 sticky top-0 z-10">
            <h1 className="text-[22px] font-semibold text-[#0a2a3a] tracking-tight">
              {greeting}, {firstName}
            </h1>
            <span className="text-[#6b7280] text-[13px]">{todayStr}</span>
          </div>

          {/* Pantry cards */}
          <div className="p-6">
            <p className="text-[#6b7280] text-[13px] mb-5">
              Live overview — read only. Click <strong>Manage →</strong> to switch into a pantry.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {PANTRIES.map(p => <PantryCard key={p.id} pantry={p} />)}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="lg:hidden min-h-screen">
        <div className="bg-[#0a2a3a] px-5 py-5">
          <p className="text-[#0d9488] text-[10px] uppercase tracking-widest mb-1">Super Admin</p>
          <h1 className="text-white text-[22px] font-semibold">{greeting}, {firstName}</h1>
          <p className="text-[#6b7280] text-[13px] mt-0.5">{todayStr}</p>
        </div>

        <div className="px-4 py-5 flex flex-col gap-5">
          {PANTRIES.map(p => <PantryCard key={p.id} pantry={p} />)}
        </div>
      </div>
    </div>
  );
}
