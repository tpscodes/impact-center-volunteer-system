// ManagerDashboard.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { ref, get } from "firebase/database";

const GRAY = { dark: "#1F2937", mid: "#374151", soft: "#6B7280", light: "#9CA3AF", border: "#E5E7EB", bg: "#F9FAFB" };

function StatusBadge({ status }) {
  const cfg = {
    available: { label: "Available", bg: "#F3F4F6", color: "#374151" },
    "in-progress": { label: "In Progress", bg: "#FFF3E0", color: "#C2410C" },
    complete: { label: "Complete", bg: "#374151", color: "white" },
    incomplete: { label: "Incomplete", bg: "#FEE2E2", color: "#DC2626" },
  }[status] || { label: status, bg: "#F3F4F6", color: "#374151" };
  return (
    <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
      {cfg.label}
    </span>
  );
}

function PriorityDot({ priority }) {
  const color = priority === "Urgent" ? "#4B5563" : priority === "High" ? "#6B7280" : "#D1D5DB";
  return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: color, marginRight: 6 }} />;
}

function fmtTime(ms) {
  if (!ms) return "";
  return new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function timeStrToMs(str) {
  // "HH:MM" → today's date at that time in ms
  if (!str) return null;
  const [h, m] = str.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

export default function ManagerDashboard({ tasks, onDeleteTask, onMarkIncomplete, onResetTasks, onCompleteTask, synced, error, session, onStartSession, onEndSession }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  // Session modal state
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("open"); // "open" | "timed"
  const [startTimeStr, setStartTimeStr] = useState("");
  const [endTimeStr, setEndTimeStr] = useState("");
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [starting, setStarting] = useState(false);

  // End session confirmation
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [ending, setEnding] = useState(false);

  // Load saved session settings when modal opens
  useEffect(() => {
    if (!showModal) return;
    const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
    const now = new Date();
    const nowStr = now.toTimeString().slice(0, 5);
    setStartTimeStr(nowStr);
    setEndTimeStr("");
    setLoadingSettings(true);
    get(ref(db, `sessionSettings/${dayOfWeek}`)).then(snap => {
      const s = snap.val();
      if (s) {
        setStartTimeStr(s.defaultStartTime || nowStr);
        setEndTimeStr(s.defaultEndTime || "");
      }
    }).catch(() => {}).finally(() => setLoadingSettings(false));
  }, [showModal]);

  async function handleStartSession() {
    setStarting(true);
    try {
      const startMs = modalType === "timed" ? timeStrToMs(startTimeStr) : Date.now();
      const endMs = modalType === "timed" ? timeStrToMs(endTimeStr) : null;
      await onStartSession({ type: modalType, startTime: startMs, endTime: endMs });
      setShowModal(false);
    } finally {
      setStarting(false);
    }
  }

  async function handleEndSession() {
    setEnding(true);
    try {
      await onEndSession();
      setShowEndConfirm(false);
    } finally {
      setEnding(false);
    }
  }

  const isSessionActive = session?.isActive && (
    session.type !== "timed" || !session.endTime || Date.now() < session.endTime
  );

  const active = tasks.filter(t => t.status !== "complete");
  const completed = tasks.filter(t => t.status === "complete");
  const inProgress = tasks.filter(t => t.status === "in-progress");
  const incomplete = tasks.filter(t => t.status === "incomplete");
  const rolledOver = tasks.filter(t => t.rolledOver === true);

  const filtered = tasks.filter(t =>
    !search || t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.item?.toLowerCase().includes(search.toLowerCase()) ||
    t.destination?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ background: GRAY.bg, minHeight: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ background: GRAY.mid, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Operations Manager</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "white" }}>Dashboard</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Welcome, Jason</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.1)", borderRadius: 20, padding: "4px 10px" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: error ? "#EF4444" : synced ? "#86EFAC" : "#FCD34D", animation: synced && !error ? "pulse 2s infinite" : "none" }} />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>{error ? "Offline" : synced ? "Live" : "Syncing…"}</span>
          </div>
          <button onClick={() => navigate("/")} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", borderRadius: 8, padding: "7px 14px", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>Logout</button>
        </div>
      </div>

      {/* Session banner */}
      {isSessionActive && (
        <div style={{ background: "#16A34A", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: "0.06em" }}>● Session Active</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "white", marginTop: 2 }}>
              {session.type === "timed"
                ? `Timed Session — ends at ${fmtTime(session.endTime)}`
                : "Open Session"}
            </div>
          </div>
          <button
            onClick={() => setShowEndConfirm(true)}
            style={{ background: "#EF4444", border: "none", color: "white", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            End Session Early
          </button>
        </div>
      )}

      {!isSessionActive && session && !session.isActive && (
        <div style={{ background: "#F3F4F6", padding: "10px 20px", borderBottom: `1px solid ${GRAY.border}` }}>
          <div style={{ fontSize: 13, color: GRAY.soft, fontWeight: 600 }}>⏸ No active session — volunteers see a locked screen</div>
        </div>
      )}

      <div style={{ padding: "20px 20px 40px" }}>

        {/* Metric cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 20 }}>
          {[
            { label: "Active", value: active.length, icon: "📋" },
            { label: "In Progress", value: inProgress.length, icon: "🔄" },
            { label: "Incomplete", value: incomplete.length, icon: "⚠️", red: incomplete.length > 0 },
            { label: "Completed", value: completed.length, icon: "✅" },
          ].map(m => (
            <div key={m.label} style={{ background: m.red ? "#FFF5F5" : "white", borderRadius: 12, padding: "12px 8px", border: `1px solid ${m.red ? "#FECACA" : GRAY.border}`, textAlign: "center" }}>
              <div style={{ fontSize: 18 }}>{m.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: m.red ? "#DC2626" : GRAY.dark, lineHeight: 1.2 }}>{m.value}</div>
              <div style={{ fontSize: 10, color: m.red ? "#DC2626" : GRAY.light, fontWeight: 600 }}>{m.label}</div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button onClick={() => navigate("/manager/tasks")}
            style={{ flex: 2, padding: "12px 0", background: GRAY.dark, color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            + Create New Task
          </button>
          <button
            onClick={() => { setModalType("open"); setShowModal(true); }}
            disabled={isSessionActive}
            style={{ flex: 2, padding: "12px 0", background: isSessionActive ? "#D1D5DB" : "#16A34A", color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: isSessionActive ? "not-allowed" : "pointer" }}>
            {isSessionActive ? "Session Active" : "▶ Start Session"}
          </button>
          <button onClick={onResetTasks}
            style={{ flex: 1, padding: "12px 0", background: "white", color: GRAY.soft, border: `2px solid ${GRAY.border}`, borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            ↺ Reset
          </button>
        </div>
        <button onClick={() => navigate("/manager/history")}
          style={{ width: "100%", padding: "11px 0", background: "white", color: GRAY.soft, border: `2px solid ${GRAY.border}`, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 20 }}>
          📋 Task History
        </button>

        {/* Rolled-over tasks section */}
        {rolledOver.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#DC2626", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              ⚠️ Leftover from Previous Session ({rolledOver.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {rolledOver.map(t => (
                <div key={t.id} style={{ background: "#FFF5F5", borderRadius: 10, border: "1.5px solid #FECACA", padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#DC2626" }}>{t.name}</div>
                      <div style={{ fontSize: 11, color: GRAY.light, marginTop: 2 }}>Rolled over from {t.rolledOverFrom} · {t.estimatedTime}</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, background: "#FEE2E2", color: "#DC2626", borderRadius: 20, padding: "2px 8px", marginLeft: 8, flexShrink: 0 }}>Incomplete</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button
                      onClick={() => onCompleteTask(t.id, "Manager")}
                      style={{ flex: 1, padding: "7px 0", background: "#16A34A", color: "white", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      ✓ Mark Complete
                    </button>
                    <button
                      onClick={() => onDeleteTask(t.id)}
                      style={{ flex: 1, padding: "7px 0", background: "white", color: GRAY.soft, border: `1.5px solid ${GRAY.border}`, borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      Remove Task
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 14 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: GRAY.light, fontSize: 14 }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks…"
            style={{ width: "100%", padding: "10px 12px 10px 34px", border: `1.5px solid ${GRAY.border}`, borderRadius: 8, fontSize: 14, color: GRAY.dark, background: "white", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {/* Task table */}
        <div style={{ background: "white", borderRadius: 12, border: `1px solid ${GRAY.border}`, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 80px", padding: "10px 14px", background: GRAY.dark, gap: 8 }}>
            {["TASK", "LOCATION", "ASSIGNED TO", "STATUS"].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "0.06em" }}>{h}</div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ padding: 32, textAlign: "center", color: GRAY.light, fontSize: 14 }}>No tasks yet — create one above!</div>
          )}

          {filtered.map((t, i) => (
            <div key={t.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 80px", padding: "12px 14px", gap: 8, borderBottom: i < filtered.length - 1 ? `1px solid ${GRAY.border}` : "none", alignItems: "center", background: t.status === "complete" ? "#FAFAFA" : "white" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.status === "complete" ? GRAY.light : GRAY.dark, display: "flex", alignItems: "center" }}>
                  <PriorityDot priority={t.priority} />
                  {t.name}
                </div>
                <div style={{ fontSize: 11, color: GRAY.light, marginTop: 1 }}>{t.estimatedTime}</div>
              </div>
              <div style={{ fontSize: 12, color: GRAY.soft }}>{t.destination || "—"}</div>
              <div style={{ fontSize: 12, color: (t.claimedByName || t.assignedName) ? GRAY.dark : GRAY.light, fontWeight: (t.claimedByName || t.assignedName) ? 600 : 400 }}>
                {t.claimedByName || t.assignedName || "Unassigned"}
                {t.claimedByType === "new" && <span style={{ fontSize: 10, color: GRAY.light, fontWeight: 400, marginLeft: 4 }}>(new)</span>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                <StatusBadge status={t.status} />
                {t.status === "in-progress" && (
                  <button onClick={() => onMarkIncomplete(t.id)}
                    style={{ fontSize: 10, color: "#DC2626", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
                    Mark Incomplete
                  </button>
                )}
                {t.status !== "complete" && (
                  <button onClick={() => onDeleteTask(t.id)}
                    style={{ fontSize: 10, color: GRAY.light, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 12, textAlign: "center", fontSize: 11, color: GRAY.light }}>
          🔄 Updates in real time across all devices
        </div>
      </div>

      {/* ── Start Session Modal ── */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "white", borderRadius: 16, overflow: "hidden", width: "100%", maxWidth: 380 }}>
            <div style={{ background: "#16A34A", padding: "18px 20px" }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.8)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Operations Manager</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "white", marginTop: 2 }}>Start Session</div>
            </div>
            <div style={{ padding: 20 }}>
              {/* Toggle */}
              <div style={{ display: "flex", background: "#F3F4F6", borderRadius: 10, padding: 3, marginBottom: 20 }}>
                {["open", "timed"].map(t => (
                  <button key={t} onClick={() => setModalType(t)}
                    style={{ flex: 1, padding: "9px 0", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
                      background: modalType === t ? "white" : "transparent",
                      color: modalType === t ? GRAY.dark : GRAY.soft,
                      boxShadow: modalType === t ? "0 1px 4px rgba(0,0,0,0.12)" : "none" }}>
                    {t === "open" ? "Open Session" : "Timed Session"}
                  </button>
                ))}
              </div>

              {modalType === "timed" && (
                <div style={{ marginBottom: 16 }}>
                  {loadingSettings && <div style={{ fontSize: 12, color: GRAY.light, marginBottom: 8 }}>Loading saved times…</div>}
                  <div style={{ display: "flex", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: GRAY.soft, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Start Time</label>
                      <input type="time" value={startTimeStr} onChange={e => setStartTimeStr(e.target.value)}
                        style={{ width: "100%", padding: "9px 10px", border: `1.5px solid ${GRAY.border}`, borderRadius: 8, fontSize: 14, color: GRAY.dark, background: "white", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: GRAY.soft, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>End Time</label>
                      <input type="time" value={endTimeStr} onChange={e => setEndTimeStr(e.target.value)}
                        style={{ width: "100%", padding: "9px 10px", border: `1.5px solid ${GRAY.border}`, borderRadius: 8, fontSize: 14, color: GRAY.dark, background: "white", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: GRAY.light, marginTop: 6 }}>Times are saved as defaults for {new Date().toLocaleDateString("en-US", { weekday: "long" })}s</div>
                </div>
              )}

              <button
                onClick={handleStartSession}
                disabled={starting || (modalType === "timed" && (!startTimeStr || !endTimeStr))}
                style={{ width: "100%", padding: "13px 0", background: (starting || (modalType === "timed" && (!startTimeStr || !endTimeStr))) ? "#D1D5DB" : "#16A34A", color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 8 }}>
                {starting ? "Starting…" : "▶ Start Session"}
              </button>
              <button onClick={() => setShowModal(false)}
                style={{ width: "100%", padding: "10px 0", background: "none", color: GRAY.light, border: "none", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── End Session Confirmation ── */}
      {showEndConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "white", borderRadius: 16, padding: 24, width: "100%", maxWidth: 360 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: GRAY.dark, marginBottom: 10 }}>End Session Early?</div>
            <div style={{ fontSize: 14, color: GRAY.soft, lineHeight: 1.6, marginBottom: 20 }}>
              All in-progress and incomplete tasks will be marked incomplete and rolled over to the next session.
            </div>
            <button onClick={handleEndSession} disabled={ending}
              style={{ width: "100%", padding: "13px 0", background: ending ? "#D1D5DB" : "#EF4444", color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 8 }}>
              {ending ? "Ending…" : "Yes, End Session"}
            </button>
            <button onClick={() => setShowEndConfirm(false)}
              style={{ width: "100%", padding: "10px 0", background: "none", color: GRAY.light, border: "none", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}
