import { useState } from "react";

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

const COMMON_TASKS = [
  "Fill Coffee → Rack 7 from warehouse",
  "Front up Cereal → Rack 9",
  "Move Peanut Butter to Rack 18, fill Rack 15 with silver bags of beans",
  "Fill Yogurt → Door 1 from walk-in fridge, check expiry dates",
  "Fill Eggs → Door 5 & 6 from tall pallet in walk-in fridge, rotate old to front",
  "Fill Chips → Rack 25, no pretzels",
  "Empty Trash Cans in Warehouse",
  "Sort Donation Bins by tables in warehouse",
  "Fill Ramen → Rack 22, rubber band 2 together",
];

const PRIORITY = ["Normal", "High", "Urgent"];
const VOLUNTEERS = [
  { id: "", name: "Leave open — anyone can claim" },
  { id: "1001", name: "Maria S." },
  { id: "1002", name: "Carlos T." },
  { id: "1003", name: "Bob M." },
  { id: "1004", name: "Linda K." },
];

function searchItems(query) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  return ITEMS_DB.filter(i =>
    i.item.toLowerCase().includes(q) ||
    (i.defaultDest || "").toLowerCase().includes(q) ||
    (i.defaultSource || "").toLowerCase().includes(q)
  ).slice(0, 5);
}

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

function StepDots({ step }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "14px 20px 0" }}>
      {["Describe", "Review", "Publish"].map((label, i) => {
        const n = i + 1, active = step === n, done = step > n;
        return (
          <div key={n} style={{ display: "flex", alignItems: "center", flex: i < 2 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: done ? "#374151" : active ? "#1F2937" : "#E5E7EB", color: (done || active) ? "white" : "#9CA3AF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, boxShadow: active ? "0 0 0 3px #D1D5DB" : "none" }}>
                {done ? "✓" : n}
              </div>
              <span style={{ fontSize: 10, color: active ? "#1F2937" : "#9CA3AF", fontWeight: active ? 700 : 400 }}>{label}</span>
            </div>
            {i < 2 && <div style={{ flex: 1, height: 2, margin: "0 6px", marginBottom: 14, background: done ? "#374151" : "#E5E7EB" }} />}
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, multiline, hint }) {
  const [focused, setFocused] = useState(false);
  const style = { width: "100%", padding: "9px 11px", border: `1.5px solid ${focused ? "#6B7280" : "#E5E7EB"}`, borderRadius: 8, fontSize: 14, color: "#1F2937", background: "white", fontFamily: "inherit", boxSizing: "border-box", outline: "none", transition: "border 0.15s" };
  return (
    <div style={{ marginBottom: 13 }}>
      <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>{label}</label>
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={2} style={{ ...style, resize: "vertical" }} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
        : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || "—"} style={style} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
      }
      {hint && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

export default function CreateTask({ onBack, onPublish }) {
  const [step, setStep] = useState(1);
  const [sentence, setSentence] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [fields, setFields] = useState({ item: "", action: "", source: "", destination: "", comments: "", estimatedTime: "~15 min", priority: "Normal" });
  const [assignTo, setAssignTo] = useState("");
  const [published, setPublished] = useState(false);

  const upd = key => val => setFields(f => ({ ...f, [key]: val }));

  function onType(val) {
    setSentence(val);
    setSuggestions(searchItems(val));
  }

  function applySuggestion(s) {
    setFields({ item: s.item, action: s.defaultAction || "", source: s.defaultSource || "", destination: s.defaultDest || "", comments: s.defaultComments || "", estimatedTime: "~15 min", priority: "Normal" });
    setSentence(s.item);
    setSuggestions([]);
    setStep(2);
  }

  async function handleParse() {
    if (!sentence.trim()) return;
    setParsing(true); setParseError("");
    try {
      const result = await parseWithAI(sentence.trim());
      if (result) {
        const match = ITEMS_DB.find(i => i.item.toLowerCase().includes((result.item || "").toLowerCase()));
        setFields({
          item: result.item || "",
          action: result.action || match?.defaultAction || "",
          source: result.source || match?.defaultSource || "",
          destination: result.destination || match?.defaultDest || "",
          comments: result.comments || match?.defaultComments || "",
          estimatedTime: result.estimatedTime || "~15 min",
          priority: result.priority || "Normal"
        });
        setStep(2);
      } else {
        setParseError("Couldn't parse — try a suggestion below or be more specific.");
      }
    } catch { setParseError("Something went wrong. Try again."); }
    setParsing(false);
  }

  function handlePublish() {
    setPublished(true);
    setTimeout(() => { if (onPublish) onPublish({ ...fields, assignTo, sentence }); }, 1500);
  }

  function reset() { setPublished(false); setStep(1); setSentence(""); setFields({ item: "", action: "", source: "", destination: "", comments: "", estimatedTime: "~15 min", priority: "Normal" }); setAssignTo(""); }

  if (published) return (
    <div style={{ background: "white", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 32, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#1F2937", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "white" }}>✓</div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#1F2937" }}>Task Published!</div>
        <div style={{ fontSize: 14, color: "#6B7280", marginTop: 4 }}>"{fields.destination ? fields.destination + " — " : ""}{fields.item || "Task"}" is live on the board</div>
      </div>
      <button onClick={reset} style={{ padding: "10px 24px", background: "#1F2937", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>+ Create Another</button>
    </div>
  );

  const btn = (label, onClick, opts = {}) => (
    <button onClick={onClick} style={{ flex: opts.flex || 1, padding: 13, borderRadius: 10, background: opts.secondary ? "white" : "#1F2937", border: opts.secondary ? "2px solid #E5E7EB" : "none", color: opts.secondary ? "#6B7280" : "white", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{label}</button>
  );

  return (
    <div style={{ background: "#F9FAFB", minHeight: "100vh", maxWidth: 480, margin: "0 auto", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: "#374151", padding: "16px 20px 14px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack || (() => {})} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer" }}>← Back</button>
        <div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Operations Manager</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "white" }}>Create Task</div>
        </div>
      </div>

      <StepDots step={step} />

      <div style={{ padding: "18px 20px 40px" }}>

        {/* STEP 1 */}
        {step === 1 && <>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1F2937", marginBottom: 2 }}>What needs to be done?</div>
          <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 12 }}>Type naturally — AI will structure it. Or pick a suggestion.</div>

          <div style={{ position: "relative" }}>
            <textarea value={sentence} onChange={e => onType(e.target.value)}
              placeholder={"e.g. Fill coffee from warehouse to Rack 7\nMove peanut butter to Rack 18, then fill Rack 15 with beans"}
              rows={3}
              style={{ width: "100%", padding: "11px 13px", border: "2px solid #E5E7EB", borderRadius: 10, fontSize: 14, color: "#1F2937", background: "white", resize: "none", fontFamily: "inherit", boxSizing: "border-box", outline: "none", lineHeight: 1.6 }}
              onFocus={e => e.target.style.borderColor = "#6B7280"}
              onBlur={e => e.target.style.borderColor = "#E5E7EB"}
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleParse(); }}
            />
            {suggestions.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10, background: "white", border: "1.5px solid #E5E7EB", borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", overflow: "hidden", marginTop: 4 }}>
                <div style={{ padding: "6px 12px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #F3F4F6" }}>Quick match</div>
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => applySuggestion(s)}
                    style={{ width: "100%", padding: "10px 12px", background: "white", border: "none", borderBottom: i < suggestions.length - 1 ? "1px solid #F3F4F6" : "none", textAlign: "left", cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#F9FAFB"}
                    onMouseLeave={e => e.currentTarget.style.background = "white"}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1F2937" }}>{s.item}</div>
                    <div style={{ fontSize: 11, color: "#9CA3AF" }}>{s.defaultAction} → {s.defaultDest}{s.defaultSource ? ` · from ${s.defaultSource}` : ""}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Common Tasks</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {COMMON_TASKS.map(ex => (
                <button key={ex} onClick={() => onType(ex)}
                  style={{ background: "white", border: "1.5px solid #E5E7EB", borderRadius: 20, padding: "5px 10px", fontSize: 12, color: "#6B7280", cursor: "pointer" }}
                  onMouseEnter={e => { e.target.style.borderColor = "#6B7280"; e.target.style.color = "#374151"; }}
                  onMouseLeave={e => { e.target.style.borderColor = "#E5E7EB"; e.target.style.color = "#6B7280"; }}>
                  {ex.length > 48 ? ex.slice(0, 48) + "…" : ex}
                </button>
              ))}
            </div>
          </div>

          {parseError && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#B91C1C", marginBottom: 12 }}>⚠ {parseError}</div>}

          <button onClick={handleParse} disabled={!sentence.trim() || parsing}
            style={{ width: "100%", padding: 14, borderRadius: 10, background: sentence.trim() && !parsing ? "#1F2937" : "#D1D5DB", color: "white", border: "none", fontSize: 15, fontWeight: 700, cursor: sentence.trim() && !parsing ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {parsing ? <><span style={{ display: "inline-block", width: 15, height: 15, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />Parsing with AI...</> : "→ Parse with AI"}
          </button>
          <div style={{ textAlign: "center", fontSize: 11, color: "#9CA3AF", marginTop: 6 }}>Ctrl+Enter to parse quickly</div>
        </>}

        {/* STEP 2 */}
        {step === 2 && <>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1F2937", marginBottom: 2 }}>Review & edit</div>
          <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 12 }}>AI filled these in — correct anything that's off.</div>
          <div style={{ background: "#F3F4F6", borderRadius: 8, padding: "9px 12px", marginBottom: 14, borderLeft: "3px solid #9CA3AF" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>You wrote</div>
            <div style={{ fontSize: 13, color: "#4B5563", fontStyle: "italic" }}>"{sentence}"</div>
          </div>
          <Field label="Item" value={fields.item} onChange={upd("item")} placeholder="e.g. Coffee bags" />
          <Field label="Action" value={fields.action} onChange={upd("action")} placeholder="Fill / Front up / Move…" />
          <Field label="Source" value={fields.source} onChange={upd("source")} placeholder="e.g. Walk-in Fridge, Warehouse — Bay 14, Freezer — Bay 3" hint="Include bay number if item is in the warehouse (e.g. Warehouse — Bay 14)" />
          <Field label="Destination" value={fields.destination} onChange={upd("destination")} placeholder="Rack 7, Door 1, etc." />
          <Field label="Est. Time" value={fields.estimatedTime} onChange={upd("estimatedTime")} placeholder="~15 min" />
          <Field label="Special Instructions" value={fields.comments} onChange={upd("comments")} placeholder="Notes for the volunteer…" multiline />

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Priority</label>
            <div style={{ display: "flex", gap: 8 }}>
              {PRIORITY.map(p => (
                <button key={p} onClick={() => upd("priority")(p)}
                  style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: `2px solid ${fields.priority === p ? "#374151" : "#E5E7EB"}`, background: fields.priority === p ? "#374151" : "white", color: fields.priority === p ? "white" : "#6B7280", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Assign To</label>
            <select value={assignTo} onChange={e => setAssignTo(e.target.value)}
              style={{ width: "100%", padding: "9px 10px", border: "1.5px solid #E5E7EB", borderRadius: 8, fontSize: 14, color: "#1F2937", background: "white", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}>
              {VOLUNTEERS.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {btn("← Retype", () => setStep(1), { secondary: true })}
            {btn("Preview →", () => setStep(3), { flex: 2 })}
          </div>
        </>}

        {/* STEP 3 */}
        {step === 3 && <>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1F2937", marginBottom: 2 }}>Confirm & publish</div>
          <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 14 }}>This is how volunteers will see it on the board.</div>

          <div style={{ background: "white", borderRadius: 12, border: "2px solid #E5E7EB", overflow: "hidden", marginBottom: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ background: "#374151", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "white" }}>{fields.destination ? `${fields.destination} — ` : ""}{fields.item || "Task"}</div>
              <div style={{ background: fields.priority === "Urgent" ? "#4B5563" : fields.priority === "High" ? "#6B7280" : "#9CA3AF", color: "white", borderRadius: 12, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{fields.priority}</div>
            </div>
            <div style={{ padding: "14px 16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px", marginBottom: fields.comments ? 12 : 0 }}>
                {[["ACTION", fields.action], ["EST. TIME", fields.estimatedTime], ["SOURCE", fields.source], ["DESTINATION", fields.destination]].filter(([, v]) => v).map(([label, val]) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                    <div style={{ fontSize: 13, color: "#1F2937", fontWeight: 500 }}>{val}</div>
                  </div>
                ))}
              </div>
              {fields.comments && <div style={{ background: "#F9FAFB", borderRadius: 8, padding: "8px 10px", borderLeft: "3px solid #9CA3AF" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Special Instructions</div>
                <div style={{ fontSize: 13, color: "#4B5563" }}>{fields.comments}</div>
              </div>}
              {assignTo && <div style={{ marginTop: 10, fontSize: 12, color: "#6B7280" }}>👤 {VOLUNTEERS.find(v => v.id === assignTo)?.name}</div>}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {btn("← Edit", () => setStep(2), { secondary: true })}
            {btn("✓ Publish to Board", handlePublish, { flex: 2 })}
          </div>
        </>}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } * { box-sizing: border-box; }`}</style>
    </div>
  );
}
