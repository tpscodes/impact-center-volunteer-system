import { useState, useRef, useEffect } from "react";
import { MapPin, Clock } from "lucide-react";
import "./VolunteerTable.css";
import "./HistoryTable.css";

const PAGE_SIZE = 25;
const DATE_FILTERS = ["Today", "This Week", "This Month", "All Time"];

function resolveCompletedBy(entry) {
  return entry.completedBy || entry.claimedByName || entry.assignedName || entry.assignedTo || "";
}

function formatDate(timestamp) {
  if (!timestamp) return "—";
  const d = new Date(timestamp);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    + " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function pageNumbers(total, current) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const core = new Set([1, total, current, current - 1, current + 1].filter(n => n >= 1 && n <= total));
  const sorted = [...core].sort((a, b) => a - b);
  const result = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) result.push("…");
    result.push(p);
    prev = p;
  }
  return result;
}

export default function HistoryTable({ tasks }) {
  const [search,     setSearch]     = useState("");
  const [dateFilter, setDateFilter] = useState("Today");
  const [sortOpen,   setSortOpen]   = useState(false);
  const [page,       setPage]       = useState(1);
  const sortRef = useRef(null);

  // Close date-filter panel on outside mousedown
  useEffect(() => {
    if (!sortOpen) return;
    function handler(e) {
      if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [sortOpen]);

  // Reset to page 1 when filter or search changes
  useEffect(() => setPage(1), [search, dateFilter]);

  // Most-recent first
  const chronological = [...tasks].sort((a, b) => (b.completedAtMs || 0) - (a.completedAtMs || 0));

  const dateFiltered = chronological.filter(t => {
    const now = new Date();
    const ts  = t.completedAtMs || (typeof t.completedAt === "number" ? t.completedAt : 0);
    if (!ts) return dateFilter === "All Time";
    const d = new Date(ts);
    if (dateFilter === "Today")      return d.toDateString() === now.toDateString();
    if (dateFilter === "This Week") {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      return d >= start;
    }
    if (dateFilter === "This Month") {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    return true; // All Time
  });

  const filtered = dateFiltered.filter(t => {
    const q = search.toLowerCase();
    return !q ||
      (t.name        || "").toLowerCase().includes(q) ||
      resolveCompletedBy(t).toLowerCase().includes(q) ||
      (t.source      || "").toLowerCase().includes(q) ||
      (t.destination || "").toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageSlice  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="vt-card">
      {/* Header */}
      <div className="vt-head">
        <span className="vt-title">Completed Tasks</span>
      </div>

      {/* Search + date filter on one row */}
      <div className="ht-toolbar">
        <label className="vt-search ht-search-inline">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input
            type="text"
            className="vt-search__input"
            placeholder="Search completed tasks…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </label>

        <div className="vt-sort" ref={sortRef}>
          <button
            type="button"
            className="vt-sort__trigger"
            aria-expanded={sortOpen}
            onClick={e => { e.stopPropagation(); setSortOpen(o => !o); }}
          >
            <span>{dateFilter}</span>
            <svg className="vt-sort__chevron" width="10" height="6" viewBox="0 0 10 6"
                 fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M1 1l4 4 4-4"/>
            </svg>
          </button>
          {sortOpen && (
            <div className="vt-sort__panel">
              {DATE_FILTERS.map(f => (
                <button
                  key={f}
                  type="button"
                  className="vt-sort__option"
                  aria-selected={dateFilter === f}
                  onClick={e => { e.stopPropagation(); setDateFilter(f); setSortOpen(false); }}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Result count */}
      <div className="ht-count-row">
        <span className="vt-count">
          {filtered.length} task{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table or empty state */}
      {filtered.length === 0 ? (
        <div className="vt-empty">
          <div className="ht-empty-block">
            <Clock size={40} className="ht-empty-icon" />
            <p className="ht-empty-title">No completed tasks</p>
            <p>Completed tasks will appear here after sessions</p>
          </div>
        </div>
      ) : (
        <table className="vt-table">
          <colgroup>
            <col style={{ width: "25%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "21%" }} />
            <col style={{ width: "19%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "8%"  }} />
          </colgroup>
          <thead>
            <tr>
              <th>Task Name</th>
              <th>Completed By</th>
              <th>Location</th>
              <th>Completed At</th>
              <th>Session</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {pageSlice.map((entry, i) => {
              const location = entry.source && entry.destination
                ? `${entry.source} → ${entry.destination}`
                : entry.source || entry.destination || "—";
              return (
                <tr key={`${entry.id ?? i}-${entry.completedAtMs ?? i}`}>
                  <td className="ht-task-name">{entry.name}</td>
                  <td className="ht-muted">{resolveCompletedBy(entry) || "—"}</td>
                  <td>
                    <div className="ht-location">
                      <MapPin size={12} className="ht-location-icon" aria-hidden="true" />
                      <span className="ht-muted ht-sm">{location}</span>
                    </div>
                  </td>
                  <td className="ht-muted ht-sm">
                    {formatDate(entry.completedAtMs || entry.completedAt)}
                  </td>
                  <td className="ht-muted ht-sm">{entry.sessionDate || "—"}</td>
                  <td>
                    <span className="vt-pill vt-pill--active">Complete</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="vt-pagination" aria-label="Pagination">
          <button
            className="vt-page-btn"
            disabled={safePage === 1}
            aria-label="Previous page"
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            ←
          </button>
          {pageNumbers(totalPages, safePage).map((item, i) =>
            item === "…" ? (
              <span key={`ellipsis-${i}`} className="vt-page-ellipsis">…</span>
            ) : (
              <button
                key={item}
                className="vt-page-btn"
                aria-current={item === safePage ? "page" : undefined}
                onClick={() => setPage(item)}
              >
                {item}
              </button>
            )
          )}
          <button
            className="vt-page-btn"
            disabled={safePage === totalPages}
            aria-label="Next page"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
