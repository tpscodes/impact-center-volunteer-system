import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVolunteer, PRIORITY_COLORS, PRIORITY_LABELS } from '../context/VolunteerContext'

export default function TaskPool() {
  const navigate = useNavigate()
  const { volunteerId, availableTasks, activeTask, hasActiveTask, claimedTasks, logout } = useVolunteer()
  const [search, setSearch] = useState('')

  const filtered = availableTasks.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F8F8FA' }}>

      {/* ── Header ── */}
      <header className="px-4 pt-6 pb-5 flex items-start justify-between" style={{ backgroundColor: '#FF9500' }}>
        <div>
          <p className="text-xs font-bold text-white uppercase tracking-widest" style={{ opacity: 0.85 }}>
            Experienced Volunteer
          </p>
          <h1 className="text-xl font-extrabold text-white mt-0.5">
            Welcome, Volunteer #{volunteerId ?? '----'}
          </h1>
        </div>
        <button
          onClick={() => { logout(); navigate('/') }}
          className="text-xs font-bold px-3 py-1.5 rounded-xl mt-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.2)', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          Exit
        </button>
      </header>

      {/* ── In-progress warning banner ── */}
      {hasActiveTask && (
        <div
          className="mx-4 mt-4 p-3 rounded-xl flex flex-col gap-2"
          style={{ backgroundColor: '#FEF9C3', border: '1px solid #FDE047' }}
        >
          <p className="text-sm font-bold" style={{ color: '#854D0E' }}>
            ⚠️ You have a task in progress. Complete it before claiming another.
          </p>
          <button
            onClick={() => navigate(`/experienced/task/${activeTask.id}`)}
            className="self-start px-3 py-1.5 rounded-lg text-xs font-bold text-white"
            style={{ backgroundColor: '#FF9500', border: 'none', cursor: 'pointer' }}
          >
            View My Task →
          </button>
        </div>
      )}

      {/* ── Search bar ── */}
      <div className="px-4 py-3 bg-white shadow-sm mt-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
            🔍
          </span>
          <input
            type="text"
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none"
            style={{ borderColor: '#E2E8F0', backgroundColor: '#F8F8FA' }}
          />
        </div>
      </div>

      {/* ── Section label ── */}
      <div className="px-4 pt-4 pb-1">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#1F497D', opacity: 0.5 }}>
          Available Tasks ({filtered.length})
        </p>
      </div>

      {/* ── Task cards ── */}
      <div className="flex-1 px-4 pb-28 flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span className="text-5xl">🎉</span>
            <p className="text-gray-400 font-semibold text-sm">
              {search ? 'No tasks match your search.' : 'All tasks have been claimed!'}
            </p>
          </div>
        ) : (
          filtered.map((task) => {
            const color = PRIORITY_COLORS[task.priority]
            const locked = hasActiveTask

            return (
              <div
                key={task.id}
                onClick={() => navigate(`/experienced/task/${task.id}`)}
                className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-3 cursor-pointer transition-all active:scale-98"
                style={{
                  opacity: locked ? 0.6 : 1,
                  border: '2px solid transparent',
                }}
                onMouseEnter={(e) => { if (!locked) e.currentTarget.style.borderColor = color + '55' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent' }}
              >
                {/* Top row */}
                <div className="flex items-start gap-3">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                    style={{ backgroundColor: color }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 text-base leading-tight">{task.name}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{task.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: color + '22', color }}
                    >
                      {PRIORITY_LABELS[task.priority]}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">{task.time}</span>
                  </div>
                </div>

                {/* Tap to view / locked indicator */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-medium">
                    Tap to view details →
                  </span>
                  {locked && (
                    <span className="text-xs font-semibold" style={{ color: '#94A3B8' }}>
                      🔒 Locked
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── Bottom tab bar ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 flex border-t bg-white"
        style={{ borderColor: '#E2E8F0' }}
      >
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
          <span className="text-lg">📋</span>
          Available Tasks
        </button>

        <button
          onClick={() => navigate('/experienced/mytasks')}
          className="flex-1 py-3 flex flex-col items-center gap-0.5 text-xs font-semibold relative"
          style={{ color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <span className="relative text-lg inline-block">
            ✅
            {claimedTasks.length > 0 && (
              <span
                className="absolute -top-1 -right-2.5 w-4 h-4 rounded-full text-white flex items-center justify-center font-bold"
                style={{ backgroundColor: '#FF9500', fontSize: '10px' }}
              >
                1
              </span>
            )}
          </span>
          My Task
        </button>
      </nav>
    </div>
  )
}
