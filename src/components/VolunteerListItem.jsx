import "./VolunteerListItem.css";

/**
 * VolunteerListItem — compact volunteer row for the Active Volunteers card.
 *
 * Props:
 *   volunteer  object   — { id, name, tags: string[], ... }
 *   tint       bool     — alternating background tint
 *   index      number   — used for staggered animation delay
 *   onEdit     fn
 *   onDelete   fn
 */
export default function VolunteerListItem({ volunteer, tint = false, index = 0, onEdit, onDelete }) {
  const tags = volunteer.tags || [];
  const displayId = volunteer.volunteerId || volunteer.id || "—";

  return (
    <div
      className={`vli-row${tint ? " tint" : ""}`}
      style={{ animationDelay: `${560 + index * 70}ms` }}
    >
      <span className="vli-id">{displayId}</span>

      <div style={{ minWidth: 0 }}>
        <p className="vli-name">{volunteer.name || volunteer.displayName || "Unknown"}</p>
        <div className="vli-tags">
          {tags.map(tag => (
            <span
              key={tag}
              className={`vli-tag ${tag.toLowerCase() === "driver" ? "driver" : "pantry"}`}
            >
              {tag}
            </span>
          ))}
          {tags.length === 0 && (
            <span className="vli-tag pantry">Pantry</span>
          )}
        </div>
      </div>

    </div>
  );
}
