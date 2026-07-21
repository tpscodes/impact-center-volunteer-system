import "./PageHeader.css";

function formatToday() {
  const d = new Date();
  const day = d.getDate();
  const suffix =
    day % 10 === 1 && day !== 11 ? "st" :
    day % 10 === 2 && day !== 12 ? "nd" :
    day % 10 === 3 && day !== 13 ? "rd" : "th";
  const month = d.toLocaleDateString("en-US", { month: "long" });
  return `${day}${suffix} ${month}  ${d.getFullYear()}`;
}

function formatTimestamp() {
  const d = new Date();
  const date = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date} · ${time}`;
}

// action: { label, icon?, onClick }  → date + action button
// right: JSX                         → date + custom content (e.g. time-range segment)
// neither                            → live timestamp (History mode)
export default function PageHeader({ initials, label, showBack = false, onBack, action, right }) {
  return (
    <div className="ph-bar">
      {/* Left — back circle OR avatar + page label */}
      <div className="ph-identity">
        {showBack ? (
          <button
            type="button"
            className="ph-back-icon"
            onClick={onBack}
            aria-label="Go back"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2"
                 strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6"/>
            </svg>
          </button>
        ) : (
          <span className="ph-avatar" aria-hidden="true">{initials}</span>
        )}
        <span className="ph-label">{label}</span>
      </div>

      {/* Right — date + action button | date + custom right | timestamp */}
      <div className="ph-right">
        {right ? (
          <>
            <span className="ph-date">{formatToday()}</span>
            {right}
          </>
        ) : action ? (
          <>
            <span className="ph-date">{formatToday()}</span>
            <button type="button" className="ph-action-btn" onClick={action.onClick}>
              {action.icon && action.icon}
              <span>{action.label}</span>
            </button>
          </>
        ) : (
          <span className="ph-timestamp">{formatTimestamp()}</span>
        )}
      </div>
    </div>
  );
}
