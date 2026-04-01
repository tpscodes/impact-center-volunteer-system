// TaskPool.jsx — Experienced volunteer task pool with tag filtering
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSharedTasks, VOLUNTEER_PROFILES } from '../hooks/useSharedTasks'
import TaskDetail from './TaskDetail'
import { Search, MapPin, ArrowRight, Pin } from 'lucide-react'

const GRAY = { dark: "#1e1e1e", soft: "#6B7280", light: "#9CA3AF", border: "#E5E7EB" }
const TAG_FILTERS = ["All", "Warehouse", "Kitchen", "Clothing", "Freezer", "Sorting", "Produce"]

export default function TaskPool() {
  const navigate = useNavigate()
  const { tasks, synced, error, session, claimTask, setShiftLeader, markTaskIncomplete } = useSharedTasks()
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState('All')
  const [pendingClaim, setPendingClaim] = useState(null)
  const [slName, setSlName] = useState('')
  const [selectedTask, setSelectedTask] = useState(null)

  const volunteerId = sessionStorage.getItem('volunteerId') || '1234'
  const volunteerName = sessionStorage.getItem('volunteerName') || `Vol #${volunteerId}`

  const volunteerProfile = VOLUNTEER_PROFILES.find(v => v.id === volunteerId)
  const isShiftLeader = volunteerProfile?.isShiftLeader || false

  const myTask = tasks.find(t => t.assignedTo === volunteerId && t.status === 'in-progress')

  const claimedByOthers = tasks.filter(t =>
    t.status === 'in-progress' && t.assignedTo !== volunteerId &&
    !(t.assignedTo || '').startsWith('new-')
  )

  const newVolInProgress = isShiftLeader
    ? tasks.filter(t => t.status === 'in-progress' && (t.assignedTo || '').startsWith('new-'))
    : []

  let incompleteTasks = tasks.filter(t =>
    t.status === 'incomplete' &&
    (!t.assignedTo || t.assignedTo === 'experienced' || t.assignedTo === volunteerId || t.assignedTo === '')
  )

  let available = tasks.filter(t =>
    t.status === 'available' &&
    (!t.assignedTo || t.assignedTo === 'experienced' || t.assignedTo === volunteerId)
  )

  if (search) {
    available = available.filter(t =>
      (t.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.item || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.destination || '').toLowerCase().includes(search.toLowerCase())
    )
    incompleteTasks = incompleteTasks.filter(t =>
      (t.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.item || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.destination || '').toLowerCase().includes(search.toLowerCase())
    )
  }

  if (activeTag !== 'All') {
    available = available.filter(t => (t.tags || []).includes(activeTag))
    incompleteTasks = incompleteTasks.filter(t => (t.tags || []).includes(activeTag))
  }

  async function handleClaim(task) {
    await claimTask(task.id, volunteerId, volunteerName)
    if ((task.tags || []).includes('Shift Leader')) {
      setPendingClaim(task)
      setSelectedTask(null)
    } else {
      navigate('/experienced/mytask')
    }
  }

  async function handleSetShiftLeader() {
    if (!slName.trim() || !pendingClaim) return
    await setShiftLeader({ name: slName.trim(), taskId: pendingClaim.id })
    setPendingClaim(null)
    setSlName('')
    navigate('/experienced/mytask')
  }

  // Session lock check
  const isSessionActive = session?.isActive && (
    session.type !== "timed" || !session.endTime || Date.now() < session.endTime
  )
  if (session !== null && session !== undefined && !isSessionActive) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex flex-col">
        <div className="bg-[#09665e] px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-[#f3f3f3] text-base font-normal">Welcome</p>
            <p className="text-[#f3f3f3] text-base font-semibold">{volunteerName}</p>
          </div>
          <button
            onClick={() => { sessionStorage.removeItem('volunteerId'); sessionStorage.removeItem('volunteerName'); navigate('/') }}
            className="border border-[#f3f3f3] text-[#f0fafa] px-4 py-2 rounded-lg text-base cursor-pointer bg-transparent"
          >
            Exit
          </button>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 py-20 px-8 text-center">
          <div className="text-5xl mb-4">🔒</div>
          <p className="text-xl font-bold text-[#1e1e1e] mb-2">No active session right now</p>
          <p className="text-base text-[#757575]">Check back when the pantry opens</p>
        </div>
      </div>
    )
  }

  // TaskDetail overlay
  if (selectedTask) {
    const liveTask = tasks.find(t => t.id === selectedTask.id) || selectedTask
    const isMyTask = liveTask.assignedTo === volunteerId && liveTask.status === 'in-progress'
    return (
      <>
        <TaskDetail
          task={liveTask}
          isMyTask={isMyTask}
          isLocked={!!myTask && !isMyTask}
          onClaim={() => handleClaim(liveTask)}
          onComplete={() => navigate('/experienced/mytask')}
          onUnclaim={isMyTask ? async () => { await markTaskIncomplete(liveTask.id); setSelectedTask(null) } : undefined}
          onBack={() => setSelectedTask(null)}
        />
        {pendingClaim && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', width: '100%', maxWidth: 360 }}>
              <div style={{ background: '#09665e', padding: '18px 20px' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Shift Leader Task</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'white', marginTop: 2 }}>What's your name?</div>
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ fontSize: 14, color: GRAY.soft, marginBottom: 16 }}>
                  New volunteers will see you as their point of contact.
                </div>
                <input
                  value={slName}
                  onChange={e => setSlName(e.target.value)}
                  placeholder="Your name…"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter' && slName.trim()) handleSetShiftLeader() }}
                  style={{ width: '100%', padding: '12px 14px', border: '2px solid #E5E7EB', borderRadius: 10, fontSize: 16, color: GRAY.dark, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  onFocus={e => e.target.style.borderColor = '#0d9488'}
                  onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                />
                <button
                  onClick={handleSetShiftLeader}
                  disabled={!slName.trim()}
                  style={{ width: '100%', marginTop: 12, padding: '13px 0', background: slName.trim() ? '#09665e' : '#D1D5DB', color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: slName.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
                >
                  Set as Shift Leader
                </button>
                <button
                  onClick={() => { setPendingClaim(null); setSlName(''); navigate('/experienced/mytask') }}
                  style={{ width: '100%', marginTop: 8, padding: '10px 0', background: 'none', color: GRAY.light, border: 'none', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col" style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* Header */}
      <div className="bg-[#09665e] px-6 py-5 flex items-center justify-between">
        <div>
          <p className="text-[#f3f3f3] text-base font-normal">Welcome</p>
          <p className="text-[#f3f3f3] text-base font-semibold">{volunteerName}</p>
        </div>
        <div className="flex items-center gap-3">
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: error ? '#EF4444' : synced ? '#86EFAC' : '#FCD34D' }} />
          <button
            onClick={() => { sessionStorage.removeItem('volunteerId'); sessionStorage.removeItem('volunteerName'); navigate('/') }}
            className="border border-[#f3f3f3] text-[#f0fafa] px-4 py-2 rounded-lg text-base cursor-pointer bg-transparent"
          >
            Exit
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-20">
      <div className="px-5 py-4 flex flex-col gap-4">

        {/* Active task banner */}
        {myTask && (
          <div
            onClick={() => navigate('/experienced/mytask')}
            className="bg-[#0a2a3a] rounded-lg p-4 flex items-center justify-between cursor-pointer"
          >
            <div>
              <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest mb-1">You're working on</p>
              <p className="text-white text-base font-semibold">{myTask.name}</p>
            </div>
            <button className="bg-white text-[#0a2a3a] text-sm font-bold px-3 py-2 rounded-lg border-none cursor-pointer">
              View →
            </button>
          </div>
        )}

        {/* Search bar */}
        <div className="bg-white border border-[#d9d9d9] rounded-full px-4 py-3 flex items-center gap-2">
          <input
            type="text"
            placeholder="Search Task"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 text-base text-[#1e1e1e] placeholder-[#b3b3b3] outline-none bg-transparent"
          />
          <Search size={16} className="text-[#b3b3b3] shrink-0" />
        </div>

        {/* Tag filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {TAG_FILTERS.map(tag => (
            <button key={tag}
              onClick={() => setActiveTag(tag)}
              className={`px-3 py-1.5 rounded-lg text-[14px] font-semibold shrink-0 border-none cursor-pointer ${
                activeTag === tag ? 'bg-[#09665e] text-[#f0fafa]' : 'bg-[#f0fafa] text-[#09665e]'
              }`}>
              {tag}
            </button>
          ))}
        </div>

        {/* Incomplete tasks */}
        {incompleteTasks.length > 0 && (
          <div>
            <p className="text-[#900b09] text-base font-semibold mb-2">Incomplete ({incompleteTasks.length})</p>
            {incompleteTasks.map(task => (
              <div key={task.id} className="bg-[#fdefec] border border-[#757575] rounded-lg p-3 mb-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[#900b09] text-base font-semibold">{task.name || task.item}</p>
                  <span className="bg-[#fcb3ad] text-[#900b09] text-[14px] font-semibold px-2 py-1 rounded-lg shrink-0">
                    Incomplete
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <MapPin size={14} className="text-[#6b7280] shrink-0" />
                  <p className="text-[#6b7280] text-[12px]">{task.source}</p>
                  {task.destination && <><ArrowRight size={14} className="text-[#6b7280] shrink-0" /><p className="text-[#6b7280] text-[12px]">{task.destination}</p></>}
                </div>
                {task.rolledOver && <p className="text-[12px] text-[#900b09] mt-1 font-semibold">Rolled over from {task.rolledOverFrom}</p>}
                <div className="border-t border-[#e5e7eb] mt-2 pt-2">
                  <button
                    onClick={() => handleClaim(task)}
                    className="flex items-center gap-1 text-[#0a2a3a] text-[12px] bg-transparent border-none cursor-pointer"
                  >
                    Tap to claim and finish <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Available tasks */}
        <div>
          <p className="text-[#1e1e1e] text-base font-semibold mb-2">Available Tasks ({available.length})</p>

          {available.length === 0 && incompleteTasks.length === 0 && (
            <p className="text-center text-[#9ca3af] text-[14px] py-10">
              {myTask ? 'Complete your current task first!' :
               (search || activeTag !== 'All') ? 'No tasks match your filters.' : 'No tasks available right now'}
            </p>
          )}

          {available.map(task => (
            <div key={task.id} className="bg-white border border-[#757575] rounded-lg p-3 mb-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[#303030] text-base font-semibold">{task.name || task.item}</p>
                {task.priority && (
                  <span className={`text-[14px] font-semibold px-2 py-1 rounded-lg shrink-0 ${
                    task.priority === 'High'   ? 'bg-[#ffe8a3] text-[#682d03]' :
                    task.priority === 'Urgent' ? 'bg-[#fcb3ad] text-[#900b09]' :
                    'bg-[#e6e6e6] text-[#757575]'
                  }`}>{task.priority}</span>
                )}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <MapPin size={14} className="text-[#6b7280] shrink-0" />
                <p className="text-[#6b7280] text-[12px]">{task.source}</p>
                {task.destination && <><ArrowRight size={14} className="text-[#6b7280] shrink-0" /><p className="text-[#0a2a3a] text-[12px]">{task.destination}</p></>}
              </div>
              {task.specialInstructions && (
                <div className="flex items-center gap-1 mt-1">
                  <Pin size={14} className="text-[#6b7280] shrink-0" />
                  <p className="text-[#6b7280] text-[12px] italic">{task.specialInstructions}</p>
                </div>
              )}
              {task.comments && (
                <div className="flex items-center gap-1 mt-1">
                  <Pin size={14} className="text-[#6b7280] shrink-0" />
                  <p className="text-[#6b7280] text-[12px] italic">{task.comments}</p>
                </div>
              )}
              {task.tags && task.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {task.tags.map(tag => (
                    <span key={tag} className="bg-[#ccedeb] text-[#09665e] text-[12px] font-semibold px-3 py-1 rounded-lg">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="border-t border-[#e5e7eb] mt-2 pt-2">
                <button
                  onClick={() => handleClaim(task)}
                  className="flex items-center gap-1 text-[#0a2a3a] text-[12px] bg-transparent border-none cursor-pointer"
                >
                  Tap to claim and finish <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Claimed by others */}
        {claimedByOthers.length > 0 && (
          <div>
            <p className="text-[#757575] text-[12px] font-bold uppercase tracking-wider mb-2">In Progress ({claimedByOthers.length})</p>
            {claimedByOthers.map(t => (
              <div key={t.id} className="bg-[#f9fafb] border border-[#e5e7eb] rounded-lg p-3 mb-2 opacity-75">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[#6b7280] text-[14px] font-semibold">{t.name}</p>
                  <span className="text-[12px] font-semibold bg-[#e5e7eb] text-[#6b7280] px-2 py-1 rounded-lg">In Progress</span>
                </div>
                <p className="text-[#9ca3af] text-[12px]">🙋 Claimed by <strong className="text-[#6b7280]">{t.assignedName || 'a volunteer'}</strong></p>
              </div>
            ))}
          </div>
        )}

        {/* Shift leader: new volunteer tasks */}
        {newVolInProgress.length > 0 && (
          <div>
            <p className="text-[#ff9500] text-[12px] font-bold uppercase tracking-wider mb-2">New Volunteer Tasks — In Progress ({newVolInProgress.length})</p>
            {newVolInProgress.map(t => (
              <div key={t.id} className="bg-[#fffbf0] border border-[#fcd34d] rounded-lg p-3 mb-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[#1e1e1e] text-[14px] font-semibold">{t.name}</p>
                  <span className="text-[12px] font-semibold bg-[#fff3e0] text-[#c2410c] px-2 py-1 rounded-lg">In Progress</span>
                </div>
                <p className="text-[#6b7280] text-[12px]">
                  {t.claimedByName
                    ? <>🙋 Claimed by <strong className="text-[#1e1e1e]">{t.claimedByName}</strong></>
                    : 'Unassigned'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>

      {/* Bottom tab bar */}
      <div className="bg-[#ccedeb] border-t border-[#09665e] fixed bottom-0 left-0 right-0 h-14 flex">
        <button className="flex-1 h-full flex items-center justify-center border-b-2 border-[#09665e] text-[#303030] text-base bg-transparent border-none cursor-pointer font-semibold">
          Available
        </button>
        <button
          onClick={() => navigate('/experienced/mytask')}
          className="flex-1 h-full flex items-center justify-center text-[#767676] text-base bg-transparent border-none cursor-pointer"
        >
          My task {myTask ? '(1)' : ''}
        </button>
      </div>

      {/* Shift Leader name prompt modal */}
      {pendingClaim && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', width: '100%', maxWidth: 360 }}>
            <div style={{ background: '#09665e', padding: '18px 20px' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Shift Leader Task</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'white', marginTop: 2 }}>What's your name?</div>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ fontSize: 14, color: GRAY.soft, marginBottom: 16 }}>
                New volunteers will see you as their point of contact.
              </div>
              <input
                value={slName}
                onChange={e => setSlName(e.target.value)}
                placeholder="Your name…"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter' && slName.trim()) handleSetShiftLeader() }}
                style={{ width: '100%', padding: '12px 14px', border: '2px solid #E5E7EB', borderRadius: 10, fontSize: 16, color: GRAY.dark, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                onFocus={e => e.target.style.borderColor = '#0d9488'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              />
              <button
                onClick={handleSetShiftLeader}
                disabled={!slName.trim()}
                style={{ width: '100%', marginTop: 12, padding: '13px 0', background: slName.trim() ? '#09665e' : '#D1D5DB', color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: slName.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
              >
                Set as Shift Leader
              </button>
              <button
                onClick={() => { setPendingClaim(null); setSlName(''); navigate('/experienced/mytask') }}
                style={{ width: '100%', marginTop: 8, padding: '10px 0', background: 'none', color: GRAY.light, border: 'none', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
