// CreateTask.jsx — Spreadsheet-style multi-task creator
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { ChevronLeft, Plus, X, ChevronDown, ChevronUp } from "lucide-react";

// ─── REAL DATA seeded from Jason's task sheets (2021–2026) ──────────────────
const ITEMS_DB = [
  // Warm Shelves
  { item: "Coffee", defaultDest: "Rack 7", defaultAction: "Fill", defaultSource: "Warehouse" },
  { item: "Cereal", defaultDest: "Rack 9", defaultAction: "Front up", defaultSource: "Warehouse" },
  { item: "Canned Vegetables", defaultDest: "Canned Veggies Rack", defaultAction: "Fill", defaultSource: "Misc veggie pallets in warehouse" },
  { item: "Canned Fruit", defaultDest: "Canned Fruit Rack", defaultAction: "Fill", defaultSource: "Pallet in front of rack" },
  { item: "Canned Beans", defaultDest: "Beans Rack", defaultAction: "Fill", defaultSource: "Warehouse" },
  { item: "Canned Meat / Tuna", defaultDest: "Canned Meat Rack", defaultAction: "Fill", defaultSource: "Random bean pallet in warehouse" },
  { item: "Pasta / Spaghetti", defaultDest: "Pasta Rack", defaultAction: "Fill", defaultSource: "Warehouse" },
  { item: "Spaghetti Sauce", defaultDest: "Rack 3", defaultAction: "Fill", defaultSource: "Warehouse" },
  { item: "Hawaiian Rolls", defaultDest: "Rack 3", defaultAction: "Add", defaultSource: "Rollers by loading dock in warehouse" },
  { item: "Peanut Butter", defaultDest: "Rack 18", defaultAction: "Move", defaultSource: "Rack 15" },
  { item: "Great Northern Beans (silver bags)", defaultDest: "Rack 15", defaultAction: "Fill", defaultSource: "Donation bins in warehouse" },
  { item: "Ramen Noodles", defaultDest: "Rack 22", defaultAction: "Fill", defaultSource: "Warehouse", defaultComments: "Rubber band 2 together. Rubber bands next to sink in warehouse." },
  { item: "Chips", defaultDest: "Rack 25", defaultAction: "Fill", defaultSource: "Warehouse", defaultComments: "No pretzels" },
  { item: "Crackers", defaultDest: "Crackers Rack", defaultAction: "Fill", defaultSource: "Warehouse", defaultComments: "Bag into clear bags and twist-tie" },
  { item: "Soup", defaultDest: "Soup Rack", defaultAction: "Fill", defaultSource: "Warehouse" },
  { item: "Mac N Cheese", defaultDest: "Mac N Cheese Rack", defaultAction: "Fill", defaultSource: "Black collapsible totes on empty pallets" },
  { item: "Box Meals / Boxed Mashed Potatoes", defaultDest: "Box Meal Rack", defaultAction: "Fill", defaultSource: "Warehouse" },
  { item: "Oatmeal", defaultDest: "Oatmeal Rack", defaultAction: "Front & Fill", defaultSource: "Warehouse" },
  { item: "Nutri Grain Bars / Kind Bars", defaultDest: "Protein Bar Rack", defaultAction: "Fill", defaultSource: "Warehouse" },
  { item: "Cookies", defaultDest: "Cookies Rack", defaultAction: "Front up", defaultSource: "Warehouse", defaultComments: "Move down from top shelf, up from bottom to center racks" },
  { item: "Gummies / Candy", defaultDest: "Rack 14", defaultAction: "Fill", defaultSource: "Warehouse", defaultComments: "Bag gummies into 4-packs" },
  { item: "Popcorn / Misc Chips", defaultDest: "Chip Tower", defaultAction: "Fill to the max", defaultSource: "Pallet by racks in pantry" },
  { item: "Beef Stock", defaultDest: "Rack 20", defaultAction: "Front up", defaultSource: "Warehouse" },
  { item: "Drug Store / Household Items", defaultDest: "Drug Store Racks", defaultAction: "Fill", defaultSource: "Large gaylords near tall stack of empty gaylords in back of warehouse" },
  { item: "Lysol Wipes / Household", defaultDest: "Household Rack", defaultAction: "Fill", defaultSource: "Pallet behind blue carts" },
  { item: "Baby Food / Baby Formula", defaultDest: "Baby Food Rack", defaultAction: "Fill", defaultSource: "Blue cart by garage door", defaultComments: "Top two shelves with formula" },
  { item: "Misc Rack Items", defaultDest: "Misc Rack", defaultAction: "Fill", defaultSource: "Donation bins behind tables in warehouse", defaultComments: "No drinks" },
  { item: "Graham Cracker Crumbs", defaultDest: "Graham Cracker Rack", defaultAction: "Front & Fill", defaultSource: "Warehouse" },
  // Refrigerated
  { item: "Yogurt", defaultDest: "Door 1", defaultAction: "Fill", defaultSource: "Walk-in fridge", defaultComments: "Check expiration dates, oldest in front" },
  { item: "Specialty Bread", defaultDest: "Door 2", defaultAction: "Fill", defaultSource: "Warehouse" },
  { item: "Iced Coffee", defaultDest: "Door 3", defaultAction: "Fill", defaultSource: "Walk-in fridge" },
  { item: "Pineapple Juice", defaultDest: "Door 4", defaultAction: "Fill", defaultSource: "Walk-in fridge" },
  { item: "V8 Juice", defaultDest: "Door 5", defaultAction: "Fill", defaultSource: "Warehouse" },
  { item: "Eggs", defaultDest: "Door 5 & 6", defaultAction: "Back-fill with new", defaultSource: "Tall pallet in walk-in fridge", defaultComments: "Rotate — new behind existing. Do NOT take from back corner pallet with sign." },
  { item: "Fairlife Milk / 1 Gallon Jugs", defaultDest: "Door 7", defaultAction: "Fill", defaultSource: "Walk-in fridge" },
  { item: "Hashbrowns", defaultDest: "Door 7", defaultAction: "Fill", defaultSource: "Walk-in fridge" },
  { item: "Misc Cold Items", defaultDest: "Door 8 & 9", defaultAction: "Fill", defaultSource: "Plastic milk crates in walk-in fridge" },
  { item: "Pickles (glass jars)", defaultDest: "Door 9", defaultAction: "Fill", defaultSource: "Warehouse" },
  { item: "Coconut Milk", defaultDest: "Door 1", defaultAction: "Fill", defaultSource: "Walk-in fridge" },
  { item: "Gatorade (white cases)", defaultDest: "Door 2", defaultAction: "Fill", defaultSource: "Warehouse" },
  { item: "Starbucks Creamer", defaultDest: "Door 5", defaultAction: "Fill", defaultSource: "Walk-in fridge" },
  { item: "Cheese / American Cheese Singles", defaultDest: "Door 4", defaultAction: "Fill", defaultSource: "Walk-in fridge" },
  { item: "Kombucha", defaultDest: "Door 4", defaultAction: "Fill", defaultSource: "Walk-in fridge" },
  // Frozen
  { item: "Random Frozen Items", defaultDest: "Door 12", defaultAction: "Fill", defaultSource: "Green shelf in walk-in freezer", defaultComments: "Bag small items together" },
  { item: "Ham", defaultDest: "Door 13", defaultAction: "Fill", defaultSource: "Walk-in freezer" },
  { item: "Chicken / Beef / Seafood / Pork", defaultDest: "Doors 15–17", defaultAction: "Fill", defaultSource: "Walk-in freezer pallets", defaultComments: "Pull pallets and fill doors accordingly" },
  { item: "Large Meats", defaultDest: "Door 18", defaultAction: "Fill", defaultSource: "Walk-in freezer" },
  { item: "Veggie Lasagna / Stuffing", defaultDest: "Door 10", defaultAction: "Fill", defaultSource: "Lilly Pallets in walk-in freezer" },
  { item: "Pizzas / Sandwiches", defaultDest: "Door 12", defaultAction: "Fill", defaultSource: "Green shelves in walk-in freezer" },
  // General
  { item: "Cardboard Boxes", defaultDest: "Recycling wheel barrel / dumpster", defaultAction: "Flatten and throw out", defaultSource: "Pantry floor", defaultComments: "When full, throw into dumpsters on LEFT out back" },
  { item: "Wooden Pallets", defaultDest: "Next to dumpster", defaultAction: "Pile", defaultSource: "Warehouse floor", defaultComments: "Go high! Not blue, red or plastic pallets" },
  { item: "Trash Cans", defaultDest: "Warehouse", defaultAction: "Empty", defaultSource: "Warehouse" },
  { item: "Donation Bins", defaultDest: "Pantry racks", defaultAction: "Sort and put out", defaultSource: "Tables in warehouse" },
  { item: "Shopping Boxes", defaultDest: "Front of window at pantry entrance", defaultAction: "Save and place", defaultSource: "Warehouse", defaultComments: "Must fit in grocery cart" },
];

const PRIORITY = ["Normal", "High", "Urgent"];

const ALL_TAGS = ["Warehouse", "Fridge", "Freezer", "Sorting", "Produce", "Delivery", "Shift Leader", "Warm", "Cool", "Kitchen", "Clothing", "General"];

// Determines which task pool the task lands in
const ASSIGN_OPTIONS = [
  { id: "",            label: "Anyone" },
  { id: "experienced", label: "Experienced Volunteers" },
  { id: "new",         label: "New Volunteers" },
];

const SOURCE_SUGGESTIONS  = [...new Set(ITEMS_DB.map(i => i.defaultSource).filter(Boolean))];
const DEST_SUGGESTIONS    = [...new Set(ITEMS_DB.map(i => i.defaultDest).filter(Boolean))];
const ACTION_SUGGESTIONS  = [...new Set(ITEMS_DB.map(i => i.defaultAction).filter(Boolean))];
const ITEM_NAMES          = ITEMS_DB.map(i => i.item);

// ─── Kept for future use ─────────────────────────────────────────────────────
async function parseWithAI(sentence) {
  const names = ITEMS_DB.map(i => i.item).join(", ");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `Parse this food pantry task for the IMPACT Center in Indianapolis.
Known items: ${names}

Task: "${sentence}"

Return ONLY valid JSON (no markdown):
{"item":"","action":"Fill|Front up|Move|Stock|Sort|Organize|Flatten|Empty|Back-fill|Add|Remove|Bag up|Pile|Rotate","source":"","destination":"","comments":"","estimatedTime":"~10 min|~15 min|~20 min|~30 min","priority":"Normal|High|Urgent"}

Use "" for unknown fields. Priority: Urgent=urgent/asap/now, High=important/high/first, else Normal.`
      }]
    })
  });
  const data = await res.json();
  try { return JSON.parse((data.content?.[0]?.text || "{}").replace(/```json|```/g, "").trim()); }
  catch { return null; }
}

// ─── Row factory ─────────────────────────────────────────────────────────────
let _id = 0;
function newRow() {
  return {
    _id: ++_id,
    item: "", source: "", destination: "", action: "",
    assignTo: "", priority: "Normal", tags: [],
    specialInstructions: "",
    showInstructions: false,
  };
}

const TODAY = new Date().toLocaleDateString("en-US", {
  weekday: "short", month: "short", day: "numeric", year: "numeric",
});

// ─── Column header widths (shared between header + rows) ─────────────────────
const COLS = "32px 1.4fr 1fr 1fr 0.8fr 130px 90px 1fr 36px";

const colHeaders = ["#", "Item", "Source", "Destination", "Action", "Assign To", "Priority", "Tags", ""];

// ─── Autocomplete text input ──────────────────────────────────────────────────
function AutoInput({ value, onChange, onSelect, suggestions, placeholder }) {
  const [open, setOpen] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const ref = useRef(null);

  function handleChange(val) {
    onChange(val);
    const q = val.toLowerCase();
    setFiltered(q.length > 0 ? suggestions.filter(s => s.toLowerCase().includes(q)).slice(0, 6) : []);
    setOpen(true);
  }

  function handlePick(s) {
    onSelect ? onSelect(s) : onChange(s);
    setOpen(false);
    setFiltered([]);
  }

  useEffect(() => {
    function handleOutside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <input
        value={value}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => { if (filtered.length > 0) setOpen(true); }}
        placeholder={placeholder}
        className="w-full border-0 bg-transparent text-[13px] text-[#0a2a3a]
          focus:outline-none focus:bg-[#f0fafa] rounded px-2 py-1.5
          placeholder:text-[#d1d5db]"
      />
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-20 bg-white border border-[#e5e7eb]
          rounded-lg shadow-md overflow-hidden mt-0.5">
          {filtered.map((s, i) => (
            <div key={i} onClick={() => handlePick(s)}
              className="px-3 py-2 text-[13px] text-[#1f2937] cursor-pointer hover:bg-[#f9fafb]
                border-b border-[#e5e7eb] last:border-b-0">
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tag multi-select cell (click to open dropdown with predefined tags) ─────
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
        style={{ minHeight: 34, padding: "4px 6px", border: "1px solid #e5e7eb", borderRadius: 6,
          cursor: "pointer", display: "flex", flexWrap: "wrap", gap: 3, alignItems: "flex-start",
          background: "white", boxSizing: "border-box" }}
        onMouseEnter={e => e.currentTarget.style.borderColor = "#6b7280"}
        onMouseLeave={e => e.currentTarget.style.borderColor = "#e5e7eb"}
      >
        {tags.length === 0
          ? <span style={{ fontSize: 11, color: "#9ca3af", lineHeight: "26px", paddingLeft: 2 }}>+ Tags</span>
          : tags.map(tag => (
              <span key={tag} style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 10,
                background: "#e5e7eb", color: "#374151", whiteSpace: "nowrap" }}>{tag}</span>
            ))
        }
      </div>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 200, background: "white",
          border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          width: 164, marginTop: 2, maxHeight: 240, overflowY: "auto" }}>
          {ALL_TAGS.map(tag => (
            <div key={tag} onClick={() => toggleTag(tag)}
              style={{ padding: "7px 10px", fontSize: 12, cursor: "pointer", display: "flex",
                alignItems: "center", gap: 7, background: tags.includes(tag) ? "#f9fafb" : "white" }}
              onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
              onMouseLeave={e => e.currentTarget.style.background = tags.includes(tag) ? "#f9fafb" : "white"}
            >
              <span style={{ width: 14, height: 14, borderRadius: 3, border: "1.5px solid #e5e7eb",
                background: tags.includes(tag) ? "#1f2937" : "white", display: "flex",
                alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {tags.includes(tag) && <span style={{ fontSize: 9, color: "white", lineHeight: 1 }}>✓</span>}
              </span>
              <span style={{ color: "#1f2937", fontWeight: tags.includes(tag) ? 600 : 400 }}>{tag}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Row component (module-level to avoid remount on parent re-render) ────────
function TaskRow({ row, index, onUpdate, onRemove, onItemSelect }) {
  return (
    <>
      {/* Main data cells */}
      <div
        className="grid items-center border-b border-[#f3f4f6] hover:bg-[#fafafa] transition-colors"
        style={{ gridTemplateColumns: COLS }}
      >
        {/* # */}
        <span className="text-[#9ca3af] text-[13px] text-center select-none">{index + 1}</span>

        {/* Item — autocomplete against known item names, onSelect auto-fills other fields */}
        <AutoInput
          value={row.item}
          onChange={v => onUpdate("item", v)}
          onSelect={onItemSelect}
          suggestions={ITEM_NAMES}
          placeholder="Item name…"
        />

        {/* Source */}
        <AutoInput
          value={row.source}
          onChange={v => onUpdate("source", v)}
          suggestions={SOURCE_SUGGESTIONS}
          placeholder="Source…"
        />

        {/* Destination */}
        <AutoInput
          value={row.destination}
          onChange={v => onUpdate("destination", v)}
          suggestions={DEST_SUGGESTIONS}
          placeholder="Destination…"
        />

        {/* Action */}
        <AutoInput
          value={row.action}
          onChange={v => onUpdate("action", v)}
          suggestions={ACTION_SUGGESTIONS}
          placeholder="Action…"
        />

        {/* Assign To */}
        <select value={row.assignTo} onChange={e => onUpdate("assignTo", e.target.value)}
          className="border border-[#e5e7eb] rounded-lg px-2 py-1.5 text-[13px]
            text-[#0a2a3a] bg-white focus:outline-none focus:ring-1
            focus:ring-[#0d9488] mx-1">
          {ASSIGN_OPTIONS.map(v => (
            <option key={v.id} value={v.id}>{v.label}</option>
          ))}
        </select>

        {/* Priority */}
        <select value={row.priority} onChange={e => onUpdate("priority", e.target.value)}
          className="border border-[#e5e7eb] rounded-lg px-2 py-1.5 text-[13px]
            text-[#0a2a3a] bg-white focus:outline-none focus:ring-1
            focus:ring-[#0d9488]">
          {PRIORITY.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        {/* Tags */}
        <div className="px-1">
          <TagsCell
            tags={row.tags}
            onChange={newTags => onUpdate("tags", newTags)}
          />
        </div>

        {/* Delete */}
        <button onClick={onRemove}
          className="text-[#dc2626] hover:bg-[#fff0f0] rounded p-1 transition-colors
            bg-transparent border-none cursor-pointer mx-auto flex items-center justify-center">
          <X size={14} />
        </button>
      </div>

      {/* Special instructions row */}
      <div className="px-10 py-1 border-b border-[#f3f4f6] bg-white">
        <button
          onClick={() => onUpdate("showInstructions", !row.showInstructions)}
          className="text-[#0d9488] text-[12px] hover:text-[#09665e] cursor-pointer
            bg-transparent border-none flex items-center gap-1">
          {row.showInstructions
            ? <><ChevronUp size={12} />Hide special instructions</>
            : <><ChevronDown size={12} />Add special instructions</>
          }
        </button>
        {row.showInstructions && (
          <input
            value={row.specialInstructions}
            onChange={e => onUpdate("specialInstructions", e.target.value)}
            placeholder="Special instructions for this task…"
            className="w-full mt-1.5 border-0 bg-transparent text-[13px] text-[#0a2a3a]
              focus:outline-none focus:bg-[#f0fafa] rounded px-2 py-1.5
              placeholder:text-[#d1d5db]"
          />
        )}
      </div>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CreateTask({ onBack, onPublish, onPublishAll }) {
  const navigate   = useNavigate();
  const [rows, setRows] = useState([newRow()]);
  const [generalNotes, setGeneralNotes] = useState("");

  // ── Row helpers ──────────────────────────────────────────────────────────────
  function addRow() {
    setRows(prev => [...prev, newRow()]);
  }

  function removeRow(id) {
    setRows(prev => prev.length === 1 ? [newRow()] : prev.filter(r => r._id !== id));
  }

  function updateField(id, field, value) {
    setRows(prev => prev.map(r => r._id !== id ? r : { ...r, [field]: value }));
  }

  function handleItemSelect(id, itemName) {
    const match = ITEMS_DB.find(s => s.item === itemName);
    if (match) {
      setRows(prev => prev.map(r => r._id !== id ? r : {
        ...r,
        item:                match.item,
        source:              r.source      || match.defaultSource  || "",
        destination:         r.destination || match.defaultDest    || "",
        action:              r.action      || match.defaultAction  || "",
        specialInstructions: r.specialInstructions || match.defaultComments || "",
      }));
    }
  }

  // ── Publish ──────────────────────────────────────────────────────────────────
  function handlePublish() {
    const filled = rows.filter(r => r.item.trim());
    if (!filled.length) return;
    const payload = filled.map(r => ({
      item:        r.item,
      action:      r.action,
      source:      r.source,
      destination: r.destination,
      comments:    r.specialInstructions,
      assignTo:    r.assignTo,
      priority:    r.priority,
      tags:        r.tags,
    }));
    if (onPublishAll) onPublishAll(payload);
    else if (onPublish) onPublish(payload[0]);
  }

  const hasItems = rows.some(r => r.item.trim());

  // ── Shared form — called as a function (not JSX component) to avoid remount ──
  function renderFormContent(isMobile = false) {
    return (
      <div className={`${isMobile ? "px-4 py-4 pb-28" : "px-6 py-6 pb-24"}`}>

        {/* Form card */}
        <div className="bg-white rounded-xl border border-[#e5e7eb]">

          {/* Card header hint */}
          <div className="px-6 py-4 border-b border-[#e5e7eb] bg-[#f9fafb] rounded-t-xl">
            <p className="text-[#6b7280] text-[13px]">
              Fill in as many tasks as needed. Start typing an item to see suggestions.
            </p>
          </div>

          {/* Column headers */}
          <div
            className="bg-[#f9fafb] border-b border-[#e5e7eb] grid"
            style={{ gridTemplateColumns: COLS }}
          >
            {colHeaders.map((h, i) => (
              <p key={i} className="px-2 py-2.5 text-[11px] text-[#6b7280] uppercase tracking-wide">
                {h}
              </p>
            ))}
          </div>

          {/* Task rows */}
          {rows.map((row, index) => (
            <TaskRow
              key={row._id}
              row={row}
              index={index}
              onUpdate={(field, value) => updateField(row._id, field, value)}
              onRemove={() => removeRow(row._id)}
              onItemSelect={name => handleItemSelect(row._id, name)}
            />
          ))}
        </div>

        {/* Add Row */}
        <button
          onClick={addRow}
          className="w-full mt-4 border-2 border-dashed border-[#e5e7eb] rounded-xl py-3
            text-[#6b7280] text-[13px] hover:border-[#0d9488] hover:text-[#0d9488]
            transition-colors flex items-center justify-center gap-2
            bg-transparent cursor-pointer">
          <Plus size={15} />
          Add Row
        </button>

        {/* General Notes */}
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-4 mt-4">
          <p className="text-[#6b7280] text-[11px] uppercase tracking-wide mb-2">
            General Notes (Optional)
          </p>
          <textarea
            value={generalNotes}
            onChange={e => setGeneralNotes(e.target.value)}
            placeholder="Any notes for the whole session…"
            className="w-full border-0 bg-transparent text-[13px] text-[#0a2a3a]
              resize-none focus:outline-none placeholder:text-[#d1d5db] min-h-[80px]"
          />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ════════════════════════════════════════════════════════════════════════
          MOBILE LAYOUT
      ════════════════════════════════════════════════════════════════════════ */}
      <div
        className="lg:hidden min-h-screen bg-[#f5f5f5]"
        style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}
      >
        {/* Mobile top bar */}
        <div className="bg-[#0a2a3a] px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
          <button
            onClick={() => onBack ? onBack() : navigate("/manager/dashboard")}
            className="text-white bg-transparent border-none cursor-pointer p-0">
            <ChevronLeft size={20} />
          </button>
          <div>
            <p className="text-[#0d9488] text-[10px] uppercase tracking-widest">Operations Manager</p>
            <p className="text-white text-[18px] font-semibold leading-tight">Create Tasks</p>
          </div>
        </div>

        {/* Scrollable table on mobile */}
        <div className="overflow-x-auto">
          <div style={{ minWidth: 700 }}>
            {renderFormContent(true)}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          DESKTOP LAYOUT
      ════════════════════════════════════════════════════════════════════════ */}
      <div
        className="hidden lg:flex min-h-screen bg-[#f5f5f5]"
        style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}
      >
        <Sidebar mode="pantry" activePath="/create-task" />

        <div className="lg:ml-[220px] flex-1 flex flex-col min-h-screen">

          {/* Top bar */}
          <div className="bg-white border-b border-[#e5e7eb] h-16 flex items-center
            justify-between px-6 sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onBack ? onBack() : navigate("/manager/dashboard")}
                className="text-[#6b7280] hover:text-[#0a2a3a] transition-colors
                  bg-transparent border-none cursor-pointer p-0">
                <ChevronLeft size={20} />
              </button>
              <div>
                <p className="text-[#0d9488] text-[10px] uppercase tracking-widest">
                  Operations Manager
                </p>
                <h1 className="text-[22px] font-semibold text-[#0a2a3a] tracking-tight leading-tight">
                  Create Tasks
                </h1>
              </div>
            </div>
            <span className="text-[#6b7280] text-[13px]">{TODAY}</span>
          </div>

          {renderFormContent(false)}
        </div>
      </div>

      {/* ── Fixed bottom bar (shared) ─────────────────────────────────────────── */}
      <div
        className="fixed bottom-0 right-0 left-0 lg:left-[220px] bg-white
          border-t border-[#e5e7eb] px-6 py-3 flex items-center justify-between z-20">
        <p className="text-[#6b7280] text-[13px]">
          {!hasItems ? "Fill in at least one item" : ""}
        </p>
        <button
          onClick={handlePublish}
          disabled={!hasItems}
          className={`bg-[#09665e] text-white px-6 py-2.5 rounded-xl text-[14px]
            font-semibold border-none transition-colors
            ${hasItems
              ? "hover:bg-[#0d9488] cursor-pointer"
              : "opacity-40 cursor-not-allowed"
            }`}>
          Done — Publish
        </button>
      </div>
    </>
  );
}
