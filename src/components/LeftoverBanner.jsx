import { useState, useCallback } from "react";
import RowPopover from "./RowPopover";
import "./LeftoverBanner.css";

export default function LeftoverBanner({ tasks, onComplete, onRemove }) {
  const [popover, setPopover] = useState(null); // { rect, taskId }

  const handleKebab = useCallback((e, task) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setPopover(p => p?.taskId === task.id ? null : { rect, taskId: task.id });
  }, []);

  if (!tasks.length) return null;

  const sourceDate = tasks[0]?.rolledOverFrom;
  const dateStr = sourceDate
    ? new Date(sourceDate + "T00:00:00").toLocaleDateString("en-US", {
        month: "2-digit", day: "2-digit", year: "numeric",
      })
    : "";

  const activeTask = tasks.find(t => t.id === popover?.taskId);

  return (
    <div className="lb">
      <div className="lb__head">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        Leftover from Previous Session ({tasks.length})
        {dateStr && <span style={{ fontWeight: 400, color: "#EF4444" }}> · {dateStr}</span>}
      </div>

      {tasks.map(task => (
        <div key={task.id} className="lb__row">
          <div className="lb__text">
            <div className="lb__title">{task.name || task.item}</div>
            {(task.estimatedTime || task.rolledOverFrom) && (
              <div className="lb__sub">
                {task.rolledOverFrom && `Rolled over from ${task.rolledOverFrom}`}
                {task.rolledOverFrom && task.estimatedTime && " · "}
                {task.estimatedTime}
              </div>
            )}
          </div>
          <button
            type="button"
            className={`lb__kebab${popover?.taskId === task.id ? " lb__kebab--open" : ""}`}
            aria-haspopup="menu"
            aria-expanded={popover?.taskId === task.id}
            aria-label={`Actions for ${task.name || task.item}`}
            onClick={e => handleKebab(e, task)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <circle cx="8" cy="3" r="1.4"/>
              <circle cx="8" cy="8" r="1.4"/>
              <circle cx="8" cy="13" r="1.4"/>
            </svg>
          </button>
        </div>
      ))}

      <RowPopover
        open={!!popover && !!activeTask}
        rect={popover?.rect}
        options={[
          {
            label: "Mark completed",
            onClick: () => popover && onComplete(popover.taskId),
          },
          {
            label: "Remove",
            danger: true,
            onClick: () => popover && onRemove(popover.taskId),
          },
        ]}
        onClose={() => setPopover(null)}
      />
    </div>
  );
}
