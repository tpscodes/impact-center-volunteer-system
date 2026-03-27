// TaskDetail.jsx — Prop-driven task detail for Experienced Volunteers
// No hooks, no routing — rendered conditionally by TaskPool and MyTasks
import { useState, useEffect } from 'react'

const GRAY = { dark: "#1F2937", mid: "#374151", soft: "#6B7280", light: "#9CA3AF", border: "#E5E7EB", bg: "#F9FAFB" }

const PRIORITY_COLOR = {
  Urgent: "#EF4444",
  High:   "#FF9500",
  Normal: "#9CA3AF",
}

function TaskTimer({ claimedAt }) {
  const [elapsed, setElapsed] = useState(Math.floor((Date.now() - claimedAt) / 1000))
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - claimedAt) / 1000)), 1000)
    return () => clearInterval(id)
  }, [claimedAt])
  const mins = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const secs = String(elapsed % 60).padStart(2, '0')
  return (
    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15, color: GRAY.light }}>
      ⏱ {mins}:{secs}
    </span>
  )
}

// props:
//   task       — the task object
//   isMyTask   — true if this is the volunteer's claimed in-progress task
//   isLocked   — true if volunteer already has a different active task (can't claim)
//   onClaim    — () => void  called when CLAIM TASK tapped
//   onComplete — () => void  called when MARK COMPLETE tapped
//   onUnclaim  — () => void  called when UNCLAIM tapped (returns task to incomplete pool)
//   onBack     — () => void  called when ← Back tapped
export default function TaskDetail({ task, isMyTask, isLocked, onClaim, onComplete, onUnclaim, onBack }) {
  const [acting, setActing] = useState(false)

  if (!task) return null

  const priorityColor = PRIORITY_COLOR[task.priority] || GRAY.light

  async function handleClaim() {
    if (acting || isLocked) return
    setActing(true)
    await onClaim()
    setActing(false)
  }

  async function handleComplete() {
    if (acting) return
    setActing(true)
    await onComplete()
    setActing(false)
  }

  async function handleUnclaim() {
    if (acting || !onUnclaim) return
    setActing(true)
    await onUnclaim()
    setActing(false)
  }

  return (
    <div style={{ background: GRAY.bg, minHeight: '100vh', fontFamily: "'Segoe UI', system-ui, sans-serif", paddingBottom: 96 }}>

      {/* Header */}
      <div style={{ background: GRAY.mid, padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <button
            onClick={onBack}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            ← Back
          </button>
          {isMyTask && task.claimedAt && (
            <TaskTimer claimedAt={task.claimedAt} />
          )}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
          {isMyTask ? 'In Progress' : 'Task Details'}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'white', lineHeight: 1.3 }}>{task.name}</div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {/* Priority + Est Time row */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1, background: 'white', borderRadius: 12, padding: '12px 14px', border: `2px solid ${priorityColor}22` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: GRAY.light, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Priority</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: priorityColor }}>{task.priority || 'Normal'}</div>
          </div>
          {task.estimatedTime && (
            <div style={{ flex: 1, background: 'white', borderRadius: 12, padding: '12px 14px', border: `1.5px solid ${GRAY.border}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: GRAY.light, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Est. Time</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: GRAY.dark }}>{task.estimatedTime}</div>
            </div>
          )}
        </div>

        {/* Detail grid */}
        <div style={{ background: 'white', borderRadius: 14, border: `1.5px solid ${GRAY.border}`, overflow: 'hidden', marginBottom: 12 }}>
          {[
            ['ITEM',        task.item],
            ['ACTION',      task.action],
            ['SOURCE',      task.source],
            ['TO',          task.destination],
          ].filter(([, v]) => v).map(([label, val], i, arr) => (
            <div key={label} style={{
              padding: '14px 16px',
              borderBottom: i < arr.length - 1 ? `1px solid ${GRAY.border}` : 'none'
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: GRAY.light, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: GRAY.dark }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Comments */}
        {task.comments && (
          <div style={{ background: 'white', borderRadius: 14, border: `1.5px solid ${GRAY.border}`, padding: '14px 16px', marginBottom: 12, borderLeft: `4px solid ${GRAY.mid}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: GRAY.light, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>📌 Special Instructions</div>
            <div style={{ fontSize: 15, color: GRAY.dark, lineHeight: 1.55 }}>{task.comments}</div>
          </div>
        )}

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {task.tags.map(tag => (
              <span key={tag} style={{
                fontSize: 12, fontWeight: 700, padding: '4px 12px',
                borderRadius: 20, background: GRAY.border, color: GRAY.mid
              }}>{tag}</span>
            ))}
          </div>
        )}

        {/* Shift Leader badge */}
        {isMyTask && (task.tags || []).includes('Shift Leader') && (
          <div style={{ padding: '10px 14px', background: '#FFF7ED', borderRadius: 10, borderLeft: '4px solid #FF9500', fontSize: 13, color: '#FF9500', fontWeight: 700, marginBottom: 12 }}>
            🟠 You are the Shift Leader — new volunteers can find you for help
          </div>
        )}

        {/* Locked warning */}
        {isLocked && !isMyTask && (
          <div style={{ padding: '12px 14px', background: '#FEF9C3', borderRadius: 10, borderLeft: '4px solid #F59E0B', fontSize: 13, color: '#92400E', fontWeight: 600, marginBottom: 12 }}>
            ⚠️ Complete your current task before claiming another.
          </div>
        )}
      </div>

      {/* Sticky action button */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxWidth: 480, margin: '0 auto', background: 'white', borderTop: `1px solid ${GRAY.border}`, padding: '14px 16px' }}>
        {isMyTask ? (
          <div style={{ display: 'flex', gap: 10 }}>
            {onUnclaim && (
              <button
                onClick={handleUnclaim}
                disabled={acting}
                style={{ flex: 1, padding: '16px 0', background: acting ? '#D1D5DB' : '#EF4444', color: 'white', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: acting ? 'not-allowed' : 'pointer' }}
              >
                Unclaim
              </button>
            )}
            <button
              onClick={handleComplete}
              disabled={acting}
              style={{ flex: 2, padding: '16px 0', background: acting ? '#D1D5DB' : '#34C759', color: 'white', border: 'none', borderRadius: 14, fontSize: 17, fontWeight: 800, cursor: acting ? 'not-allowed' : 'pointer', letterSpacing: '0.02em' }}
            >
              {acting ? 'Saving…' : '✓ MARK COMPLETE'}
            </button>
          </div>
        ) : isLocked ? (
          <button disabled style={{ width: '100%', padding: '16px 0', background: '#F3F4F6', color: GRAY.light, border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'not-allowed' }}>
            Complete Your Current Task First
          </button>
        ) : (
          <button
            onClick={handleClaim}
            disabled={acting}
            style={{ width: '100%', padding: '16px 0', background: acting ? '#D1D5DB' : '#FF9500', color: 'white', border: 'none', borderRadius: 14, fontSize: 17, fontWeight: 800, cursor: acting ? 'not-allowed' : 'pointer', letterSpacing: '0.02em' }}
          >
            {acting ? 'Claiming…' : 'CLAIM TASK'}
          </button>
        )}
      </div>
    </div>
  )
}
