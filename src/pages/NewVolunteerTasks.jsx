import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const INITIAL_TASKS = [
  { id: 1, name: 'Empty Trash Cans',        location: 'Warehouse' },
  { id: 2, name: 'Flatten Cardboard Boxes', location: 'By recycling bin' },
  { id: 3, name: 'Front Cereal Shelves',    location: 'Rack 9' },
  { id: 4, name: 'Organize Donation Bins',  location: 'Warehouse tables' },
  { id: 5, name: 'Remove Old Boxes',        location: 'Pantry entrance' },
]

export default function NewVolunteerTasks() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState(INITIAL_TASKS.map(t => ({ ...t, status: 'available' })))

  const activeId   = tasks.find(t => t.status === 'in_progress' || t.status === 'completing')?.id
  const visibleTasks = tasks.filter(t => t.status !== 'done')
  const allDone    = tasks.every(t => t.status === 'done')

  function handleClaim(id) {
    if (activeId) return
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'in_progress' } : t))
  }

  function handleUnclaim(id) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'available' } : t))
  }

  function handleComplete(id) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'completing' } : t))
    setTimeout(() => {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'done' } : t))
    }, 1000)
  }

  // ── All done screen ───────────────────────────────────────────────────────
  if (allDone) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center"
        style={{ backgroundColor: '#F0FDF4' }}
      >
        <span style={{ fontSize: '5rem' }}>🎉</span>
        <h1 className="text-3xl font-extrabold" style={{ color: '#16A34A' }}>
          Great work!
        </h1>
        <p className="text-lg font-semibold" style={{ color: '#15803D' }}>
          All tasks complete.
        </p>
        <p className="text-base" style={{ color: '#166534' }}>
          See Jason for more assignments.
        </p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 px-8 py-3 rounded-2xl font-bold text-white text-base"
          style={{ backgroundColor: '#34C759', border: 'none', cursor: 'pointer' }}
        >
          ← Back to Home
        </button>
      </div>
    )
  }

  // ── Main task list ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F8F8FA' }}>

      {/* Header */}
      <header
        className="px-5 pt-8 pb-6 flex items-start justify-between"
        style={{ backgroundColor: '#34C759' }}
      >
        <div>
          <p
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: 'rgba(255,255,255,0.8)' }}
          >
            🆕 New Volunteer
          </p>
          <h1 className="text-2xl font-extrabold text-white mt-1 leading-tight">
            Welcome!
          </h1>
          <p className="text-sm font-medium text-white mt-0.5" style={{ opacity: 0.9 }}>
            Tap a task to get started
          </p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="text-xs font-bold px-3 py-1.5 rounded-xl mt-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.15)', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          Exit
        </button>
      </header>

      {/* Task count */}
      <div className="px-5 pt-5 pb-2">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#34C759', opacity: 0.7 }}>
          {visibleTasks.filter(t => t.status === 'available').length} tasks remaining
        </p>
      </div>

      {/* Task cards */}
      <div className="flex-1 px-4 pb-10 flex flex-col gap-4">
        {visibleTasks.map(task => {
          const isInProgress  = task.status === 'in_progress'
          const isCompleting  = task.status === 'completing'
          const isLocked      = !!activeId && !isInProgress && !isCompleting

          // Card colours per state
          let cardBg     = '#fff'
          let cardBorder = '2px solid #E2E8F0'
          if (isInProgress)  { cardBg = '#FFF7ED'; cardBorder = '2px solid #FF9500' }
          if (isCompleting)  { cardBg = '#F0FDF4'; cardBorder = '2px solid #34C759' }

          return (
            <div
              key={task.id}
              onClick={() => {
                if (task.status === 'available') handleClaim(task.id)
                else if (task.status === 'in_progress') handleUnclaim(task.id)
              }}
              className="rounded-2xl shadow-sm flex flex-col gap-3"
              style={{
                backgroundColor: cardBg,
                border: cardBorder,
                padding: '20px',
                minHeight: '80px',
                cursor: isLocked || isCompleting ? 'default' : 'pointer',
                opacity: isLocked ? 0.45 : 1,
                transition: 'background-color 0.3s, border-color 0.3s, opacity 0.3s',
              }}
            >
              {/* Task name + location */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <span
                    className="font-extrabold leading-tight"
                    style={{ fontSize: '1.1rem', color: isCompleting ? '#16A34A' : '#1E293B' }}
                  >
                    {isCompleting ? '✅ Complete!' : task.name}
                  </span>
                  {!isCompleting && (
                    <span className="text-sm font-medium" style={{ color: '#64748B' }}>
                      📍 {task.location}
                    </span>
                  )}
                </div>

                {/* Status badge */}
                {isInProgress && (
                  <span
                    className="flex-shrink-0 text-sm font-bold px-3 py-1 rounded-full"
                    style={{ backgroundColor: '#FF950022', color: '#FF9500' }}
                  >
                    🟠 In Progress
                  </span>
                )}
                {isCompleting && (
                  <span
                    className="flex-shrink-0 text-sm font-bold px-3 py-1 rounded-full"
                    style={{ backgroundColor: '#34C75922', color: '#16A34A' }}
                  >
                    ✅ Done
                  </span>
                )}
                {task.status === 'available' && !isLocked && (
                  <span className="flex-shrink-0 text-xs text-gray-400 font-medium">
                    Tap →
                  </span>
                )}
              </div>

              {/* TAP WHEN DONE button + cancel hint */}
              {isInProgress && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleComplete(task.id) }}
                    className="w-full py-4 rounded-xl font-extrabold text-white text-base tracking-wide transition-transform active:scale-95"
                    style={{ backgroundColor: '#34C759', border: 'none', cursor: 'pointer', marginTop: '4px' }}
                  >
                    TAP WHEN DONE ✓
                  </button>
                  <p className="text-xs text-center" style={{ color: '#FF9500', opacity: 0.7 }}>
                    Tap card to cancel
                  </p>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
