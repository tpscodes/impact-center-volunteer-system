import "./HeroSummary.css";

/**
 * HeroSummary — big-number dashboard hero for the Overview page.
 *
 * Props:
 *   activeTasks    number   — total active (non-complete) tasks
 *   inProgress     number   — tasks with status "in-progress"
 *   completed      number   — tasks completed today
 *   unclaimed      number   — tasks not yet assigned
 *   urgent         number   — tasks with priority "urgent"
 *   volunteersActive  number   — unique volunteers with assigned tasks
 *   experiencedVols   number   — volunteers with role "experienced" (or similar)
 *   newVols           number   — volunteers with role "new"
 *   isSessionActive   bool
 *   onCreateTask      fn
 *   onStartSession    fn
 *   onEndSession      fn
 */
export default function HeroSummary({
  activeTasks = 0,
  inProgress = 0,
  completed = 0,
  unclaimed = 0,
  urgent = 0,
  volunteersActive = 0,
  experiencedVols = 0,
  newVols = 0,
  isSessionActive = false,
  onCreateTask,
  onStartSession,
  onEndSession,
}) {
  const totalVols = experiencedVols + newVols;

  return (
    <div className="hs-card">
      {/* ── Left: task summary ── */}
      <div className="hs-left">
        <div className="hs-top">
          <span className="hs-pill">Active Tasks</span>
          <span className="hs-sub">{volunteersActive} volunteers active</span>
        </div>

        <div className="hs-number-row">
          <p className="hs-number">{activeTasks}</p>
          <div className="hs-signal">
            <span style={{ height: 10, animationDelay: "700ms" }} />
            <span style={{ height: 16, animationDelay: "740ms" }} />
            <span style={{ height: 22, animationDelay: "780ms" }} />
            <span style={{ height: 32, animationDelay: "820ms" }} />
          </div>
        </div>

        <div className="hs-sub-stats">
          <div className="hs-sub-stat">
            <p className="hs-sub-num">{inProgress}</p>
            <p className="hs-sub-label">In Progress</p>
          </div>
          <div className="hs-sub-stat">
            <p className="hs-sub-num">{completed}</p>
            <p className="hs-sub-label">Completed</p>
          </div>
          <div className="hs-sub-stat">
            <p className="hs-sub-num">{unclaimed}</p>
            <p className="hs-sub-label">Unclaimed</p>
          </div>
          <div className="hs-sub-stat">
            <p className={`hs-sub-num${urgent > 0 ? " urgent" : ""}`}>{urgent}</p>
            <p className="hs-sub-label">Urgent</p>
          </div>
        </div>
      </div>

      {/* ── Right: volunteer summary ── */}
      <div className="hs-right">
        <div>
          <div className="hs-vol-headline">
            <p className="hs-vol-count">{totalVols}</p>
            <span className="hs-vol-label">Volunteers</span>
          </div>
          <p className="hs-vol-trend">{volunteersActive} active this session</p>

          <div className="hs-breakdown">
            <div className="hs-breakdown-row">
              <div className="hs-breakdown-icon">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                </svg>
              </div>
              <div>
                <p className="hs-breakdown-t1">Experienced Volunteers</p>
                <p className="hs-breakdown-t2">{experiencedVols} volunteers</p>
              </div>
            </div>
            <div className="hs-breakdown-row">
              <div className="hs-breakdown-icon">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                </svg>
              </div>
              <div>
                <p className="hs-breakdown-t1">New Volunteers</p>
                <p className="hs-breakdown-t2">{newVols} volunteers</p>
              </div>
            </div>
          </div>
        </div>

        <div className="hs-footer">
          <button className="hs-btn-primary" type="button" onClick={onCreateTask}>
            + Create Task
          </button>
          {isSessionActive ? (
            <button className="hs-btn-outline danger" type="button" onClick={onEndSession}>
              End Session
            </button>
          ) : (
            <button className="hs-btn-outline" type="button" onClick={onStartSession}>
              Start Session
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
