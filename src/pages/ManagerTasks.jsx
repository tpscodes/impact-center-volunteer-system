// ManagerTasks.jsx — Task list screen + bulk create task screen
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Menu, X, MapPin, ChevronRight, Clock } from "lucide-react";
import { useSharedTasks } from "../hooks/useSharedTasks";

const GRAY = { dark: "#1F2937", mid: "#374151", soft: "#6B7280", light: "#9CA3AF", border: "#E5E7EB", bg: "#F9FAFB" };

// ── Real item suggestions from Jason's task sheets ───────────────────────────
const ITEM_SUGGESTIONS = [
  { item: "Coffee", source: "Warehouse — Green shelf", destination: "Rack 7", action: "Fill" },
  { item: "Cereal", source: "Warehouse", destination: "Rack 9", action: "Front up" },
  { item: "Canned Vegetables", source: "Misc veggie pallets in warehouse", destination: "Canned Veggies Rack", action: "Fill" },
  { item: "Canned Fruit", source: "Pallet in front of rack", destination: "Canned Fruit Rack", action: "Fill" },
  { item: "Canned Beans", source: "Warehouse", destination: "Beans Rack", action: "Fill" },
  { item: "Canned Meat / Tuna", source: "Random bean pallet in warehouse", destination: "Canned Meat Rack", action: "Fill" },
  { item: "Pasta / Spaghetti", source: "Warehouse", destination: "Pasta Rack", action: "Fill" },
  { item: "Spaghetti Sauce", source: "Warehouse", destination: "Rack 3", action: "Fill" },
  { item: "Hawaiian Rolls", source: "Rollers by loading dock", destination: "Rack 3", action: "Add" },
  { item: "Peanut Butter", source: "Rack 15", destination: "Rack 18", action: "Move" },
  { item: "Great Northern Beans (silver bags)", source: "Donation bins in warehouse", destination: "Rack 15", action: "Fill" },
  { item: "Ramen Noodles", source: "Warehouse", destination: "Rack 22", action: "Fill" },
  { item: "Chips", source: "Warehouse", destination: "Rack 25", action: "Fill" },
  { item: "Crackers", source: "Warehouse", destination: "Crackers Rack", action: "Fill" },
  { item: "Soup", source: "Warehouse", destination: "Soup Rack", action: "Fill" },
  { item: "Mac N Cheese", source: "Black totes on empty pallets", destination: "Mac N Cheese Rack", action: "Fill" },
  { item: "Box Meals", source: "Warehouse", destination: "Box Meal Rack", action: "Fill" },
  { item: "Oatmeal", source: "Warehouse", destination: "Oatmeal Rack", action: "Front & Fill" },
  { item: "Nutri Grain / Kind Bars", source: "Warehouse", destination: "Protein Bar Rack", action: "Fill" },
  { item: "Cookies", source: "Warehouse", destination: "Cookies Rack", action: "Front up" },
  { item: "Gummies / Candy", source: "Warehouse", destination: "Rack 14", action: "Fill" },
  { item: "Popcorn / Chips", source: "Pallet by racks in pantry", destination: "Chip Tower", action: "Fill" },
  { item: "Beef Stock", source: "Warehouse", destination: "Rack 20", action: "Front up" },
  { item: "Drug Store / Household Items", source: "Large gaylords in back of warehouse", destination: "Drug Store Racks", action: "Fill" },
  { item: "Baby Food / Formula", source: "Blue cart by garage door", destination: "Baby Food Rack", action: "Fill" },
  { item: "Yogurt", source: "Walk-in fridge", destination: "Door 1", action: "Fill" },
  { item: "Specialty Bread", source: "Warehouse", destination: "Door 2", action: "Fill" },
  { item: "Iced Coffee", source: "Walk-in fridge", destination: "Door 3", action: "Fill" },
  { item: "Pineapple Juice", source: "Walk-in fridge", destination: "Door 4", action: "Fill" },
  { item: "V8 Juice", source: "Warehouse", destination: "Door 5", action: "Fill" },
  { item: "Eggs", source: "Tall pallet in walk-in fridge", destination: "Door 5 & 6", action: "Back-fill" },
  { item: "Fairlife Milk / 1 Gallon Jugs", source: "Walk-in fridge", destination: "Door 7", action: "Fill" },
  { item: "Hashbrowns", source: "Walk-in fridge", destination: "Door 7", action: "Fill" },
  { item: "Misc Cold Items", source: "Plastic milk crates in walk-in fridge", destination: "Door 8 & 9", action: "Fill" },
  { item: "Pickles (glass jars)", source: "Warehouse", destination: "Door 9", action: "Fill" },
  { item: "Cheese / American Cheese Singles", source: "Walk-in fridge", destination: "Door 4", action: "Fill" },
  { item: "Ham", source: "Walk-in freezer", destination: "Door 13", action: "Fill" },
  { item: "Chicken / Beef / Seafood / Pork", source: "Walk-in freezer pallets", destination: "Doors 15-17", action: "Fill" },
  { item: "Large Meats", source: "Walk-in freezer", destination: "Door 18", action: "Fill" },
  { item: "Pizzas / Sandwiches", source: "Green shelves in walk-in freezer", destination: "Door 12", action: "Fill" },
  { item: "Veggie Lasagna / Stuffing", source: "Lilly Pallets in walk-in freezer", destination: "Door 10", action: "Fill" },
  { item: "Trash Cans", source: "Warehouse", destination: "Warehouse", action: "Empty" },
  { item: "Cardboard Boxes", source: "Pantry floor", destination: "Recycling bin / dumpster", action: "Flatten & throw out" },
  { item: "Donation Bins", source: "Tables in warehouse", destination: "Pantry racks", action: "Sort and put out" },
  { item: "Wooden Pallets", source: "Warehouse floor", destination: "Next to dumpster", action: "Pile" },
];

const SOURCE_SUGGESTIONS = [...new Set(ITEM_SUGGESTIONS.map(i => i.source))];
const DEST_SUGGESTIONS = [...new Set(ITEM_SUGGESTIONS.map(i => i.destination))];
const ACTION_SUGGESTIONS = [...new Set(ITEM_SUGGESTIONS.map(i => i.action))];

const ASSIGN_OPTIONS = [
  { value: "", label: "Anyone (open)" },
  { value: "experienced", label: "Experienced Volunteers" },
  { value: "new", label: "New Volunteers" },
];

const PRIORITY_OPTIONS = ["Normal", "High", "Urgent"];

const ALL_TAGS = ["Warehouse", "Fridge", "Freezer", "Sorting", "Produce", "Delivery", "Shift Leader", "Warm", "Cool", "Kitchen", "Clothing", "General"];

function emptyRow() {
  return { id: Date.now() + Math.random(), item: "", source: "", destination: "", action: "", assignTo: "", priority: "Normal", comments: "", estimatedTime: "", tags: [] };
}

// ── Autocomplete input ────────────────────────────────────────────────────────
function AutoInput({ value, onChange, onSelect, suggestions, placeholder, style }) {
  const [open, setOpen] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const ref = useRef(null);

  function handleChange(val) {
    onChange(val);
    const q = val.toLowerCase();
    setFiltered(q.length > 0 ? suggestions.filter(s => s.toLowerCase().includes(q)).slice(0, 5) : []);
    setOpen(true);
  }

  function handlePick(s) {
    onSelect ? onSelect(s) : onChange(s);
    setOpen(false);
    setFiltered([]);
  }

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <input
        value={value}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => { if (filtered.length > 0) setOpen(true); }}
        placeholder={placeholder}
        style={{ width: "100%", padding: "7px 8px", border: `1px solid ${GRAY.border}`, borderRadius: 6, fontSize: 13, color: GRAY.dark, background: "white", outline: "none", boxSizing: "border-box", fontFamily: "inherit", ...style }}
        onMouseEnter={e => e.target.style.borderColor = GRAY.soft}
        onMouseLeave={e => e.target.style.borderColor = GRAY.border}
      />
      {open && filtered.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "white", border: `1px solid ${GRAY.border}`, borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", overflow: "hidden", marginTop: 2 }}>
          {filtered.map((s, i) => (
            <div key={i} onClick={() => handlePick(s)}
              style={{ padding: "8px 10px", fontSize: 13, color: GRAY.dark, cursor: "pointer", borderBottom: i < filtered.length - 1 ? `1px solid ${GRAY.border}` : "none" }}
              onMouseEnter={e => e.currentTarget.style.background = GRAY.bg}
              onMouseLeave={e => e.currentTarget.style.background = "white"}>
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tags multi-select cell ────────────────────────────────────────────────────
function TagsCell({ tags, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggleTag(tag) {
    onChange(tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag]);
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div onClick={() => setOpen(!open)}
        style={{ minHeight: 34, padding: "4px 6px", border: `1px solid ${GRAY.border}`, borderRadius: 6, cursor: "pointer", display: "flex", flexWrap: "wrap", gap: 3, alignItems: "flex-start", background: "white", boxSizing: "border-box" }}
        onMouseEnter={e => e.currentTarget.style.borderColor = GRAY.soft}
        onMouseLeave={e => e.currentTarget.style.borderColor = GRAY.border}
      >
        {tags.length === 0
          ? <span style={{ fontSize: 11, color: GRAY.light, lineHeight: "26px", paddingLeft: 2 }}>+ Tags</span>
          : tags.map(tag => (
              <span key={tag} style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 10, background: GRAY.border, color: GRAY.mid, whiteSpace: "nowrap" }}>{tag}</span>
            ))
        }
      </div>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 200, background: "white", border: `1px solid ${GRAY.border}`, borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", width: 164, marginTop: 2, maxHeight: 240, overflowY: "auto" }}>
          {ALL_TAGS.map(tag => (
            <div key={tag} onClick={() => toggleTag(tag)}
              style={{ padding: "7px 10px", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, background: tags.includes(tag) ? GRAY.bg : "white" }}
              onMouseEnter={e => e.currentTarget.style.background = GRAY.bg}
              onMouseLeave={e => e.currentTarget.style.background = tags.includes(tag) ? GRAY.bg : "white"}
            >
              <span style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${GRAY.border}`, background: tags.includes(tag) ? GRAY.dark : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {tags.includes(tag) && <span style={{ fontSize: 9, color: "white", lineHeight: 1 }}>✓</span>}
              </span>
              <span style={{ color: GRAY.dark, fontWeight: tags.includes(tag) ? 600 : 400 }}>{tag}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Self-contained Manager Tasks (used by /manager-tasks route) ──────────────
export default function ManagerTasks() {
  const navigate = useNavigate()
  const { tasks, completedTasks, session, deleteTask, markTaskIncomplete } = useSharedTasks()

  const activeTasks = tasks.filter(t => t.status !== 'complete').length
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length
  const volunteersActive = [...new Set(tasks.filter(t => t.assignedTo).map(t => t.assignedTo))].length
  const isSessionActive = session?.isActive

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex" style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Sidebar ── */}
      <div className="w-[220px] min-h-screen bg-[#0a2a3a] flex flex-col fixed left-0 top-0 z-20">
        {/* Logo */}
        <div className="px-5 pt-7 pb-4">
          <p className="text-white text-[14px] font-medium">IMPACT CENTER</p>
          <p className="text-[#0d9488] text-[10px] mt-0.5">Volunteer Task Management</p>
          <div className="w-8 h-0.5 bg-[#0d9488] mt-3" />
        </div>
        {/* Nav */}
        <nav className="flex flex-col mt-2">
          {[
            { label: 'Dashboard', path: '/manager/dashboard', active: false },
            { label: 'Tasks',     path: '/manager-tasks',     active: true  },
            { label: 'Volunteers',path: null,                 active: false },
            { label: 'History',   path: '/manager/history',   active: false },
          ].map(item => (
            <button key={item.label}
              onClick={() => item.path && navigate(item.path)}
              className={`w-full text-left px-5 py-3 text-[14px] font-semibold bg-transparent border-none cursor-pointer transition-colors ${
                item.active
                  ? 'text-[#0d9488] border-l-[3px] border-[#0d9488]'
                  : 'text-[#767676] border-l-[3px] border-transparent hover:text-[#b3b3b3]'
              }`}>
              {item.label}
            </button>
          ))}
        </nav>
        {/* User info */}
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
          <button onClick={() => navigate('/')}
            className="text-[#dc2626] text-[10px] mt-2 ml-12 hover:underline bg-transparent border-none cursor-pointer">
            Logout
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="ml-[220px] flex-1 flex flex-col min-h-screen">

        {/* Top bar */}
        <div className="bg-white border-b border-[#e5e7eb] h-16 flex items-center justify-between px-6 sticky top-0 z-10">
          <h1 className="text-[22px] font-semibold text-[#0a2a3a] tracking-tight">
            Good Morning, Operations Manager
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-[#6b7280] text-[13px]">{todayStr}</span>
            {isSessionActive ? (
              <div className="flex items-center gap-1.5 bg-[#f0fff4] border border-[#34c759] rounded-full px-3 py-1">
                <div className="w-2 h-2 rounded-full bg-[#34c759]" />
                <span className="text-[#34c759] text-[11px] font-medium">Session Active</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-[#f3f4f6] border border-[#e5e7eb] rounded-full px-3 py-1">
                <div className="w-2 h-2 rounded-full bg-[#9ca3af]" />
                <span className="text-[#6b7280] text-[11px] font-medium">No Session</span>
              </div>
            )}
          </div>
        </div>

        {/* Content area */}
        <div className="flex flex-1 gap-6 p-6">

          {/* Left column — stats + create button */}
          <div className="w-[240px] shrink-0 flex flex-col gap-4">
            <button onClick={() => navigate('/manager/create-task')}
              className="w-full bg-[#09665e] text-white py-3 rounded-lg text-[15px] font-medium flex items-center justify-center gap-2 hover:opacity-90 border-none cursor-pointer">
              <Plus size={16} />
              Create Task
            </button>
            {[
              { label: 'Active Tasks',       value: activeTasks,      color: '#0d9488' },
              { label: 'In Progress',        value: inProgressTasks,  color: '#ff9500' },
              { label: 'Completed Today',    value: completedTasks?.length || 0, color: '#34c759' },
              { label: 'Volunteers Active',  value: volunteersActive, color: '#0a2a3a' },
            ].map(stat => (
              <div key={stat.label} className="bg-white border border-[#e5e7eb] rounded-xl px-4 py-3 h-[72px] flex flex-col justify-center">
                <p className="text-[#6b7280] text-[12px] mb-1">{stat.label}</p>
                <p className="text-[28px] font-semibold leading-none" style={{ color: stat.color }}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Right column — task cards grid */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 content-start">
            {tasks.filter(t => t.status !== 'complete').map(task => (
              <div key={task.id} className="bg-white border border-[#e5e7eb] rounded-xl p-4 flex flex-col gap-2">

                {/* Name + priority */}
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[#0a2a3a] text-[15px] font-semibold leading-snug flex-1">{task.name || task.item}</p>
                  {task.priority && (
                    <span className={`text-[12px] font-semibold px-3 py-1 rounded-full shrink-0 ${
                      task.priority === 'Urgent' || task.priority === 'urgent'
                        ? 'bg-[#fff0f0] text-[#dc2626]'
                        : task.priority === 'High' || task.priority === 'high'
                        ? 'bg-[#fff3e0] text-[#ff9500]'
                        : 'bg-[#f0f0f0] text-[#6b7280]'
                    }`}>
                      {task.priority}
                    </span>
                  )}
                </div>

                {/* Source → Destination */}
                {(task.source || task.destination) && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <MapPin size={13} className="text-[#6b7280] shrink-0" />
                    <p className="text-[#6b7280] text-[12px]">{task.source}</p>
                    <ChevronRight size={13} className="text-[#6b7280]" />
                    <p className="text-[#0a2a3a] text-[12px]">{task.destination}</p>
                  </div>
                )}

                {/* Special instructions (comments field) */}
                {task.comments && (
                  <div className="flex items-center gap-1">
                    <Clock size={13} className="text-[#6b7280] shrink-0" />
                    <p className="text-[#6b7280] text-[12px] italic">{task.comments}</p>
                  </div>
                )}

                {/* Tags */}
                {task.tags && task.tags.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {task.tags.map(tag => (
                      <span key={tag} className="bg-[#ccedeb] text-[#09665e] text-[11px] font-medium px-2.5 py-1 rounded-md">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="border-t border-[#e5e7eb]" />

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-3">
                    {task.status === 'in-progress' && (
                      <button onClick={() => markTaskIncomplete(task.id)}
                        className="text-[#ff9500] text-[12px] hover:underline bg-transparent border-none cursor-pointer p-0">
                        Mark Incomplete
                      </button>
                    )}
                    {task.status !== 'complete' && (
                      <button onClick={() => deleteTask(task.id)}
                        className="text-[#dc2626] text-[12px] hover:underline bg-transparent border-none cursor-pointer p-0">
                        Remove
                      </button>
                    )}
                  </div>
                  <button onClick={() => navigate('/manager/tasks')}
                    className="flex items-center gap-0.5 text-[#0a2a3a] text-[12px] hover:text-[#0d9488] bg-transparent border-none cursor-pointer p-0">
                    View all <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            ))}

            {tasks.filter(t => t.status !== 'complete').length === 0 && (
              <div className="col-span-2 flex items-center justify-center py-20">
                <p className="text-[#6b7280] text-base">No active tasks. Create one to get started.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Manager Tasks List Screen ─────────────────────────────────────────────────
export function ManagerTasksScreen({ tasks, onDeleteTask, onMarkIncomplete, synced, error }) {
  const navigate = useNavigate();

  function StatusBadge({ status }) {
    const cfg = {
      available: { label: "Available", bg: "#F3F4F6", color: "#374151" },
      "in-progress": { label: "In Progress", bg: "#FFF3E0", color: "#C2410C" },
      complete: { label: "Complete", bg: "#1F2937", color: "white" },
      incomplete: { label: "Incomplete", bg: "#FEE2E2", color: "#DC2626" },
    }[status] || { label: status, bg: "#F3F4F6", color: "#374151" };
    return <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{cfg.label}</span>;
  }

  return (
    <div style={{ background: GRAY.bg, minHeight: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: GRAY.mid, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Operations Manager</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "white" }}>Tasks</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: error ? "#EF4444" : synced ? "#86EFAC" : "#FCD34D" }} />
          <button onClick={() => navigate("/manager/dashboard")}
            style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer" }}>
            ← Dashboard
          </button>
        </div>
      </div>

      <div style={{ padding: "16px 16px 100px" }}>
        {/* Stats row */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[
            { label: "Total", val: tasks.length, bg: "white" },
            { label: "Active", val: tasks.filter(t => t.status === "available").length, bg: "white" },
            { label: "In Progress", val: tasks.filter(t => t.status === "in-progress").length, bg: "white" },
            { label: "Done", val: tasks.filter(t => t.status === "complete").length, bg: "white" },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: s.bg, borderRadius: 10, padding: "10px 8px", border: `1px solid ${GRAY.border}`, textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: GRAY.dark }}>{s.val}</div>
              <div style={{ fontSize: 10, color: GRAY.light, fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Task cards */}
        {tasks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: GRAY.light }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No tasks yet</div>
            <div style={{ fontSize: 13 }}>Tap "Create Tasks" below to add some</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {tasks.map(t => (
              <div key={t.id} style={{ background: "white", borderRadius: 12, border: `1px solid ${GRAY.border}`, padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: t.status === "complete" ? GRAY.light : GRAY.dark, flex: 1 }}>{t.name}</div>
                  <StatusBadge status={t.status} />
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 11, color: GRAY.soft, flexWrap: "wrap" }}>
                  {t.destination && <span>📍 {t.destination}</span>}
                  {t.estimatedTime && <span>⏱ {t.estimatedTime}</span>}
                  {t.assignedTo === "experienced" && <span>👤 Experienced Vol</span>}
                  {t.assignedTo === "new" && <span>👤 New Vol</span>}
                  {!t.assignedTo && <span>👥 Open</span>}
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                  {t.status === "in-progress" && (
                    <button onClick={() => onMarkIncomplete(t.id)}
                      style={{ fontSize: 11, color: "#DC2626", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
                      Mark Incomplete
                    </button>
                  )}
                  {t.status !== "complete" && (
                    <button onClick={() => onDeleteTask(t.id)}
                      style={{ fontSize: 11, color: GRAY.light, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sticky CTA */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 480, margin: "0 auto", padding: "12px 16px", background: "white", borderTop: `1px solid ${GRAY.border}` }}>
        <button onClick={() => navigate("/manager/create-task")}
          style={{ width: "100%", padding: "14px 0", background: GRAY.dark, color: "white", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
          + Create Tasks
        </button>
      </div>
    </div>
  );
}

// ── Bulk Create Tasks Screen ──────────────────────────────────────────────────
export function CreateTaskScreen({ onPublishAll, onBack }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState([emptyRow(), emptyRow(), emptyRow()]);
  const [publishing, setPublishing] = useState(false);
  const [done, setDone] = useState(false);
  const [generalNotes, setGeneralNotes] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function updateRow(id, field, value) {
    setRows(rows => rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  }

  function handleItemSelect(id, suggestion) {
    const match = ITEM_SUGGESTIONS.find(s => s.item === suggestion);
    if (match) {
      setRows(rows => rows.map(r => r.id === id ? {
        ...r,
        item: match.item,
        source: r.source || match.source,
        destination: r.destination || match.destination,
        action: r.action || match.action,
      } : r));
    } else {
      updateRow(id, "item", suggestion);
    }
  }

  function addRow() { setRows(r => [...r, emptyRow()]); }

  function removeRow(id) {
    if (rows.length === 1) return;
    setRows(r => r.filter(row => row.id !== id));
  }

  async function handleDone() {
    const filledRows = rows.filter(r => r.item.trim());
    if (filledRows.length === 0) return;
    setPublishing(true);
    await onPublishAll(filledRows);
    setPublishing(false);
    setDone(true);
  }

  const filledCount = rows.filter(r => r.item.trim()).length;

  if (done) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 p-8" style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
        <div className="text-[56px]">✅</div>
        <div className="text-[22px] font-bold text-[#1f2937]">{filledCount} Tasks Published!</div>
        <div className="text-[14px] text-[#6b7280] text-center">Tasks are now live on the volunteer boards</div>
        <div className="flex gap-3 mt-2">
          <button onClick={() => { setDone(false); setRows([emptyRow(), emptyRow(), emptyRow()]); }}
            className="px-5 py-3 bg-white text-[#1f2937] border-2 border-[#e5e7eb] rounded-xl text-[14px] font-semibold cursor-pointer hover:bg-[#f9fafb]">
            + Add More
          </button>
          <button onClick={onBack}
            className="px-5 py-3 bg-[#0a2a3a] text-white border-none rounded-xl text-[14px] font-bold cursor-pointer hover:opacity-90">
            ← Back to Tasks
          </button>
        </div>
      </div>
    );
  }

  // ── Shared table grid columns ──
  const COLS = "28px 1.6fr 1.1fr 1fr 0.85fr 1fr 0.75fr 1fr 28px";

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>

    {/* ══════════════════════════════════
        MOBILE LAYOUT — under lg (1024px)
    ══════════════════════════════════ */}
    <div className="lg:hidden min-h-screen bg-[#f5f5f5] flex flex-col">

      {/* Header */}
      <div className="bg-[#0a2a3a] px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-[#0d9488] text-[10px] uppercase tracking-widest">Operations Manager</p>
          <p className="text-white text-[20px] font-semibold mt-0.5">Create Tasks</p>
        </div>
        <button onClick={e => { e.stopPropagation(); setMobileMenuOpen(!mobileMenuOpen); }}
          className="text-white bg-transparent border-none cursor-pointer p-1">
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile nav overlay */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed top-0 left-0 right-0 z-50 bg-[#0a2a3a]" style={{ animation: "slideDown 0.25s ease-out forwards" }}>
            {/* Top bar */}
            <div className="px-6 py-5 flex items-center justify-between">
              <div>
                <p className="text-[#0d9488] text-[10px] uppercase tracking-widest">Operations Manager</p>
                <p className="text-white text-[18px] font-semibold mt-0.5">Create Tasks</p>
              </div>
              <button onClick={e => { e.stopPropagation(); setMobileMenuOpen(false); }}
                className="text-white bg-transparent border-none cursor-pointer p-1">
                <X size={24} />
              </button>
            </div>
            <div className="w-10 h-0.5 bg-[#0d9488] mx-6 mb-2" />
            {/* Nav items */}
            <nav className="flex flex-col py-2">
              {[
                { label: "Dashboard", active: false, action: () => navigate("/manager/dashboard") },
                { label: "Tasks",     active: true,  action: () => navigate("/manager-tasks") },
                { label: "Volunteers",active: false, action: () => {} },
                { label: "History",   active: false, action: () => navigate("/manager/history") },
              ].map(item => (
                <button key={item.label}
                  onClick={() => { item.action(); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-8 py-4 text-[16px] font-semibold bg-transparent border-none cursor-pointer ${
                    item.active ? "text-[#0d9488] border-l-[3px] border-[#0d9488]" : "text-[#757575] border-l-[3px] border-transparent"
                  }`}>
                  {item.label}
                </button>
              ))}
              <div className="mx-8 my-3 h-px bg-[#1e3a4a]" />
              <button onClick={() => { setMobileMenuOpen(false); navigate("/"); }}
                className="w-full text-left px-8 py-4 text-[16px] font-semibold text-[#dc2626] border-l-[3px] border-transparent bg-transparent border-none cursor-pointer">
                Logout
              </button>
            </nav>
          </div>
        </>
      )}

      {/* Instruction */}
      <p className="text-[#6b7280] text-[13px] px-5 py-3 bg-white border-b border-[#e5e7eb]">
        Fill in as many tasks as needed.
      </p>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 pb-24">

        {rows.map((row) => (
          <div key={row.id} className="bg-white border border-[#e5e7eb] rounded-xl p-4">

            {/* Card header */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-[#0a2a3a] text-[14px] font-semibold">Task #{rows.indexOf(row) + 1}</p>
              <button onClick={() => removeRow(row.id)} className="text-[#dc2626] text-[13px] bg-transparent border-none cursor-pointer">
                × Remove
              </button>
            </div>
            <div className="h-px bg-[#e5e7eb] mb-4" />

            {/* Item */}
            <div className="mb-3">
              <p className="text-[#6b7280] text-[10px] uppercase tracking-widest mb-1">Item</p>
              <input type="text" placeholder="Item name..."
                value={row.item} onChange={e => updateRow(row.id, "item", e.target.value)}
                className="w-full border-b border-[#e5e7eb] py-2 text-[14px] text-[#0a2a3a] placeholder-[#b3b3b3] outline-none bg-transparent" />
            </div>

            {/* Source + Destination */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <p className="text-[#6b7280] text-[10px] uppercase tracking-widest mb-1">Source</p>
                <input type="text" placeholder="e.g. Warehouse — Bay 14"
                  value={row.source} onChange={e => updateRow(row.id, "source", e.target.value)}
                  className="w-full border-b border-[#e5e7eb] py-2 text-[13px] text-[#0a2a3a] placeholder-[#b3b3b3] outline-none bg-transparent" />
              </div>
              <div>
                <p className="text-[#6b7280] text-[10px] uppercase tracking-widest mb-1">Destination</p>
                <input type="text" placeholder="To / Rack..."
                  value={row.destination} onChange={e => updateRow(row.id, "destination", e.target.value)}
                  className="w-full border-b border-[#e5e7eb] py-2 text-[13px] text-[#0a2a3a] placeholder-[#b3b3b3] outline-none bg-transparent" />
              </div>
            </div>

            {/* Action */}
            <div className="mb-3">
              <p className="text-[#6b7280] text-[10px] uppercase tracking-widest mb-1">Action</p>
              <input type="text" placeholder="Action..."
                value={row.action} onChange={e => updateRow(row.id, "action", e.target.value)}
                className="w-full border-b border-[#e5e7eb] py-2 text-[14px] text-[#0a2a3a] placeholder-[#b3b3b3] outline-none bg-transparent" />
            </div>

            {/* Priority + Assign To */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <p className="text-[#6b7280] text-[10px] uppercase tracking-widest mb-1">Priority</p>
                <select value={row.priority} onChange={e => updateRow(row.id, "priority", e.target.value)}
                  className="w-full border border-[#e5e7eb] rounded-lg py-2 px-2 text-[13px] text-[#0a2a3a] outline-none bg-white">
                  {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <p className="text-[#6b7280] text-[10px] uppercase tracking-widest mb-1">Assign To</p>
                <select value={row.assignTo} onChange={e => updateRow(row.id, "assignTo", e.target.value)}
                  className="w-full border border-[#e5e7eb] rounded-lg py-2 px-2 text-[13px] text-[#0a2a3a] outline-none bg-white">
                  {ASSIGN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {/* Tags */}
            <div className="mb-3">
              <p className="text-[#6b7280] text-[10px] uppercase tracking-widest mb-1">Tags</p>
              <TagsCell tags={row.tags} onChange={v => updateRow(row.id, "tags", v)} />
            </div>

            {/* Special instructions */}
            <div>
              <input type="text" placeholder="📌 Special instructions (optional)..."
                value={row.comments} onChange={e => updateRow(row.id, "comments", e.target.value)}
                className="w-full border-b border-[#e5e7eb] py-2 text-[13px] italic text-[#6b7280] placeholder-[#b3b3b3] outline-none bg-transparent" />
            </div>
          </div>
        ))}

        {/* Add Task */}
        <button onClick={addRow}
          className="w-full border border-dashed border-[#e5e7eb] rounded-xl py-3 text-[#0d9488] text-[14px] bg-transparent cursor-pointer hover:border-[#0d9488]">
          + Add Task
        </button>

        {/* General Notes */}
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-4">
          <p className="text-[#6b7280] text-[10px] uppercase tracking-widest mb-2">General Notes (Optional)</p>
          <textarea placeholder="Any notes for all volunteers today..."
            value={generalNotes} onChange={e => setGeneralNotes(e.target.value)}
            className="w-full border-b border-[#e5e7eb] py-2 text-[13px] italic text-[#0a2a3a] placeholder-[#b3b3b3] outline-none bg-transparent resize-none h-16" />
        </div>
      </div>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e5e7eb] px-5 py-3 flex items-center justify-between z-10">
        <p className="text-[#6b7280] text-[12px]">
          {filledCount > 0 ? `${filledCount} task${filledCount > 1 ? "s" : ""} ready` : "Fill in at least one item"}
        </p>
        <button onClick={handleDone} disabled={filledCount === 0 || publishing}
          className={`px-6 py-2.5 rounded-xl text-[14px] font-medium text-white border-none cursor-pointer ${filledCount > 0 && !publishing ? "bg-[#0a2a3a] hover:opacity-90" : "bg-[#d1d5db] cursor-not-allowed"}`}>
          {publishing ? "Publishing…" : "Done — Publish"}
        </button>
      </div>
    </div>

    {/* ══════════════════════════════════
        DESKTOP LAYOUT — lg (1024px) and up
    ══════════════════════════════════ */}
    <div className="hidden lg:flex min-h-screen">

      {/* ── Sidebar ── */}
      <div className="w-[240px] min-h-screen bg-[#0a2a3a] flex flex-col fixed left-0 top-0 z-20">
        {/* Logo */}
        <div className="px-6 pt-8 pb-4">
          <p className="text-white text-[20px] font-normal leading-tight">IMPACT CENTER</p>
          <p className="text-[#0d9488] text-[14px] mt-1 leading-tight">Volunteer Task<br />Management</p>
          <div className="w-[40px] h-[2px] bg-[#0d9488] mt-3" />
        </div>

        {/* Nav */}
        <nav className="flex flex-col mt-4">
          <div className="flex items-center px-6 py-3 cursor-pointer hover:bg-white/5"
            onClick={() => navigate("/manager/dashboard")}>
            <span className="text-[#767676] text-[16px] font-semibold">Dashboard</span>
          </div>
          <div className="flex items-center border-l-[3px] border-[#0d9488] px-6 py-3">
            <span className="text-[#0d9488] text-[16px] font-semibold">Tasks</span>
          </div>
          {["Volunteers", "History"].map(item => (
            <div key={item} className="flex items-center px-6 py-3 cursor-pointer hover:bg-white/5"
              onClick={() => item === "History" ? navigate("/manager/history") : undefined}>
              <span className="text-[#767676] text-[16px] font-semibold">{item}</span>
            </div>
          ))}
        </nav>

        {/* User info */}
        <div className="mt-auto px-4 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0d9488] flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-semibold">JB</span>
            </div>
            <div>
              <p className="text-[#b3b3b3] text-[16px] font-semibold leading-tight">Jason Bratina</p>
              <p className="text-[#757575] text-[14px] leading-tight">Operations Manager</p>
            </div>
          </div>
          <button onClick={() => navigate("/")}
            className="text-[#dc2626] text-[10px] mt-2 ml-[52px] hover:underline bg-transparent border-none cursor-pointer">
            Logout
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="ml-[240px] flex-1 flex flex-col min-h-screen bg-white">

        {/* Header bar */}
        <div className="bg-[#0a2a3a] px-8 py-5 flex items-center gap-4 shrink-0">
          <button onClick={onBack}
            className="flex items-center gap-1 border border-white/40 text-white text-[13px] px-3 py-1.5 rounded-lg bg-transparent cursor-pointer hover:bg-white/10">
            ← Back
          </button>
          <div>
            <p className="text-[#0d9488] text-[11px] font-semibold uppercase tracking-widest leading-none">Operations Manager</p>
            <p className="text-white text-[22px] font-semibold leading-tight mt-0.5">Create Tasks</p>
          </div>
        </div>

        {/* Scrollable form area */}
        <div className="flex-1 overflow-y-auto px-8 pt-5 pb-28">

          <p className="text-[#6b7280] text-[13px] mb-5">
            Fill in as many tasks as needed. Start typing an item to see suggestions.
          </p>

          {/* Column headers */}
          <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 6, padding: "0 0 6px 0", borderBottom: `2px solid ${GRAY.border}`, marginBottom: 6 }}>
            {["#", "ITEM ↑", "SOURCE", "DESTINATION", "ACTION", "ASSIGN TO", "PRIORITY", "TAGS", ""].map((h, i) => (
              <div key={i} className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-wider"
                style={{ textAlign: i === 0 || i === 8 ? "center" : "left" }}>
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          <div className="flex flex-col divide-y divide-[#e5e7eb]">
            {rows.map((row, idx) => (
              <div key={row.id} className="py-2">
                {/* Main grid */}
                <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 6, alignItems: "center" }}>

                  {/* Row number */}
                  <div className="text-center text-[12px] text-[#9ca3af] font-semibold">{idx + 1}</div>

                  {/* Item */}
                  <AutoInput
                    value={row.item}
                    onChange={v => updateRow(row.id, "item", v)}
                    onSelect={s => handleItemSelect(row.id, s)}
                    suggestions={ITEM_SUGGESTIONS.map(i => i.item)}
                    placeholder="Item name..."
                    style={{ fontWeight: row.item ? 600 : 400 }}
                  />

                  {/* Source */}
                  <AutoInput value={row.source} onChange={v => updateRow(row.id, "source", v)} suggestions={SOURCE_SUGGESTIONS} placeholder="e.g. Warehouse — Bay 14" />

                  {/* Destination */}
                  <AutoInput value={row.destination} onChange={v => updateRow(row.id, "destination", v)} suggestions={DEST_SUGGESTIONS} placeholder="To / Rack..." />

                  {/* Action */}
                  <AutoInput value={row.action} onChange={v => updateRow(row.id, "action", v)} suggestions={ACTION_SUGGESTIONS} placeholder="Action..." />

                  {/* Assign to */}
                  <select value={row.assignTo} onChange={e => updateRow(row.id, "assignTo", e.target.value)}
                    style={{ width: "100%", padding: "7px 8px", border: `1px solid ${GRAY.border}`, borderRadius: 6, fontSize: 13, color: GRAY.dark, background: "white", outline: "none", fontFamily: "inherit" }}>
                    {ASSIGN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>

                  {/* Priority */}
                  <select value={row.priority} onChange={e => updateRow(row.id, "priority", e.target.value)}
                    style={{ width: "100%", padding: "7px 8px", border: `1px solid ${GRAY.border}`, borderRadius: 6, fontSize: 13, color: GRAY.dark, background: "white", outline: "none", fontFamily: "inherit" }}>
                    {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>

                  {/* Tags */}
                  <TagsCell tags={row.tags} onChange={v => updateRow(row.id, "tags", v)} />

                  {/* Remove */}
                  <button onClick={() => removeRow(row.id)}
                    className="text-center bg-transparent border-none text-[#dc2626] cursor-pointer text-[18px] leading-none hover:text-[#b91c1c]"
                    title="Remove row">
                    ×
                  </button>
                </div>

                {/* Special instructions */}
                <div className="mt-2 flex items-center gap-2 pl-[34px]">
                  <span className="text-[#dc2626] text-[12px] shrink-0">📌</span>
                  <input
                    value={row.comments}
                    onChange={e => updateRow(row.id, "comments", e.target.value)}
                    placeholder="+ Special instructions for volunteer (optional)..."
                    className="flex-1 border-none outline-none text-[12px] bg-transparent"
                    style={{ color: row.comments ? GRAY.dark : "#f87171", fontFamily: "inherit" }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Add Row */}
          <button onClick={addRow}
            className="w-full mt-3 py-3 bg-white border-2 border-dashed border-[#e5e7eb] rounded-lg text-[13px] text-[#6b7280] font-semibold cursor-pointer hover:border-[#9ca3af] hover:text-[#374151]">
            + Add Row
          </button>

          {/* General Notes */}
          <div className="mt-5 border border-[#e5e7eb] rounded-xl p-4">
            <p className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-wider mb-2">General Notes (Optional)</p>
            <textarea
              value={generalNotes}
              onChange={e => setGeneralNotes(e.target.value)}
              placeholder="Any notes for all volunteers today..."
              rows={2}
              className="w-full border-none outline-none text-[13px] text-[#1f2937] resize-none"
              style={{ fontFamily: "inherit" }}
            />
          </div>
        </div>

        {/* Fixed bottom bar — spans main content only */}
        <div className="fixed bottom-0 left-[240px] right-0 bg-white border-t border-[#e5e7eb] px-8 py-3 flex items-center justify-between z-10">
          <p className="text-[13px] text-[#6b7280]">
            {filledCount > 0 ? `${filledCount} task${filledCount > 1 ? "s" : ""} ready to publish` : "Fill in at least one item"}
          </p>
          <button onClick={handleDone} disabled={filledCount === 0 || publishing}
            className="px-7 py-3 rounded-xl text-[15px] font-semibold border-none cursor-pointer"
            style={{
              background: filledCount > 0 && !publishing ? "#0a2a3a" : "#d1d5db",
              color: "white",
              cursor: filledCount > 0 && !publishing ? "pointer" : "not-allowed",
            }}>
            {publishing ? "Publishing…" : "Done — Publish"}
          </button>
        </div>
      </div>
    </div>

    </div>
  );
}
