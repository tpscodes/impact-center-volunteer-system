import { useState, useRef } from "react";
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
  isSessionActive,
  onStartSessionClick,
  onEndSessionClick,
  onCreateTaskClick,
}) {
  const [ripples, setRipples] = useState([]);
  const blobRef = useRef(null);
  const startBtnRef = useRef(null);

  function handleSessionClick(e) {
    // Pin the blob's grow/shrink origin to where the click landed
    if (startBtnRef.current && blobRef.current) {
      const rect = startBtnRef.current.getBoundingClientRect();
      blobRef.current.style.setProperty("--origin-x", `${e.clientX - rect.left}px`);
    }
    if (isSessionActive) {
      onEndSessionClick();
    } else {
      onStartSessionClick();
    }
  }

  function handleCreateClick(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = Date.now() + Math.random();
    setRipples((rs) => [...rs, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples((rs) => rs.filter((r) => r.id !== id)), 560);
    onCreateTaskClick();
  }

  return (
    <div className="dh-bar">
      {/* Button-scale goo filter */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
        <defs>
          <filter id="dh-btn-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/>
            <feColorMatrix in="blur" mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -8" result="goo"/>
            <feComposite in="SourceGraphic" in2="goo" operator="atop"/>
          </filter>
        </defs>
      </svg>

      {/* Left — avatar + role */}
      <div className="dh-identity">
        <span className="dh-avatar" aria-hidden="true">{initials}</span>
        <span className="dh-role">Operations Manager</span>
      </div>

      {/* Right — date + two independent pill buttons */}
      <div className="dh-right">
        <span className="dh-date">{formatToday()}</span>

        <button
          ref={startBtnRef}
          type="button"
          className={`dh-btn dh-btn-start${isSessionActive ? " dh-btn-start--active" : ""}`}
          onClick={handleSessionClick}
          aria-pressed={isSessionActive}
        >
          <span className="dh-btn-start__goo" aria-hidden="true">
            <span className="dh-btn-start__blob" ref={blobRef}/>
          </span>
          <span className="dh-btn-start__label">
            {isSessionActive ? "End Session" : "Start Session"}
          </span>
        </button>

        <button
          type="button"
          className="dh-btn dh-btn-create"
          onClick={handleCreateClick}
        >
          <span className="dh-btn-create__goo" aria-hidden="true">
            {ripples.map((r) => (
              <span key={r.id} className="dh-ripple" style={{ left: r.x, top: r.y }}/>
            ))}
          </span>
          <span className="dh-btn-create__label">+ Create Task</span>
        </button>
      </div>
    </div>
  );
}
