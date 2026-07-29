// ManagerTasks.jsx — Task list screen + bulk create task screen
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import MobileNav from "../components/MobileNav";
import PageHeader from "../components/PageHeader";
import DashboardHeader from "../components/DashboardHeader";
import HeroSummary from "../components/HeroSummary";
import VolunteerListItem from "../components/VolunteerListItem";
import { Plus, MapPin, ChevronRight, Clock, Search, ClipboardList, Pencil, Trash2 } from "lucide-react";
import { useSharedTasks } from "../hooks/useSharedTasks";
import DashboardHero, { computeSparkline } from "../components/DashboardHero";
import { useAuth } from "../contexts/AuthContext";
import TaskTable from "../components/TaskTable";
import { db } from "../firebase";
import { ref, onValue, off } from "firebase/database";

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

function getPriorityStyle(priority) {
  const p = priority?.toLowerCase();
  if (p === 'urgent') return 'bg-[#fff0f0] text-[#dc2626]';
  if (p === 'high')   return 'bg-[#fff3e0] text-[#ff9500]';
  return 'bg-[#f0f0f0] text-[#6b7280]';
}

function getStatusStyle(status) {
  if (status === 'in-progress') return 'bg-[#fff3e0] text-[#ff9500]';
  if (status === 'complete')    return 'bg-[#f0fff4] text-[#34c759]';
  if (status === 'incomplete')  return 'bg-[#fff0f0] text-[#dc2626]';
  return 'bg-[#e6e6e6] text-[#6b7280]';
}

function getStatusLabel(status) {
  if (status === 'in-progress') return 'In Progress';
  if (status === 'complete')    return 'Complete';
  if (status === 'incomplete')  return 'Incomplete';
  return 'Available';
}

const MOBILE_TAGS = ['All', 'Warehouse', 'Kitchen', 'Clothing', 'Freezer', 'Fridge'];

// ── Self-contained Manager Tasks (used by /manager-tasks route) ──────────────
export default function ManagerTasks() {
  const navigate = useNavigate()
  const { activePantryId, role, displayName, initials, logout } = useAuth()
  const modifiedBy = role === 'superadmin' ? 'steve' : undefined
  const { tasks, completedTasks, session, deleteTask, updateTask, markTaskIncomplete } = useSharedTasks(activePantryId, { modifiedBy })

  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')
  const [editingTask, setEditingTask] = useState(null)  // task object being edited
  const [editForm, setEditForm] = useState({})
  const [volunteers, setVolunteers] = useState([])

  // Load volunteers for the tablet Active Volunteers card
  useEffect(() => {
    const volRef = ref(db, "volunteers");
    const handle = onValue(volRef, snap => {
      const val = snap.val();
      if (!val) { setVolunteers([]); return; }
      setVolunteers(Object.entries(val).map(([id, v]) => ({ id, ...v })));
    });
    return () => off(volRef, "value", handle);
  }, []);

  function openEdit(task) {
    setEditingTask(task)
    setEditForm({
      name:        task.name || task.item || '',
      source:      task.source || '',
      destination: task.destination || '',
      comments:    task.comments || '',
      priority:    task.priority || 'Normal',
      tags:        task.tags ? [...task.tags] : [],
    })
  }

  async function saveEdit() {
    if (!editingTask) return
    await updateTask(editingTask.id, {
      name:        editForm.name.trim(),
      item:        editForm.name.trim(),
      source:      editForm.source.trim(),
      destination: editForm.destination.trim(),
      comments:    editForm.comments.trim(),
      priority:    editForm.priority,
      tags:        editForm.tags,
    })
    setEditingTask(null)
  }

  function toggleEditTag(tag) {
    setEditForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag],
    }))
  }

  const activeTasks = tasks.filter(t => t.status !== 'complete').length
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length
  const volunteersActive = [...new Set(tasks.filter(t => t.assignedTo).map(t => t.assignedTo))].length
  const isSessionActive = session?.isActive

  const todayIso = new Date().toISOString().slice(0, 10)
  const completedToday = (completedTasks || []).filter(t =>
    t.completedAtMs && new Date(t.completedAtMs).toISOString().slice(0, 10) === todayIso
  ).length

  const unclaimed = tasks.filter(t => !t.assignedTo && t.status !== 'complete').length
  const urgent = tasks.filter(t => t.priority?.toLowerCase() === 'urgent' && t.status !== 'complete').length
  const experiencedVols = volunteers.filter(v => !v.isNew).length
  const newVols = volunteers.filter(v => v.isNew).length

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

  const activeTasks_ = tasks.filter(t => t.status !== 'complete')
  const filteredTasks = activeTasks_.filter(task => {
    const matchesSearch = !searchQuery.trim() ? true : (() => {
      const q = searchQuery.toLowerCase()
      return (
        task.name?.toLowerCase().includes(q) ||
        task.source?.toLowerCase().includes(q) ||
        task.destination?.toLowerCase().includes(q) ||
        task.tags?.some(tag => tag.toLowerCase().includes(q)) ||
        task.action?.toLowerCase().includes(q)
      )
    })()
    const matchesTag = activeFilter === 'All' ? true : task.tags?.includes(activeFilter)
    return matchesSearch && matchesTag
  })
  const statusOrder = { incomplete: 0, 'in-progress': 1, available: 2, complete: 3 };
  filteredTasks.sort((a, b) => (statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2));

  const STATS = [
    { label: 'Active Tasks',     value: activeTasks,      color: '#0d9488' },
    { label: 'In Progress',      value: inProgressTasks,  color: '#ff9500' },
    { label: 'Completed Today',  value: completedToday,   color: '#34c759' },
    { label: 'Volunteers Active',value: volunteersActive,  color: '#0a2a3a' },
  ]

  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* ══════════════════════════════════════════════════════════════════════
          MOBILE LAYOUT
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden min-h-screen bg-[#D3EDE9] flex flex-col">

        {/* Gradient hero */}
        <div style={{
          background: 'linear-gradient(143deg, #0f7a70 14%, #0a2a3a 86%)',
          borderRadius: '0 0 28px 28px',
          color: '#fff',
        }}>
          <MobileNav mode="pantry" />
          <div style={{ padding: '12px 20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Stat row: Tasks tag + big number + signal bars */}
            <div className="flex items-end justify-between">
              <div className="flex flex-col gap-3">
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full w-fit"
                  style={{ background: '#E6F5F3', color: '#09665E' }}>Tasks</span>
                <p className="m-0 text-[64px] leading-[64px]" style={{ fontWeight: 800 }}>{activeTasks}</p>
              </div>
              <div className="flex items-end gap-[3px]" style={{ height: 32 }}>
                {[10, 16, 22, 32].map((h, i) => (
                  <span key={i} style={{ width: 6, height: h, borderRadius: 2, background: '#0D9488', display: 'block' }} />
                ))}
              </div>
            </div>

            {/* Caption */}
            <p className="m-0 text-[12px]" style={{ color: '#D1D6DB' }}>
              {volunteersActive} volunteers active
            </p>
          </div>
        </div>

        {/* Create Task button */}
        <div className="px-5 pt-[15px]">
          <button onClick={() => navigate('/manager/create-task')}
            className="w-full h-12 rounded-full text-[14px] font-semibold text-white border-none cursor-pointer"
            style={{ background: '#0F7A70' }}>
            + Create Task
          </button>
        </div>

        {/* Active Tasks card */}
        <div className="mt-[15px] bg-white rounded-t-[20px] p-6 flex flex-col gap-5 flex-1">
          <div className="flex items-center justify-between">
            <h2 className="m-0 text-[21px] font-semibold text-[#0A2A3A]">Active Tasks</h2>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 border border-[#E5E7EB] rounded-lg px-3 py-2.5 bg-white">
            <Search size={14} className="text-[#b3b3b3] shrink-0" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 text-[13px] text-[#0A2A3A] placeholder-[#b3b3b3] outline-none bg-transparent"
            />
          </div>

          {/* Filter chips — 4 per Figma */}
          <div className="flex flex-wrap gap-2">
            {['All', 'Warehouse', 'Kitchen', 'Clothing'].map(tag => (
              <button key={tag} onClick={() => setActiveFilter(tag)}
                className="h-9 px-4 rounded-full text-[13px] cursor-pointer border-none"
                style={activeFilter === tag
                  ? { background: '#0A2A3A', color: '#fff', fontWeight: 600 }
                  : { background: '#fff', border: '1px solid #E5E7EB', color: '#6B7280', fontWeight: 500 }}>
                {tag}
              </button>
            ))}
          </div>

          {/* Task rows */}
          <div className="flex flex-col">
            {filteredTasks.length === 0 && (
              <div className="text-center py-8">
                <ClipboardList size={36} className="text-[#ccedeb] mx-auto mb-2" />
                <p className="m-0 text-[#0a2a3a] text-[14px] font-semibold">No tasks found</p>
              </div>
            )}
            {filteredTasks.map((task, i) => {
              const sp = task.status === 'in-progress'
                ? { bg: '#FFF3E0', fg: '#9A5000', label: 'In Progress' }
                : task.status === 'incomplete'
                ? { bg: '#FFF0F0', fg: '#DC2626', label: 'Incomplete' }
                : { bg: '#F3F4F6', fg: '#6B7280', label: 'Available' };
              return (
                <div key={task.id}
                  className="flex items-center gap-4 py-3.5 pl-3.5 pr-5 rounded-[15px]"
                  style={i % 2 === 0 ? { background: '#D3EDE9' } : {}}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: '#0F7A70' }}>
                    <ClipboardList size={18} color="#fff" />
                  </div>
                  <p className="flex-1 min-w-0 m-0 text-[12px] font-medium text-[#0A2A3A] truncate">
                    {task.name || task.item}
                  </p>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[12px] font-semibold px-3 py-0.5 rounded-full"
                      style={{ background: sp.bg, color: sp.fg }}>
                      {sp.label}
                    </span>
                    <span className="text-[12px] text-[#0A2A3A]">
                      {task.destination || task.source || '—'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TABLET LAYOUT (lg–xl: 1024–1280 px)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex xl:hidden min-h-screen bg-[#D3EDE9]">

        <Sidebar mode="pantry" activePath="/manager-tasks" />

        <div className="lg:ml-[var(--sidebar-w)] flex-1 flex flex-col min-h-screen">

          {/* Pill header — avatar + "Tasks" label + Create Task button */}
          <div className="px-6 pt-5 pb-3">
            <PageHeader
              initials={initials}
              label="Tasks"
              action={{ label: "+ Create Task", onClick: () => navigate("/manager/create-task") }}
            />
          </div>

          {/* Single Active Tasks card */}
          <div className="px-6 pb-8">
            <div className="bg-white border border-[#e5e7eb] rounded-[20px] p-6 flex flex-col gap-4"
                 style={{ boxShadow: "0 8px 20px rgba(10,42,58,.05)" }}>

              {/* Card header: title + search */}
              <div className="flex items-center justify-between gap-4">
                <h2 className="m-0 text-[21px] font-semibold text-[#0a2a3a] leading-7">Active Tasks</h2>
                <div className="flex items-center gap-2 h-9 px-3 rounded-full border border-[#e5e7eb] bg-white"
                     style={{ width: 200, flexShrink: 0 }}>
                  <Search size={14} className="text-[#6b7280] shrink-0" />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="flex-1 min-w-0 border-0 outline-none bg-transparent text-[14px] font-medium text-[#0a2a3a] placeholder:text-[#6b7280]"
                  />
                </div>
              </div>

              {/* Filter chips — All / Warehouse / Kitchen / Clothing / Urgent */}
              <div className="flex flex-wrap gap-2">
                {['All', 'Warehouse', 'Kitchen', 'Clothing', 'Urgent'].map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setActiveFilter(f)}
                    className={`h-9 px-4 rounded-full border text-[13px] font-medium cursor-pointer transition-colors
                      ${activeFilter === f
                        ? 'bg-[#0a2a3a] text-white border-[#0a2a3a] font-semibold'
                        : 'bg-white text-[#6b7280] border-[#e5e7eb] hover:bg-[#f9fafb]'
                      }`}>
                    {f}
                  </button>
                ))}
              </div>

              {/* Column header */}
              <div className="bg-[#f9fafb] rounded-lg px-6 py-3">
                <span className="text-[12px] font-semibold tracking-wide text-[#6b7280] uppercase">Task Name</span>
              </div>

              {/* Task rows */}
              <div className="flex flex-col">
                {filteredTasks.map((task, i) => (
                  <div key={task.id}
                    className={`flex items-center gap-4 px-3 py-3.5 rounded-[15px] ${i % 2 === 0 ? 'bg-[#D3EDE9]' : ''}`}>
                    <div className="w-10 h-10 rounded-lg bg-[#0f7a70] flex items-center justify-center shrink-0 text-white">
                      <ClipboardList size={18} />
                    </div>
                    <p className="flex-1 min-w-0 text-[12px] font-medium leading-5 text-[#0a2a3a] m-0">
                      {task.name || task.item}
                    </p>
                    {task.destination && (
                      <span className="text-[12px] text-[#0a2a3a] shrink-0">{task.destination}</span>
                    )}
                    <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-[12px] font-semibold shrink-0 ${getStatusStyle(task.status)}`}>
                      {getStatusLabel(task.status)}
                    </span>
                    <div className="flex gap-2 shrink-0">
                      <button type="button" aria-label="Edit task"
                        className="w-7 h-7 rounded-lg bg-[#E6F5F3] flex items-center justify-center border-0 cursor-pointer hover:bg-[#D3EDE9] transition-colors">
                        <Pencil size={14} color="#0a2a3a" />
                      </button>
                      <button type="button" aria-label="Delete task"
                        className="w-7 h-7 rounded-lg bg-[#E6F5F3] flex items-center justify-center border-0 cursor-pointer hover:bg-[#D3EDE9] transition-colors">
                        <Trash2 size={14} color="#0a2a3a" />
                      </button>
                    </div>
                  </div>
                ))}
                {filteredTasks.length === 0 && (
                  <p className="text-center text-[13px] text-[#9ca3af] py-8 m-0">No tasks found</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          DESKTOP LAYOUT (xl+: 1280 px and up)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden xl:flex min-h-screen bg-[#D3EDE9]">

        <Sidebar mode="pantry" activePath="/manager-tasks" />

        {/* ── Main content ── */}
        <div className="xl:ml-[var(--sidebar-w)] flex-1 flex flex-col min-h-screen">

          {/* Pill header */}
          <div className="px-6 pt-5 pb-3">
            <PageHeader
              initials={initials}
              label="Tasks"
              action={{
                label: "+ Create Task",
                onClick: () => navigate("/manager/create-task"),
              }}
            />
          </div>

          {/* Hero stat summary */}
          <div className="px-6 pb-4">
            {(() => {
              const sparkline = computeSparkline(completedTasks);
              const yday = sparkline[sparkline.length - 2];
              const tod  = sparkline[sparkline.length - 1];
              const diff = tod - yday;
              const deltaText = diff === 0 ? "— same as yesterday"
                : diff > 0 ? `▲ ${diff} more than yesterday`
                : `▼ ${Math.abs(diff)} fewer than yesterday`;
              return (
                <DashboardHero sections={[
                  { label: "Active Tasks",    value: activeTasks,     delta: "tasks in queue",  chipTone: "brand",    bars: [11,18,14,25,21,32] },
                  { label: "In Progress",     value: inProgressTasks, delta: "being worked on", chipTone: "progress", bars: [11,18,14,25,21,32] },
                  { label: "Completed Today", value: completedToday,  delta: deltaText,          chipTone: "complete", bars: sparkline },
                ]} />
              );
            })()}
          </div>

          {/* Task planning table */}
          <div className="px-6 pb-8">
            <TaskTable
              tasks={activeTasks_}
              mode="planning"
              onEdit={openEdit}
              onRemove={deleteTask}
            />
          </div>
        </div>
      </div>

      {/* ── Edit Task Modal ─────────────────────────────────────────────────── */}
      {editingTask && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setEditingTask(null)} />
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                        bg-white w-[92vw] max-w-[480px] max-h-[90vh] overflow-y-auto"
            style={{ borderRadius: 20, boxShadow: "0 24px 60px rgba(10,42,58,0.28)",
                     fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-[#e5e7eb]">
              <div className="flex items-center gap-2">
                <Pencil size={18} color="#09665E" />
                <p style={{ font: "600 20px/26px 'Inter', sans-serif", color: "#09665E" }}>Edit Task</p>
              </div>
              <button onClick={() => setEditingTask(null)}
                style={{ border: 0, background: "none", cursor: "pointer", color: "#6B7280",
                         display: "grid", placeItems: "center", width: 28, height: 28, borderRadius: 8 }}>
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <div className="px-7 py-5 flex flex-col gap-5">

              {/* Task Name */}
              <div className="flex flex-col" style={{ gap: 6 }}>
                <label style={{ font: "600 11px/16px 'Inter', sans-serif", letterSpacing: "0.04em",
                                color: "#6B7280", textTransform: "uppercase" }}>
                  Task Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  style={{ width: "100%", height: 44, padding: "0 14px", border: "1px solid #E5E7EB",
                           borderRadius: 10, font: "400 14px/20px 'Inter', sans-serif", color: "#0A2A3A",
                           outline: "none", boxSizing: "border-box", transition: "border-color 120ms" }}
                  onFocus={e => (e.target.style.borderColor = "#09665E")}
                  onBlur={e  => (e.target.style.borderColor = "#E5E7EB")}
                />
              </div>

              {/* Source + Destination */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {[
                  { key: "source",      label: "Source",      placeholder: "Where to pick up from" },
                  { key: "destination", label: "Destination", placeholder: "Where it goes" },
                ].map(f => (
                  <div key={f.key} className="flex flex-col" style={{ gap: 6, minWidth: 0 }}>
                    <label style={{ font: "600 11px/16px 'Inter', sans-serif", letterSpacing: "0.04em",
                                    color: "#6B7280", textTransform: "uppercase" }}>
                      {f.label}
                    </label>
                    <input
                      type="text"
                      value={editForm[f.key]}
                      onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      style={{ width: "100%", height: 44, padding: "0 14px", border: "1px solid #E5E7EB",
                               borderRadius: 10, font: "400 14px/20px 'Inter', sans-serif", color: "#0A2A3A",
                               outline: "none", boxSizing: "border-box", transition: "border-color 120ms" }}
                      onFocus={e => (e.target.style.borderColor = "#09665E")}
                      onBlur={e  => (e.target.style.borderColor = "#E5E7EB")}
                    />
                  </div>
                ))}
              </div>

              {/* Special Instructions */}
              <div className="flex flex-col" style={{ gap: 6 }}>
                <label style={{ font: "600 11px/16px 'Inter', sans-serif", letterSpacing: "0.04em",
                                color: "#6B7280", textTransform: "uppercase" }}>
                  Special Instructions
                </label>
                <textarea
                  value={editForm.comments}
                  onChange={e => setEditForm(f => ({ ...f, comments: e.target.value }))}
                  placeholder="Any notes for volunteers..."
                  rows={2}
                  style={{ width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB",
                           borderRadius: 10, font: "400 14px/20px 'Inter', sans-serif", color: "#0A2A3A",
                           outline: "none", resize: "vertical", boxSizing: "border-box",
                           transition: "border-color 120ms", fontFamily: "inherit" }}
                  onFocus={e => (e.target.style.borderColor = "#09665E")}
                  onBlur={e  => (e.target.style.borderColor = "#E5E7EB")}
                />
              </div>

              {/* Priority — segmented 3-option row, each with its own active color */}
              <div className="flex flex-col" style={{ gap: 6 }}>
                <label style={{ font: "600 11px/16px 'Inter', sans-serif", letterSpacing: "0.04em",
                                color: "#6B7280", textTransform: "uppercase" }}>
                  Priority
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  {PRIORITY_OPTIONS.map(p => {
                    const active = editForm.priority === p;
                    const activeStyle =
                      p === 'Urgent' ? { background: "#FFF0F0", borderColor: "#FFF0F0", color: "#DC2626" } :
                      p === 'High'   ? { background: "#FFF3E0", borderColor: "#FFF3E0", color: "#9A5000" } :
                                       { background: "#E6F5F3", borderColor: "#E6F5F3", color: "#09665E" };
                    return (
                      <button key={p} type="button"
                        onClick={() => setEditForm(f => ({ ...f, priority: p }))}
                        style={{
                          flex: 1, height: 40, borderRadius: 10, cursor: "pointer",
                          font: `${active ? 600 : 500} 14px/20px 'Inter', sans-serif`,
                          border: `1px solid ${active ? activeStyle.borderColor : "#E5E7EB"}`,
                          background: active ? activeStyle.background : "#FFFFFF",
                          color: active ? activeStyle.color : "#6B7280",
                          transition: "background 120ms, color 120ms, border-color 120ms",
                        }}>
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tags — teal-tint when selected, no checkmark */}
              <div className="flex flex-col" style={{ gap: 6 }}>
                <label style={{ font: "600 11px/16px 'Inter', sans-serif", letterSpacing: "0.04em",
                                color: "#6B7280", textTransform: "uppercase" }}>
                  Tags
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {ALL_TAGS.map(tag => {
                    const on = editForm.tags.includes(tag);
                    return (
                      <button key={tag} type="button"
                        onClick={() => toggleEditTag(tag)}
                        style={{
                          height: 32, padding: "0 14px", borderRadius: 9999, cursor: "pointer",
                          font: `${on ? 600 : 500} 13px/18px 'Inter', sans-serif`,
                          border: `1px solid ${on ? "#E6F5F3" : "#E5E7EB"}`,
                          background: on ? "#E6F5F3" : "#FFFFFF",
                          color: on ? "#09665E" : "#6B7280",
                          transition: "background 120ms, color 120ms, border-color 120ms",
                        }}>
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, padding: "0 28px 28px" }}>
              <button onClick={() => setEditingTask(null)}
                style={{ height: 44, padding: "0 20px", borderRadius: 9999,
                         border: "1px solid #E5E7EB", background: "#FFFFFF", color: "#0A2A3A",
                         font: "600 14px/20px 'Inter', sans-serif", cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={saveEdit}
                style={{ height: 44, padding: "0 20px", borderRadius: 9999,
                         border: "none", background: "#09665E", color: "#FFFFFF",
                         font: "600 14px/20px 'Inter', sans-serif", cursor: "pointer" }}>
                Save Changes
              </button>
            </div>
          </div>
        </>
      )}
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
  const { initials } = useAuth();
  const [rows, setRows] = useState([emptyRow(), emptyRow(), emptyRow()]);
  const [publishing, setPublishing] = useState(false);
  const [done, setDone] = useState(false);
  const [generalNotes, setGeneralNotes] = useState("");
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
      <div style={{ background: 'linear-gradient(143deg, #0f7a70 14%, #0a2a3a 86%)', borderRadius: '0 0 28px 28px', marginBottom: 8 }}>
        <MobileNav mode="pantry" />
      </div>

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
              onClick={() => item === "History" ? navigate("/manager-history") : undefined}>
              <span className="text-[#767676] text-[16px] font-semibold">{item}</span>
            </div>
          ))}
        </nav>

        {/* User info */}
        <div className="mt-auto px-4 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0d9488] flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-semibold">{initials}</span>
            </div>
            <div>
              <p className="text-[#b3b3b3] text-[16px] font-semibold leading-tight">{displayName}</p>
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

        {/* Pill header */}
        <div className="px-6 pt-5 pb-3 shrink-0">
          <PageHeader
            initials={initials}
            showBack={true}
            onBack={onBack}
            label="Create Task"
            action={{ label: "Done", onClick: handleDone }}
          />
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
