import { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import "./VolunteerBreakdownCard.css";

const PERSON_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8.4" r="3.6"/>
    <path d="M5.5 20.4v-1.8a4.9 4.9 0 0 1 4.9-4.9h3.2a4.9 4.9 0 0 1 4.9 4.9v1.8"/>
  </svg>
);

// "New" volunteers are walk-in users tracked only through task claims —
// no persistent profile. Count unique claimedBy IDs where claimedByType === "new".
function countNewVols(tasks) {
  const ids = new Set(
    tasks
      .filter(t => t.claimedByType === "new" && t.claimedBy)
      .map(t => t.claimedBy)
  );
  return ids.size;
}

// Monthly delta cannot be computed — no historical volunteer-count snapshots in Firebase.
export default function VolunteerBreakdownCard({ tasks = [] }) {
  const [volunteers, setVolunteers] = useState(null); // null = loading

  useEffect(() => {
    const unsub = onValue(
      ref(db, "volunteers"),
      (snap) => {
        const data = snap.val();
        setVolunteers(data ? Object.values(data) : []);
      },
      () => setVolunteers([])
    );
    return () => unsub();
  }, []);

  const experienced = volunteers?.length ?? 0;
  const newVols     = countNewVols(tasks);
  const total       = experienced + newVols;

  const ROWS = [
    { label: "Experienced Volunteers", sub: `${experienced} registered` },
    { label: "New Volunteers",         sub: `${newVols} this session`   },
  ];

  return (
    <div className="vbc">
      <div className="vbc__headline">
        {volunteers === null ? (
          <span className="vbc__loading">Loading…</span>
        ) : (
          <>
            <span className="vbc__value">{total}</span>
            <span className="vbc__unit">Volunteers</span>
          </>
        )}
      </div>

      <div className="vbc__rows">
        {ROWS.map(row => (
          <div key={row.label} className="vbc__row">
            <span className="vbc__icon">{PERSON_ICON}</span>
            <span className="vbc__text">
              <span className="vbc__label">{row.label}</span>
              <span className="vbc__sub">{row.sub}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
