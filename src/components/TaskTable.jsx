import { useState, useCallback } from "react";
import RowPopover from "./RowPopover";
import "./TaskTable.css";

const CATEGORIES = ["All", "Warehouse", "Kitchen", "Clothing", "Urgent"];

function statusVariant(status) {
  if (status === "in-progress") return "progress";
  if (status === "complete")    return "complete";
  if (status === "incomplete")  return "error";
  return "neutral";
}

function statusLabel(status) {
  if (status === "in-progress") return "In Progress";
  if (status === "complete")    return "Complete";
  if (status === "incomplete")  return "Incomplete";
  return "Available";
}

export default function TaskTable({ tasks, mode = "active", onComplete, onMarkIncomplete, onRemove, onEdit }) {
  const planning = mode === "planning";
  const [search,          setSearch]          = useState("");
  const [category,        setCategory]        = useState("All");
  const [popover,         setPopover]         = useState(null); // { rect, taskId }
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const handleKebab = useCallback((e, task) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setPopover(p => p?.taskId === task.id ? null : { rect, taskId: task.id });
  }, []);

  const filtered = tasks
    .filter(t => {
      const q = search.toLowerCase();
      const matchSearch = !q
        || (t.name || t.item || "").toLowerCase().includes(q)
        || (t.source || "").toLowerCase().includes(q)
        || (t.destination || "").toLowerCase().includes(q)
        || (t.claimedByName || t.assignedName || "").toLowerCase().includes(q);
      const matchCat = category === "All"
        ? true
        : category === "Urgent"
        ? t.priority === "Urgent"
        : (t.tags || []).includes(category);
      return matchSearch && matchCat;
    })
    // Urgent floats to top
    .sort((a, b) => (a.priority === "Urgent" ? -1 : 0) - (b.priority === "Urgent" ? -1 : 0));

  const activeTask = tasks.find(t => t.id === popover?.taskId);

  return (
    <div className="tt-card">
      <div className="tt-head">
        <span className="tt-title">{planning ? "Task Planning" : "Active Tasks"}</span>
        <div className="tt-controls">
          <label className="tt-search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7"/>
              <path d="m21 21-4.3-4.3"/>
            </svg>
            <input
              type="text"
              className="tt-search__input"
              placeholder="Search tasks…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </label>
          <div className="tt-filters">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                className="tt-filter"
                aria-pressed={category === cat}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="tt-empty">
          {tasks.length === 0
            ? (planning ? "No tasks yet — create one to get started." : "No active tasks — create one above!")
            : "No tasks match your search or filter."}
        </div>
      ) : (
        <table className="tt-table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Location</th>
              {planning && <th>Picked Up By</th>}
              <th>Priority</th>
              {!planning && <th>Assigned To</th>}
              {!planning && <th>Status</th>}
              <th/>
            </tr>
          </thead>
          <tbody>
            {filtered.map(task => {
              const priVariant = task.priority === "High"
                ? "progress"
                : task.priority === "Urgent"
                ? "urgent"
                : null;
              const location = task.source || task.destination || "";
              const assigned = task.claimedByName || task.assignedName || "";

              return (
                <tr key={task.id}>
                  <td>
                    <div className="tt-primary">
                      {task.name || task.item}
                      {task.modifiedBy === "steve" && (
                        <span className="tt-steve-badge">Steve</span>
                      )}
                    </div>
                    {(task.tags || []).map(tag => (
                      <span key={tag} className="tt-tag">{tag}</span>
                    ))}
                  </td>
                  <td className="tt-muted">{location || "—"}</td>
                  {planning && (
                    <td className="tt-muted">{assigned || "—"}</td>
                  )}
                  <td>
                    {priVariant && (
                      <span className={`tt-pill tt-pill--${priVariant}`}>{task.priority}</span>
                    )}
                  </td>
                  {!planning && (
                    <td className="tt-muted">
                      {assigned || "—"}
                      {task.claimedByType === "new" && (
                        <span style={{ color: "#9CA3AF", fontSize: 12, marginLeft: 4 }}>(new)</span>
                      )}
                    </td>
                  )}
                  {!planning && (
                    <td>
                      <span className={`tt-pill tt-pill--${statusVariant(task.status)}`}>
                        {statusLabel(task.status)}
                      </span>
                    </td>
                  )}
                  <td>
                    <div className="tt-actions">
                      <button
                        type="button"
                        className={`tt-kebab${popover?.taskId === task.id ? " tt-kebab--open" : ""}`}
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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <RowPopover
        open={!!popover && !!activeTask}
        rect={popover?.rect}
        header={confirmDeleteId === popover?.taskId ? "Delete this task?" : undefined}
        options={confirmDeleteId === popover?.taskId
          ? [
              {
                label: "Cancel",
                onClick: () => setConfirmDeleteId(null),
              },
              {
                label: "Yes, delete",
                danger: true,
                onClick: () => { onRemove(popover.taskId); setPopover(null); setConfirmDeleteId(null); },
              },
            ]
          : planning
          ? [
              {
                label: "Edit task",
                onClick: () => popover && onEdit && onEdit(activeTask),
              },
              {
                label: "Remove",
                danger: true,
                onClick: () => setConfirmDeleteId(popover.taskId),
              },
            ]
          : [
              ...(activeTask?.status !== "complete" ? [{
                label: "Mark completed",
                onClick: () => popover && onComplete(popover.taskId),
              }] : []),
              ...(activeTask?.status === "in-progress" ? [{
                label: "Mark incomplete",
                onClick: () => popover && onMarkIncomplete(popover.taskId),
              }] : []),
              {
                label: "Remove",
                danger: true,
                onClick: () => setConfirmDeleteId(popover.taskId),
              },
            ]
        }
        onClose={() => { setPopover(null); setConfirmDeleteId(null); }}
      />
    </div>
  );
}
