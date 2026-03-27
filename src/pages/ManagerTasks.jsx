// ManagerTasks.jsx — Task list screen + bulk create task screen
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

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
  const [rows, setRows] = useState([emptyRow(), emptyRow(), emptyRow()]);
  const [publishing, setPublishing] = useState(false);
  const [done, setDone] = useState(false);

  function updateRow(id, field, value) {
    setRows(rows => rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  }

  // When item is selected from suggestion, auto-fill source, destination, action
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

  function addRow() {
    setRows(r => [...r, emptyRow()]);
  }

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
      <div style={{ background: "white", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 32, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <div style={{ fontSize: 56 }}>✅</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: GRAY.dark }}>{filledCount} Tasks Published!</div>
        <div style={{ fontSize: 14, color: GRAY.soft, textAlign: "center" }}>Tasks are now live on the volunteer boards</div>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button onClick={() => { setDone(false); setRows([emptyRow(), emptyRow(), emptyRow()]); }}
            style={{ padding: "11px 20px", background: "white", color: GRAY.dark, border: `2px solid ${GRAY.border}`, borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            + Add More
          </button>
          <button onClick={onBack}
            style={{ padding: "11px 20px", background: GRAY.dark, color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            ← Back to Tasks
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: GRAY.bg, minHeight: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif", paddingBottom: 100 }}>

      {/* Header */}
      <div style={{ background: GRAY.mid, padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer" }}>← Back</button>
        <div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Operations Manager</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "white" }}>Create Tasks</div>
        </div>
      </div>

      <div style={{ padding: "16px 12px" }}>
        <div style={{ fontSize: 13, color: GRAY.soft, marginBottom: 14 }}>
          Fill in as many tasks as needed. Start typing an item to see suggestions.
        </div>

        {/* Column headers */}
        <div style={{ display: "grid", gridTemplateColumns: "30px 1.4fr 1fr 1fr 0.8fr 0.9fr 0.7fr 1fr 30px", gap: 4, padding: "6px 4px", marginBottom: 4 }}>
          {["#", "ITEM ✦", "SOURCE", "DESTINATION", "ACTION", "ASSIGN TO", "PRIORITY", "TAGS", ""].map((h, i) => (
            <div key={i} style={{ fontSize: 9, fontWeight: 700, color: GRAY.light, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: i === 0 || i === 8 ? "center" : "left" }}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {rows.map((row, idx) => (
            <div key={row.id} style={{ background: "white", borderRadius: 8, border: `1px solid ${row.item ? GRAY.border : "#F3F4F6"}`, padding: "8px 6px", transition: "border 0.15s" }}>

              {/* Main grid row */}
              <div style={{ display: "grid", gridTemplateColumns: "30px 1.4fr 1fr 1fr 0.8fr 0.9fr 0.7fr 1fr 30px", gap: 4, alignItems: "start" }}>

                {/* Row number */}
                <div style={{ textAlign: "center", fontSize: 11, color: GRAY.light, paddingTop: 8, fontWeight: 600 }}>{idx + 1}</div>

                {/* Item — with autocomplete + auto-fill */}
                <AutoInput
                  value={row.item}
                  onChange={v => updateRow(row.id, "item", v)}
                  onSelect={s => handleItemSelect(row.id, s)}
                  suggestions={ITEM_SUGGESTIONS.map(i => i.item)}
                  placeholder="Item name…"
                  style={{ fontWeight: row.item ? 600 : 400 }}
                />

                {/* Source */}
                <AutoInput value={row.source} onChange={v => updateRow(row.id, "source", v)} suggestions={SOURCE_SUGGESTIONS} placeholder="From…" />

                {/* Destination */}
                <AutoInput value={row.destination} onChange={v => updateRow(row.id, "destination", v)} suggestions={DEST_SUGGESTIONS} placeholder="To / Rack…" />

                {/* Action */}
                <AutoInput value={row.action} onChange={v => updateRow(row.id, "action", v)} suggestions={ACTION_SUGGESTIONS} placeholder="Action…" />

                {/* Assign to */}
                <select value={row.assignTo} onChange={e => updateRow(row.id, "assignTo", e.target.value)}
                  style={{ width: "100%", padding: "7px 6px", border: `1px solid ${GRAY.border}`, borderRadius: 6, fontSize: 12, color: GRAY.dark, background: "white", outline: "none", fontFamily: "inherit" }}>
                  {ASSIGN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>

                {/* Priority */}
                <select value={row.priority} onChange={e => updateRow(row.id, "priority", e.target.value)}
                  style={{ width: "100%", padding: "7px 6px", border: `1px solid ${GRAY.border}`, borderRadius: 6, fontSize: 12, color: GRAY.dark, background: "white", outline: "none", fontFamily: "inherit" }}>
                  {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>

                {/* Tags */}
                <TagsCell tags={row.tags} onChange={v => updateRow(row.id, "tags", v)} />

                {/* Remove row */}
                <button onClick={() => removeRow(row.id)}
                  style={{ textAlign: "center", background: "none", border: "none", color: GRAY.light, cursor: "pointer", fontSize: 16, paddingTop: 6 }}
                  title="Remove row">
                  ×
                </button>
              </div>

              {/* Special instructions input — below the grid */}
              <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px dashed ${GRAY.border}`, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, flexShrink: 0 }}>📝</span>
                <input
                  value={row.comments}
                  onChange={e => updateRow(row.id, "comments", e.target.value)}
                  placeholder="Special instructions for volunteer (optional)…"
                  style={{ flex: 1, border: "none", outline: "none", fontSize: 12, color: row.comments ? GRAY.dark : GRAY.light, background: "transparent", fontFamily: "inherit" }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Add row */}
        <button onClick={addRow}
          style={{ width: "100%", marginTop: 8, padding: "10px 0", background: "white", border: `2px dashed ${GRAY.border}`, borderRadius: 8, fontSize: 13, color: GRAY.soft, cursor: "pointer", fontWeight: 600 }}>
          + Add Row
        </button>

        {/* Comments for whole batch — optional */}
        <div style={{ marginTop: 16, background: "white", borderRadius: 10, border: `1px solid ${GRAY.border}`, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: GRAY.light, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>General Notes (optional)</div>
          <textarea placeholder="Any notes for all volunteers today…" rows={2}
            style={{ width: "100%", border: "none", outline: "none", fontSize: 13, color: GRAY.dark, resize: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
        </div>
      </div>

      {/* Sticky Done button */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 480, margin: "0 auto", padding: "12px 16px", background: "white", borderTop: `1px solid ${GRAY.border}` }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ flex: 1, fontSize: 12, color: GRAY.soft }}>
            {filledCount > 0 ? `${filledCount} task${filledCount > 1 ? "s" : ""} ready to publish` : "Fill in at least one item"}
          </div>
          <button onClick={handleDone} disabled={filledCount === 0 || publishing}
            style={{ padding: "13px 28px", background: filledCount > 0 && !publishing ? GRAY.dark : "#D1D5DB", color: "white", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: filledCount > 0 && !publishing ? "pointer" : "not-allowed", whiteSpace: "nowrap" }}>
            {publishing ? "Publishing…" : `Done — Publish ${filledCount > 0 ? filledCount : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
