// CreateDeliveryRoute.jsx — Create a new delivery route
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { Menu, X } from "lucide-react";
import { db } from "../firebase";
import { ref, push } from "firebase/database";

const VEHICLES = ["F650 26ft Box Truck", "16ft Small Box Truck", "IC Van", "Personal Vehicle"];
const DRIVERS_NEEDED = [1, 2];
const PRIORITIES = ["Normal", "High", "Urgent"];

const PRIORITY_ACTIVE = {
  Urgent: "bg-[#fff0f0] text-[#dc2626] border border-[#dc2626]",
  High:   "bg-[#fff3e0] text-[#ff9500] border border-[#ff9500]",
  Normal: "bg-[#ccedeb] text-[#09665e] border border-[#09665e]",
};

function getDayOfWeek(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
}

function addWeeks(dateStr, weeks) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

function Label({ children }) {
  return <p className="text-[#6b7280] text-[12px] mb-1">{children}</p>;
}

function Input({ value, onChange, placeholder, type = "text", required }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2 text-[14px] text-[#0a2a3a] focus:outline-none focus:ring-2 focus:ring-[#0d9488] bg-white"
    />
  );
}

function Select({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2 text-[14px] text-[#0a2a3a] focus:outline-none focus:ring-2 focus:ring-[#0d9488] bg-white">
      {children}
    </select>
  );
}

function Card({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-[#e5e7eb] p-5 mb-4">
      <p className="text-[#0a2a3a] text-[15px] font-semibold mb-4">{title}</p>
      {children}
    </div>
  );
}

export default function CreateDeliveryRoute() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [routeName, setRouteName] = useState("");
  const [vehicle, setVehicle] = useState(VEHICLES[0]);
  const [driversNeeded, setDriversNeeded] = useState(1);
  const [source, setSource] = useState("");
  const [items, setItems] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [destination, setDestination] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [date, setDate] = useState("");
  const [repeatsWeekly, setRepeatsWeekly] = useState(false);
  const [repeatUntil, setRepeatUntil] = useState("");
  const [priority, setPriority] = useState("Normal");

  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });

  const NAV_ITEMS = [
    { label: "Dashboard", path: "/manager/dashboard" },
    { label: "Tasks",     path: "/manager-tasks"      },
    { label: "Volunteers",path: "/manager-volunteers"  },
    { label: "History",   path: "/manager-history"     },
  ];

  async function handleSubmit() {
    setError("");
    if (!routeName.trim()) { setError("Route name is required."); return; }
    if (!source.trim())    { setError("Source location is required."); return; }
    if (!departureTime)    { setError("Departure time is required."); return; }
    if (!destination.trim()){ setError("Destination is required."); return; }
    if (!date)             { setError("Date is required."); return; }
    if (repeatsWeekly && !repeatUntil) { setError("Repeat Until date is required."); return; }

    setSubmitting(true);

    // Build dates to write
    const dates = [date];
    if (repeatsWeekly && repeatUntil) {
      let cur = addWeeks(date, 1);
      while (cur <= repeatUntil) {
        dates.push(cur);
        cur = addWeeks(cur, 1);
      }
    }

    try {
      // TODO: migrate to routeOccurrences/ — deliveryRoutes/ is deprecated
      await Promise.all(dates.map(d => push(ref(db, "deliveryRoutes"), {
        name: routeName.trim(),
        source: source.trim(),
        destination: destination.trim(),
        items: items.trim(),
        departureTime,
        arrivalTime,
        date: d,
        dayOfWeek: getDayOfWeek(d),
        vehicle,
        driversNeeded: Number(driversNeeded),
        claimedBy: [],
        status: "available",
        type: "delivery",
        priority,
        createdAt: Date.now(),
      })));
      navigate("/manager-delivery");
    } catch (err) {
      console.error(err);
      setError("Failed to save. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]"
      style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* ══════════════════════════════════════════════════════════════════════
          MOBILE LAYOUT
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden flex flex-col min-h-screen">

        {/* Mobile header */}
        <div className="bg-[#0a2a3a] px-4 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <p className="text-[#0d9488] text-[10px] uppercase tracking-widest">Operations Manager</p>
            <p className="text-white text-[18px] font-semibold leading-tight">Create Route</p>
          </div>
          <button onClick={() => setMobileMenuOpen(o => !o)}
            className="text-white bg-transparent border-none cursor-pointer p-1">
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

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
              <div className="flex mx-4 my-3 bg-[#0d2233] rounded-lg p-0.5">
                <button onClick={() => { setMobileMenuOpen(false); navigate("/manager/dashboard"); }}
                  className="flex-1 py-1.5 rounded-md text-[12px] font-medium text-[#6b7280] hover:text-[#b3b3b3]">
                  Pantry
                </button>
                <button className="flex-1 py-1.5 rounded-md text-[12px] font-medium bg-[#09665e] text-white">
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
            </div>
          </>
        )}

        {/* Mobile form */}
        <div className="px-4 py-5 pb-8">
          <MobileForm
            {...{ routeName, setRouteName, vehicle, setVehicle, driversNeeded, setDriversNeeded,
                  source, setSource, items, setItems, departureTime, setDepartureTime,
                  destination, setDestination, arrivalTime, setArrivalTime,
                  date, setDate, repeatsWeekly, setRepeatsWeekly, repeatUntil, setRepeatUntil,
                  priority, setPriority, error, submitting, handleSubmit, navigate }}
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          DESKTOP LAYOUT
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex min-h-screen">

        <Sidebar mode="delivery" activePath="/manager-delivery" />

        {/* Main content */}
        <div className="lg:ml-[220px] flex-1 flex flex-col min-h-screen">

          {/* Top bar */}
          <div className="bg-white border-b border-[#e5e7eb] h-16 flex items-center justify-between px-6 sticky top-0 z-10">
            <div>
              <p className="text-[#0d9488] text-[10px] uppercase tracking-widest">Operations Manager</p>
              <h1 className="text-[22px] font-semibold text-[#0a2a3a] tracking-tight leading-tight">Create Delivery Route</h1>
            </div>
            <span className="text-[#6b7280] text-[13px]">{todayStr}</span>
          </div>

          {/* Form */}
          <div className="p-6">
            <div className="max-w-[720px] mx-auto">
              <FormSections
                {...{ routeName, setRouteName, vehicle, setVehicle, driversNeeded, setDriversNeeded,
                      source, setSource, items, setItems, departureTime, setDepartureTime,
                      destination, setDestination, arrivalTime, setArrivalTime,
                      date, setDate, repeatsWeekly, setRepeatsWeekly, repeatUntil, setRepeatUntil,
                      priority, setPriority, error, submitting, handleSubmit, navigate }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Shared form sections (used by both mobile and desktop) ────────────────────
function FormSections(props) {
  const {
    routeName, setRouteName, vehicle, setVehicle, driversNeeded, setDriversNeeded,
    source, setSource, items, setItems, departureTime, setDepartureTime,
    destination, setDestination, arrivalTime, setArrivalTime,
    date, setDate, repeatsWeekly, setRepeatsWeekly, repeatUntil, setRepeatUntil,
    priority, setPriority, error, submitting, handleSubmit, navigate,
  } = props;

  return (
    <>
      {/* Section 1 — Route Info */}
      <Card title="Route Info">
        <div className="flex flex-col gap-3">
          <div>
            <Label>Route Name *</Label>
            <Input value={routeName} onChange={setRouteName} placeholder="e.g. Wawa Plainfield Pickup" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Vehicle *</Label>
              <Select value={vehicle} onChange={setVehicle}>
                {VEHICLES.map(v => <option key={v} value={v}>{v}</option>)}
              </Select>
            </div>
            <div>
              <Label>Drivers Needed *</Label>
              <Select value={driversNeeded} onChange={setDriversNeeded}>
                {DRIVERS_NEEDED.map(n => <option key={n} value={n}>{n}</option>)}
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Section 2 — Pickup Details */}
      <Card title="Pickup Details">
        <div className="flex flex-col gap-3">
          <div>
            <Label>Source Location *</Label>
            <Input value={source} onChange={setSource} placeholder="Where are they picking up from?" required />
          </div>
          <div>
            <Label>Items</Label>
            <Input value={items} onChange={setItems} placeholder="What are they picking up?" />
          </div>
          <div>
            <Label>Departure Time *</Label>
            <Input type="time" value={departureTime} onChange={setDepartureTime} required />
          </div>
        </div>
      </Card>

      {/* Section 3 — Drop-off Details */}
      <Card title="Drop-off Details">
        <div className="flex flex-col gap-3">
          <div>
            <Label>Destination *</Label>
            <Input value={destination} onChange={setDestination} placeholder="Where is it going?" required />
          </div>
          <div>
            <Label>Arrival Time</Label>
            <Input type="time" value={arrivalTime} onChange={setArrivalTime} />
          </div>
        </div>
      </Card>

      {/* Section 4 — Schedule */}
      <Card title="Schedule">
        <div className="flex flex-col gap-3">
          <div>
            <Label>Date *</Label>
            <Input type="date" value={date} onChange={setDate} required />
          </div>

          {/* Repeats Weekly toggle */}
          <div className="flex items-center justify-between">
            <p className="text-[#0a2a3a] text-[14px]">Repeats Weekly</p>
            <button type="button"
              onClick={() => setRepeatsWeekly(v => !v)}
              className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors border-none cursor-pointer ${repeatsWeekly ? "bg-[#0d9488]" : "bg-[#e5e7eb]"}`}>
              <span className={`inline-block w-5 h-5 bg-white rounded-full shadow transition-transform ${repeatsWeekly ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>

          {repeatsWeekly && (
            <div>
              <Label>Repeat Until *</Label>
              <Input type="date" value={repeatUntil} onChange={setRepeatUntil} required />
            </div>
          )}
        </div>
      </Card>

      {/* Section 5 — Priority */}
      <Card title="Priority">
        <div className="flex gap-2">
          {PRIORITIES.map(p => (
            <button key={p} type="button"
              onClick={() => setPriority(p)}
              className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-colors border-none cursor-pointer ${
                priority === p ? PRIORITY_ACTIVE[p] : "bg-[#f0f0f0] text-[#6b7280]"
              }`}>
              {p}
            </button>
          ))}
        </div>
      </Card>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-[#fff0f0] border border-[#dc2626] rounded-lg text-[#dc2626] text-[13px]">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pb-8">
        <button type="button"
          onClick={() => navigate("/manager-delivery")}
          className="flex-1 py-3 bg-white border border-[#e5e7eb] text-[#6b7280] rounded-lg text-[14px] font-medium cursor-pointer hover:bg-[#f9fafb]">
          Cancel
        </button>
        <button type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 py-3 bg-[#09665e] text-white rounded-lg text-[14px] font-medium cursor-pointer hover:bg-[#0d9488] disabled:opacity-60 border-none">
          {submitting ? "Creating…" : "Create Route"}
        </button>
      </div>
    </>
  );
}

// Mobile uses same form sections
function MobileForm(props) {
  return <FormSections {...props} />;
}
