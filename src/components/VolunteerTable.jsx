import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import "./VolunteerTable.css";

const SORT_OPTIONS = [
  { value: "name-asc",  label: "Name A → Z"       },
  { value: "name-desc", label: "Name Z → A"       },
  { value: "recent",    label: "Recently Active"  },
  { value: "id",        label: "ID"               },
];

const STATUS_FILTERS = [
  { value: "all",      label: "All Status" },
  { value: "active",   label: "Active"     },
  { value: "inactive", label: "Inactive"   },
];

const ROLE_FILTERS = [
  { value: "all",      label: "All Roles"   },
  { value: "pantry",   label: "Pantry Only" },
  { value: "driver",   label: "Driver"      },
  { value: "both",     label: "Both"        },
];

const PAGE_SIZE = 25;

function volRoles(vol) {
  const r = ["Pantry"];
  if (vol.isDriver)   r.push("Driver");
  if (vol.isClothing) r.push("Clothing");
  return r;
}

function roleTagClass(role) {
  if (role === "Driver")   return "vt-role-tag vt-role-tag--driver";
  if (role === "Clothing") return "vt-role-tag vt-role-tag--clothing";
  return "vt-role-tag vt-role-tag--pantry";
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

// ── Two-view popover (menu → confirm) rendered via portal ─────────────────────
function VolunteerPopover({ open, rect, vol, onEdit, onRemove, onClose }) {
  const [view, setView] = useState("menu");
  const elRef = useRef(null);

  // Reset to menu view each time the popover opens on a new target
  useEffect(() => { if (open) setView("menu"); }, [open, vol?.id]);

  // Position relative to the kebab button's bounding rect
  useEffect(() => {
    const el = elRef.current;
    if (!el || !rect) return;
    el.style.top  = `${rect.bottom + 6}px`;
    el.style.left = `${Math.max(8, rect.right - 220)}px`;
  }, [rect, open]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    function handleOutside() { onClose(); }
    function handleKey(e) { if (e.key === "Escape") onClose(); }
    // Use setTimeout so the click that opened the popover doesn't immediately close it
    const tid = setTimeout(() => {
      document.addEventListener("click", handleOutside);
      document.addEventListener("keydown", handleKey);
    }, 0);
    return () => {
      clearTimeout(tid);
      document.removeEventListener("click", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  return createPortal(
    <div
      ref={elRef}
      className={`vol-pop${open ? " vol-pop--open" : ""}`}
      role="menu"
      aria-label="Volunteer actions"
      onClick={e => e.stopPropagation()}
    >
      {view === "menu" ? (
        <>
          <button
            role="menuitem"
            className="vol-pop__btn vol-pop__edit"
            onClick={() => { onEdit(vol); onClose(); }}
          >
            Edit volunteer
          </button>
          <button
            role="menuitem"
            className="vol-pop__btn vol-pop__remove"
            onClick={() => setView("confirm")}
          >
            Remove
          </button>
        </>
      ) : (
        <>
          <p className="vol-pop__confirm-text">
            Remove <strong>{vol?.name}</strong>? This can't be undone.
          </p>
          <div className="vol-pop__confirm-actions">
            <button
              className="vol-pop__btn vol-pop__cancel"
              onClick={() => setView("menu")}
            >
              Cancel
            </button>
            <button
              className="vol-pop__btn vol-pop__confirm-remove"
              onClick={() => { onRemove(vol.id); onClose(); }}
            >
              Remove
            </button>
          </div>
        </>
      )}
    </div>,
    document.body
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function VolunteerTable({ volunteers, onEdit, onRemove }) {
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter,   setRoleFilter]   = useState("all");
  const [sort,         setSort]         = useState("name-asc");
  const [sortOpen,     setSortOpen]     = useState(false);
  const [page,         setPage]         = useState(1);
  const [popover,      setPopover]      = useState(null); // { rect, vol }

  const sortRef = useRef(null);

  // Close sort panel on outside mousedown
  useEffect(() => {
    if (!sortOpen) return;
    function handler(e) {
      if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [sortOpen]);

  // Reset to page 1 whenever filters/sort change
  useEffect(() => setPage(1), [search, statusFilter, roleFilter, sort]);

  const filtered = volunteers
    .filter(v => {
      const q = search.toLowerCase();
      const matchSearch = !q
        || (v.name || "").toLowerCase().includes(q)
        || (v.id   || "").includes(search);
      const matchStatus =
        statusFilter === "all"      ? true :
        statusFilter === "active"   ? v.active === true :
        /* inactive */                v.active !== true;
      const matchRole =
        roleFilter === "all"     ? true :
        roleFilter === "pantry"  ? (!v.isDriver && !v.isClothing) :
        roleFilter === "driver"  ? v.isDriver === true :
        /* both — has at least one secondary role */
                                   (v.isDriver === true || v.isClothing === true);
      return matchSearch && matchStatus && matchRole;
    })
    .sort((a, b) => {
      if (sort === "name-asc")  return (a.name || "").localeCompare(b.name || "");
      if (sort === "name-desc") return (b.name || "").localeCompare(a.name || "");
      if (sort === "id")        return (a.id   || "").localeCompare(b.id   || "");
      if (sort === "recent") {
        if (!a.lastActive && !b.lastActive) return 0;
        if (!a.lastActive) return 1;
        if (!b.lastActive) return -1;
        return new Date(b.lastActive) - new Date(a.lastActive);
      }
      return 0;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageSlice  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // The volunteer record for the open popover — falls back to the snapshot so
  // the confirm view still shows the name even if the row has been removed
  const activeVol = popover
    ? (volunteers.find(v => v.id === popover.vol.id) ?? popover.vol)
    : null;

  const closePopover = useCallback(() => setPopover(null), []);

  const handleKebab = useCallback((e, vol) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setPopover(p => p?.vol.id === vol.id ? null : { rect, vol });
  }, []);

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sort)?.label ?? "Sort";

  return (
    <div className="vt-card">
      {/* Card header */}
      <div className="vt-head">
        <span className="vt-title">Experienced Volunteers</span>
      </div>

      {/* Search */}
      <label className="vt-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
        </svg>
        <input
          type="text"
          className="vt-search__input"
          placeholder="Search by name or ID…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </label>

      {/* Controls: sort + two filter groups + result count */}
      <div className="vt-controls">

        {/* Sort dropdown */}
        <div className="vt-sort" ref={sortRef}>
          <button
            type="button"
            className="vt-sort__trigger"
            aria-expanded={sortOpen}
            onClick={e => { e.stopPropagation(); setSortOpen(o => !o); }}
          >
            <span>{currentSortLabel}</span>
            <svg
              className="vt-sort__chevron"
              width="10" height="6" viewBox="0 0 10 6"
              fill="none" stroke="currentColor" strokeWidth="1.6"
              aria-hidden="true"
            >
              <path d="M1 1l4 4 4-4"/>
            </svg>
          </button>
          {sortOpen && (
            <div className="vt-sort__panel">
              {SORT_OPTIONS.map(o => (
                <button
                  key={o.value}
                  type="button"
                  className="vt-sort__option"
                  aria-selected={sort === o.value}
                  onClick={e => { e.stopPropagation(); setSort(o.value); setSortOpen(false); }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Status filter chips */}
        <div className="vt-filter-group" role="group" aria-label="Filter by status">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              type="button"
              className="vt-chip"
              aria-pressed={statusFilter === f.value}
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Role filter chips */}
        <div className="vt-filter-group" role="group" aria-label="Filter by role">
          {ROLE_FILTERS.map(f => (
            <button
              key={f.value}
              type="button"
              className="vt-chip"
              aria-pressed={roleFilter === f.value}
              onClick={() => setRoleFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <span className="vt-count">
          Showing {filtered.length} of {volunteers.length} volunteers
        </span>
      </div>

      {/* Table or empty state */}
      {filtered.length === 0 ? (
        <div className="vt-empty">No volunteers match your search or filters.</div>
      ) : (
        <table className="vt-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {pageSlice.map(vol => {
              const tags = volRoles(vol);
              return (
                <tr key={vol.id}>
                  <td><span className="vt-id">{vol.id}</span></td>
                  <td>
                    <div className="vt-name">{vol.name}</div>
                    <div className="vt-role-tags">
                      {tags.map(r => (
                        <span key={r} className={roleTagClass(r)}>{r}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className={`vt-pill ${vol.active ? "vt-pill--active" : "vt-pill--inactive"}`}>
                      {vol.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      className="vt-kebab"
                      aria-haspopup="menu"
                      aria-expanded={popover?.vol.id === vol.id}
                      aria-label={`Actions for ${vol.name}`}
                      onClick={e => handleKebab(e, vol)}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                        <circle cx="8" cy="3" r="1.4"/>
                        <circle cx="8" cy="8" r="1.4"/>
                        <circle cx="8" cy="13" r="1.4"/>
                      </svg>
                    </button>
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

      {/* Popover — portal, two views */}
      <VolunteerPopover
        open={!!popover && !!activeVol}
        rect={popover?.rect}
        vol={activeVol}
        onEdit={onEdit}
        onRemove={onRemove}
        onClose={closePopover}
      />
    </div>
  );
}
