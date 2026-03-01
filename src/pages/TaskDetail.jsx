import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useVolunteer, PRIORITY_COLORS, PRIORITY_LABELS } from '../context/VolunteerContext'

// ── Live timer (reused from MyTasks) ─────────────────────────────────────────
function TaskTimer({ claimedAt }) {
  const [elapsed, setElapsed] = useState(Math.floor((Date.now() - claimedAt) / 1000))
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - claimedAt) / 1000)), 1000)
    return () => clearInterval(id)
  }, [claimedAt])
  const mins = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const secs = String(elapsed % 60).padStart(2, '0')
  return (
    <span className="font-mono font-bold" style={{ color: '#FF9500' }}>
      ⏱ {mins}:{secs}
    </span>
  )
}

// ── Detail row component ──────────────────────────────────────────────────────
function DetailRow({ label, value, highlight }) {
  return (
    <div
      className="flex flex-col gap-1 p-3 rounded-xl"
      style={{ backgroundColor: highlight ? '#FFF7ED' : '#F8FAFC' }}
    >
      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#94A3B8' }}>
        {label}
      </span>
      <span
        className="text-sm font-semibold leading-snug"
        style={{ color: highlight ? '#FF9500' : '#1E293B' }}
      >
        {value}
      </span>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TaskDetail() {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const { availableTasks, activeTask, hasActiveTask, claimTask, completeTask, logout } = useVolunteer()
  const [completing, setCompleting] = useState(false)
  const [claiming, setClaiming] = useState(false)

  const id = Number(taskId)

  // Find task in available pool or as the active (claimed) task
  const availableTask = availableTasks.find((t) => t.id === id)
  const isActiveTask  = activeTask?.id === id
  const task          = availableTask ?? (isActiveTask ? activeTask : null)

  if (!task) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4" style={{ backgroundColor: '#F8F8FA' }}>
        <span className="text-5xl">🔍</span>
        <p className="font-semibold text-gray-500">Task not found.</p>
        <button
          onClick={() => navigate('/experienced/tasks')}
          className="px-6 py-2.5 rounded-xl font-bold text-white text-sm"
          style={{ backgroundColor: '#FF9500', border: 'none', cursor: 'pointer' }}
        >
          ← Back to Tasks
        </button>
      </div>
    )
  }

  const priorityColor = PRIORITY_COLORS[task.priority]
  const priorityLabel = PRIORITY_LABELS[task.priority]
  const isAvailable   = !!availableTask
  const status        = isActiveTask ? 'in_progress' : 'available'

  function handleClaim() {
    if (hasActiveTask) return
    setClaiming(true)
    setTimeout(() => {
      claimTask(id)
      setClaiming(false)
      navigate('/experienced/mytasks')
    }, 400)
  }

  function handleComplete() {
    setCompleting(true)
    setTimeout(() => {
      completeTask()
      navigate('/experienced/tasks')
    }, 800)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F8F8FA' }}>

      {/* ── Header ── */}
      <header className="px-4 pt-6 pb-5" style={{ backgroundColor: '#FF9500' }}>
        <div className="flex items-start justify-between mb-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-white text-sm font-bold opacity-90"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            ← Back
          </button>
          <button
            onClick={() => { logout(); navigate('/') }}
            className="text-xs font-bold px-3 py-1.5 rounded-xl"
            style={{ backgroundColor: 'rgba(0,0,0,0.2)', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            Exit
          </button>
        </div>
        <p className="text-xs font-bold text-white uppercase tracking-widest" style={{ opacity: 0.85 }}>
          Task Details
        </p>
        <h1 className="text-xl font-extrabold text-white mt-0.5 leading-tight">{task.name}</h1>
      </header>

      {/* ── Status badge + timer ── */}
      <div className="px-4 pt-4 flex items-center gap-3">
        {isActiveTask ? (
          <>
            <span
              className="flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full"
              style={{ backgroundColor: '#FFF7ED', color: '#FF9500' }}
            >
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#FF9500' }} />
              🟠 In Progress
            </span>
            <TaskTimer claimedAt={activeTask.claimedAt} />
          </>
        ) : (
          <span
            className="flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full"
            style={{ backgroundColor: '#F0FDF4', color: '#34C759' }}
          >
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#34C759' }} />
            ⬜ Available
          </span>
        )}
      </div>

      {/* ── Task info card ── */}
      <div className="px-4 pt-4 pb-32 flex flex-col gap-3">

        {/* Priority + time row */}
        <div className="flex gap-3">
          <div
            className="flex-1 flex flex-col gap-1 p-3 rounded-xl"
            style={{ backgroundColor: priorityColor + '18' }}
          >
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#94A3B8' }}>
              Priority
            </span>
            <span className="text-sm font-bold" style={{ color: priorityColor }}>
              ● {priorityLabel}
            </span>
          </div>
          <div className="flex-1 flex flex-col gap-1 p-3 rounded-xl" style={{ backgroundColor: '#F8FAFC' }}>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#94A3B8' }}>
              Est. Time
            </span>
            <span className="text-sm font-semibold" style={{ color: '#1E293B' }}>⏱ {task.time}</span>
          </div>
        </div>

        {/* Detail rows */}
        <DetailRow label="Item"        value={task.item}        />
        <DetailRow label="Action"      value={task.action}      />
        <DetailRow label="Source"      value={task.source}      />
        <DetailRow label="Destination" value={task.destination} />

        {/* Comments — highlighted */}
        <div
          className="flex flex-col gap-1.5 p-4 rounded-xl"
          style={{ backgroundColor: '#FFF7ED', border: '1px solid #FDDCAA' }}
        >
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#FF9500' }}>
            📝 Special Instructions
          </span>
          <p className="text-sm leading-relaxed" style={{ color: '#92400E' }}>
            {task.comments}
          </p>
        </div>

        {/* Warning: already has a task (shown on available tasks only) */}
        {isAvailable && hasActiveTask && (
          <div
            className="flex flex-col gap-2 p-4 rounded-xl"
            style={{ backgroundColor: '#FEF9C3', border: '1px solid #FDE047' }}
          >
            <p className="text-sm font-bold" style={{ color: '#854D0E' }}>
              ⚠️ You already have a task in progress.
            </p>
            <p className="text-xs text-yellow-700">Complete your current task before claiming another.</p>
            <button
              onClick={() => navigate(`/experienced/task/${activeTask.id}`)}
              className="mt-1 w-full py-2 rounded-lg text-sm font-bold text-white"
              style={{ backgroundColor: '#FF9500', border: 'none', cursor: 'pointer' }}
            >
              View My Current Task →
            </button>
          </div>
        )}
      </div>

      {/* ── Sticky action button ── */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-white"
        style={{ borderTop: '1px solid #E2E8F0' }}
      >
        {isActiveTask ? (
          /* Mark complete */
          <button
            onClick={handleComplete}
            disabled={completing}
            className="w-full py-4 rounded-2xl font-bold text-white text-base tracking-wide transition-all active:scale-95"
            style={{
              backgroundColor: completing ? '#86EFAC' : '#34C759',
              border: 'none',
              cursor: completing ? 'not-allowed' : 'pointer',
            }}
          >
            {completing ? 'Completing… ✓' : 'MARK COMPLETE ✓'}
          </button>
        ) : hasActiveTask ? (
          /* Blocked — already has a task */
          <button
            disabled
            className="w-full py-4 rounded-2xl font-bold text-white text-base"
            style={{ backgroundColor: '#D1D5DB', border: 'none', cursor: 'not-allowed' }}
          >
            Complete Your Current Task First
          </button>
        ) : (
          /* Claim */
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="w-full py-4 rounded-2xl font-bold text-white text-base tracking-wide transition-all active:scale-95"
            style={{
              backgroundColor: claiming ? '#86EFAC' : '#34C759',
              border: 'none',
              cursor: claiming ? 'not-allowed' : 'pointer',
            }}
          >
            {claiming ? 'Claiming…' : 'CLAIM TASK'}
          </button>
        )}
      </div>
    </div>
  )
}
