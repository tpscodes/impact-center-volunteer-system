import "./StatCards.css";

const ACCENTS = {
  brand:    { chipBg: "#E6F5F3", chipFg: "#09665E", valueFg: "#09665E", barColor: "#0D9488" },
  progress: { chipBg: "#FFF3E0", chipFg: "#9A5000", valueFg: "#9A5000", barColor: "#FF9500" },
  complete: { chipBg: "#F0FFF4", chipFg: "#15703C", valueFg: "#15703C", barColor: "#34C759" },
  danger:   { chipBg: "#FEE2E2", chipFg: "#991B1B", valueFg: "#DC2626", barColor: "#F87171" },
  neutral:  { chipBg: "#E5E7EB", chipFg: "#6B7280", valueFg: "#0A2A3A", barColor: "#9CA3AF" },
};

function isSameDay(ms, target) {
  if (!ms) return false;
  const d = new Date(ms);
  return d.getFullYear() === target.getFullYear() &&
    d.getMonth() === target.getMonth() &&
    d.getDate() === target.getDate();
}

function last7Counts(completedTasks) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return completedTasks.filter(t => isSameDay(t.completedAtMs, d)).length;
  });
}

function MiniChart({ values, barColor }) {
  const max = Math.max(...values, 1);
  return (
    <div className="sc-chart">
      {values.map((v, i) => (
        <span
          key={i}
          className="sc-bar"
          style={{ height: Math.max(3, Math.round((v / max) * 32)), "--bar-color": barColor }}
        />
      ))}
    </div>
  );
}

const UP_ARROW = "M6 1 L11 9 L1 9 Z";
const DOWN_ARROW = "M6 11 L1 3 L11 3 Z";

function Delta({ value, direction, label }) {
  const isFlat = direction === "flat";
  return (
    <div className={`sc-delta sc-delta--${direction}`}>
      {isFlat ? (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 6h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path d={direction === "up" ? UP_ARROW : DOWN_ARROW}/>
        </svg>
      )}
      <span className="sc-delta__value">{value}</span>
      <span>{label}</span>
    </div>
  );
}

// Delta for "Active Tasks" and "In Progress" cannot be computed — no historical
// task-count snapshots are stored in Firebase. Deltas are omitted for those cards.
function computeTaskCards(tasks = [], completedTasks = []) {
  const activeTasks = tasks.filter(t => !t.rolledOver);
  const active      = activeTasks.filter(t => t.status !== "complete").length;
  const inProgress  = activeTasks.filter(t => t.status === "in-progress").length;

  const today     = new Date();
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const todayDone     = completedTasks.filter(t => isSameDay(t.completedAtMs, today)).length;
  const yesterdayDone = completedTasks.filter(t => isSameDay(t.completedAtMs, yesterday)).length;
  const completedDiff = todayDone - yesterdayDone;

  const chart7 = last7Counts(completedTasks);
  const maxChart = Math.max(...chart7, 1);
  const chartNorm = chart7.map(v => v / maxChart);

  return [
    { label: "Active Tasks",    value: active,    accent: "brand",    chart: null,      delta: null },
    { label: "In Progress",     value: inProgress,accent: "progress", chart: null,      delta: null },
    {
      label: "Completed Today",
      value: todayDone,
      accent: "complete",
      chart: chartNorm,
      delta: completedDiff > 0
        ? { value: completedDiff,             direction: "up",   label: "than yesterday" }
        : completedDiff < 0
        ? { value: Math.abs(completedDiff),   direction: "down", label: "than yesterday" }
        : { value: "0",                       direction: "flat", label: "so far" },
    },
  ];
}

// cards: optional array of { label, value, accent, chart?, delta? }
//   — when provided, renders those directly (delivery dashboard, etc.)
//   — when omitted, computes from tasks/completedTasks (pantry dashboard)
// cols: optional number of columns at desktop size (default 3)
export default function StatCards({ tasks, completedTasks, cards, cols }) {
  const resolvedCards = cards ?? computeTaskCards(tasks, completedTasks);

  return (
    <div
      className="sc-row"
      style={cols ? { "--sc-cols": cols } : undefined}
    >
      {resolvedCards.map((stat) => {
        const a = ACCENTS[stat.accent] || ACCENTS.neutral;
        return (
          <div
            key={stat.label}
            className="sc-card"
            style={{ "--chip-bg": a.chipBg, "--chip-fg": a.chipFg, "--value-fg": a.valueFg }}
          >
            <div className="sc-top">
              <span className="sc-chip">{stat.label}</span>
              {stat.chart && <MiniChart values={stat.chart} barColor={a.barColor} />}
            </div>
            <div className="sc-value">{stat.value}</div>
            {stat.delta && <Delta {...stat.delta} />}
          </div>
        );
      })}
    </div>
  );
}
