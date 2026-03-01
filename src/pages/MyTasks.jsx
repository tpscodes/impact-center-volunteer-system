import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVolunteer } from '../context/VolunteerContext'

// ── Live timer ────────────────────────────────────────────────────────────────
function TaskTimer({ claimedAt }) {
  const [elapsed, setElapsed] = useState(Math.floor((Date.now() - claimedAt) / 1000))
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - claimedAt) / 1000)), 1000)
    return () => clearInterval(id)
  }, [claimedAt])
  const mins = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const secs = String(elapsed % 60).padStart(2, '0')
  return (
    <span className="font-mono font-bold text-sm" style={{ color: '#FF9500' }}>
      ⏱ {mins}:{secs}
    </span>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MyTasks() {
  const navigate = useNavigate()
  const { activeTask, completeTask, availableTasks, logout } = useVolunteer()
  const [completing, setCompleting] = useState(false)

  function handleComplete() {
    setCompleting(true)
    setTimeout(() => {
      completeTask()
      setCompleting(false)
      navigate('/experienced/tasks')
    }, 800)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F8F8FA' }}>

      {/* ── Header ── */}
      <header className="px-4 pt-6 pb-5 flex items-start justify-between" style={{ backgroundColor: '#FF9500' }}>
        <div>
          <p className="text-xs font-bold text-white uppercase tracking-widest" style={{ opacity: 0.85 }}>
            Experienced Volunteer
          </p>
          <h1 className="text-xl font-extrabold text-white mt-0.5">My Current Task</h1>
        </div>
        <button
          onClick={() => { logout(); navigate('/') }}
          className="text-xs font-bold px-3 py-1.5 rounded-xl mt-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.2)', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          Exit
        </button>
      </header>

      {/* ── Content ── */}
      <div className="flex-1 px-4 pb-28 flex flex-col gap-3 pt-4">
        {!activeTask ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <span className="text-5xl">📭</span>
            <p className="font-semibold text-gray-500">No task claimed yet.</p>
            <p className="text-sm text-gray-400 max-w-xs">
              Go to Available Tasks to find and claim a task.
            </p>
            <button
              onClick={() => navigate('/experienced/tasks')}
              className="mt-3 px-6 py-2.5 rounded-xl font-bold text-white text-sm transition-transform active:scale-95"
              style={{ backgroundColor: '#FF9500', border: 'none', cursor: 'pointer' }}
            >
              Browse Available Tasks
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs font-bold uppercase tracking-widest pb-1" style={{ color: '#1F497D', opacity: 0.5 }}>
              In Progress
            </p>

            {/* Task card — clickable to see full detail */}
            <div
              onClick={() => navigate(`/experienced/task/${activeTask.id}`)}
              className="rounded-2xl shadow-sm p-4 flex flex-col gap-3 cursor-pointer"
              style={{
                backgroundColor: completing ? '#DCFCE7' : '#fff',
                border: `2px solid ${completing ? '#34C759' : '#FF950033'}`,
                transition: 'background-color 0.4s, border-color 0.4s',
              }}
            >
              {/* Task name + time */}
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-800 text-base leading-tight">{activeTask.name}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{activeTask.description}</p>
                </div>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: '#FFF7ED', color: '#FF9500' }}
                >
                  {activeTask.time}
                </span>
              </div>

              {/* Quick detail preview */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg p-2.5" style={{ backgroundColor: '#F8FAFC' }}>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Item</p>
                  <p className="text-xs font-semibold text-gray-700 mt-0.5 leading-tight">{activeTask.item}</p>
                </div>
                <div className="rounded-lg p-2.5" style={{ backgroundColor: '#F8FAFC' }}>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Destination</p>
                  <p className="text-xs font-semibold text-gray-700 mt-0.5 leading-tight">{activeTask.destination}</p>
                </div>
              </div>

              {/* Status + timer */}
              <div className="flex items-center justify-between">
                <span
                  className="flex items-center gap-1.5 text-sm font-semibold"
                  style={{ color: completing ? '#34C759' : '#FF9500' }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: completing ? '#34C759' : '#FF9500' }}
                  />
                  {completing ? 'Completed! ✓' : '🟠 In Progress'}
                </span>
                {!completing && <TaskTimer claimedAt={activeTask.claimedAt} />}
              </div>

              <p className="text-xs text-gray-400 text-center">Tap card to view full details →</p>
            </div>

            {/* Mark complete button */}
            {!completing && (
              <button
                onClick={handleComplete}
                className="w-full py-4 rounded-2xl font-bold text-white text-base tracking-wide transition-transform active:scale-95"
                style={{ backgroundColor: '#34C759', border: 'none', cursor: 'pointer' }}
              >
                MARK COMPLETE ✓
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Bottom tab bar ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 flex bg-white"
        style={{ borderTop: '1px solid #E2E8F0' }}
      >
        <button
          onClick={() => navigate('/experienced/tasks')}
          className="flex-1 py-3 flex flex-col items-center gap-0.5 text-xs font-semibold"
          style={{ color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <span className="text-lg">📋</span>
          Available Tasks
          {availableTasks.length > 0 && (
            <span className="text-xs" style={{ color: '#94A3B8' }}>({availableTasks.length})</span>
          )}
        </button>

        <button
          className="flex-1 py-3 flex flex-col items-center gap-0.5 font-bold text-xs"
          style={{
            color: '#FF9500',
            background: 'none',
            border: 'none',
            borderTop: '2px solid #FF9500',
            cursor: 'pointer',
          }}
        >
          <span className="text-lg">✅</span>
          My Task
        </button>
      </nav>
    </div>
  )
}
