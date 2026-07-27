import { Fragment } from "react";
import "./DashboardHero.css";

/**
 * Compute genuine daily task-completion counts for the last `days` calendar
 * days. completedTasks entries must have a real .completedAtMs (Unix ms).
 * Returns an array of length `days`, oldest→newest, suitable for sparkline bars.
 */
export function computeSparkline(completedTasks, days = 6) {
  const now = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (days - 1 - i));
    const dayStr = d.toDateString();
    return completedTasks.filter(
      t => t.completedAtMs && new Date(t.completedAtMs).toDateString() === dayStr
    ).length;
  });
}

/** Normalize raw counts to pixel heights. Zero values render as a 3px line. */
function barsToHeights(bars) {
  const max = Math.max(...bars);
  if (max === 0) return bars.map(() => 3);
  return bars.map(v => Math.max(3, Math.round((v / max) * 26)));
}

/**
 * DashboardHero — gradient stat-summary card replacing StatCards on every
 * dashboard-style page.
 *
 * sections: Array<{
 *   label:    string                         — chip text
 *   value:    number                         — large stat number
 *   delta:    string                         — helper text shown below the value
 *   chipTone: 'brand' | 'complete' | 'progress'
 *   bars?:    number[]                       — genuine daily counts; omit to hide chart
 * }>
 */
export default function DashboardHero({ sections }) {
  return (
    <div className="hero-card">
      <div className="hero-sections">
        {sections.map((s, i) => {
          const heights = s.bars ? barsToHeights(s.bars) : null;
          const chartTone = s.chipTone !== "brand" ? ` hero-chart--${s.chipTone}` : "";

          return (
            <Fragment key={s.label}>
              <div className="hero-section">
                <div className="hero-stat-top">
                  <span className={`hero-chip hero-chip--${s.chipTone || "brand"}`}>
                    {s.label}
                  </span>
                  {heights && (
                    <div className={`hero-chart${chartTone}`}>
                      {heights.map((h, bi) => (
                        <span
                          key={bi}
                          className="hero-bar"
                          style={{
                            height: h,
                            animationDelay: `${700 + i * 100 + bi * 40}ms`,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <p className="hero-value">{s.value}</p>
                <p className="hero-delta">{s.delta}</p>
              </div>
              {i < sections.length - 1 && <div className="hero-divider" />}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
