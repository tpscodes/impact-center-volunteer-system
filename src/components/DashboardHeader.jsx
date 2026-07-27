import "./DashboardHeader.css";

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

export default function DashboardHeader({
  initials,
  isSessionActive = false,
  onStartSession,
  onEndSession,
  onCreateTask,
}) {
  return (
    <div className="dh-bar">
      {/* Left — avatar + role */}
      <div className="dh-identity">
        <span className="dh-avatar" aria-hidden="true">{initials}</span>
        <span className="dh-role">Operations Manager</span>
      </div>

      {/* Right — date + optional action buttons */}
      <div className="dh-right">
        <span className="dh-date">{formatToday()}</span>

        {(onStartSession || onEndSession) && (
          isSessionActive ? (
            <button
              type="button"
              className="dh-btn dh-btn-start dh-btn-start--active"
              onClick={onEndSession}
            >
              <span className="dh-btn-start__label">End Session</span>
            </button>
          ) : (
            <button
              type="button"
              className="dh-btn dh-btn-start"
              onClick={onStartSession}
            >
              <span className="dh-btn-start__label">Start Session</span>
            </button>
          )
        )}

        {onCreateTask && (
          <button
            type="button"
            className="dh-btn dh-btn-create"
            onClick={onCreateTask}
          >
            <span className="dh-btn-create__label">+ Create Task</span>
          </button>
        )}
      </div>
    </div>
  );
}
