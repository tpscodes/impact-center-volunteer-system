// TaskPool.jsx — Experienced volunteer task pool
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSharedTasks, VOLUNTEER_PROFILES } from '../hooks/useSharedTasks'
import TaskDetail from './TaskDetail'
import { Search, MapPin, ArrowRight, Pin, ClipboardList } from 'lucide-react'

const TAG_FILTERS = ["All", "Warehouse", "Kitchen", "Clothing", "Freezer", "Sorting", "Produce"]
const GRAY = { dark: "#1e1e1e", soft: "#6B7280", light: "#9CA3AF", border: "#E5E7EB" }

function initials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function TaskPool() {
  const navigate = useNavigate()
  const location = useLocation()
  const pantryId = new URLSearchParams(location.search).get('pantry') || 'jason'
  const { tasks, synced, error, session, claimTask, setShiftLeader, markTaskIncomplete } = useSharedTasks(pantryId)
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState(pantryId === 'amber' ? 'Clothing' : 'All')
  const [pendingClaim, setPendingClaim] = useState(null)
  const [slName, setSlName] = useState('')
  const [selectedTask, setSelectedTask] = useState(null)

  const volunteerId = sessionStorage.getItem('volunteerId') || ''
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
      navigate(`/experienced/mytask?pantry=${pantryId}`)
    }
  }

  async function handleSetShiftLeader() {
    if (!slName.trim() || !pendingClaim) return
    await setShiftLeader({ name: slName.trim(), taskId: pendingClaim.id })
    setPendingClaim(null)
    setSlName('')
    navigate(`/experienced/mytask?pantry=${pantryId}`)
  }

  const isSessionActive = session?.isActive && (
    session.type !== "timed" || !session.endTime || Date.now() < session.endTime
  )
  if (session !== null && session !== undefined && !isSessionActive) {
    return (
      <div style={{ minHeight: '100vh', background: '#F3F5F6', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
        <header style={{ background: 'linear-gradient(144.76deg, #0f7a70 14.286%, #0a2a3a 85.714%)', padding: '20px 20px 24px', borderRadius: '0 0 24px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.66)', margin: '0 0 2px' }}>Welcome</p>
            <p style={{ fontSize: 19, fontWeight: 700, color: '#fff', margin: 0 }}>{volunteerName}</p>
          </div>
          <button onClick={() => { sessionStorage.removeItem('volunteerId'); sessionStorage.removeItem('volunteerName'); navigate('/') }}
            style={{ height: 36, padding: '0 16px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.4)', background: 'transparent', color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
            Exit
          </button>
        </header>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#0A2A3A', margin: '0 0 8px' }}>No active session right now</p>
          <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>Check back when the pantry opens</p>
        </div>
      </div>
    )
  }

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
          onComplete={() => navigate(`/experienced/mytask?pantry=${pantryId}`)}
          onUnclaim={isMyTask ? async () => { await markTaskIncomplete(liveTask.id); setSelectedTask(null) } : undefined}
          onBack={() => setSelectedTask(null)}
        />
        {pendingClaim && <ShiftLeaderModal slName={slName} setSlName={setSlName} onConfirm={handleSetShiftLeader} onSkip={() => { setPendingClaim(null); setSlName(''); navigate(`/experienced/mytask?pantry=${pantryId}`) }} />}
      </>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F3F5F6', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <header style={{ background: 'linear-gradient(144.76deg, #0f7a70 14.286%, #0a2a3a 85.714%)', padding: '20px 20px 24px', borderRadius: '0 0 24px 24px', display: 'flex', flexDirection: 'column', gap: 16, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.66)', margin: '0 0 2px' }}>Welcome</p>
            <p style={{ fontSize: 19, fontWeight: 700, color: '#fff', margin: 0 }}>{volunteerName}</p>
          </div>
          <button
            onClick={() => { sessionStorage.removeItem('volunteerId'); sessionStorage.removeItem('volunteerName'); navigate('/') }}
            style={{ height: 36, padding: '0 16px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.4)', background: 'transparent', color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
            Exit
          </button>
        </div>

        {/* Working-on card */}
        {myTask && (
          <div style={{
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.22)',
            borderRadius: 16,
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
              <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ADE80', display: 'inline-block', animation: 'pulseGreen 2s infinite', flexShrink: 0 }} />
                You're working on
              </p>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{myTask.name}</p>
            </div>
            <button
              onClick={() => navigate(`/experienced/mytask?pantry=${pantryId}`)}
              style={{ height: 34, padding: '0 16px', borderRadius: 9999, background: '#fff', color: '#0A2A3A', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
              View →
            </button>
          </div>
        )}
      </header>

      {/* ── Scrollable content ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 12 }}>

        {/* Search bar */}
        <div style={{ margin: '16px 16px 0', height: 46, border: '1px solid #E5E7EB', borderRadius: 9999, display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', background: '#fff' }}>
          <Search size={16} color="#9CA3AF" style={{ flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search Task"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 14, color: '#0A2A3A', width: '100%', background: 'transparent' }}
          />
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '14px 16px 4px', scrollbarWidth: 'none' }}>
          {TAG_FILTERS.map(tag => (
            <button key={tag} onClick={() => setActiveTag(tag)}
              style={{
                flexShrink: 0,
                height: 34,
                padding: '0 15px',
                borderRadius: 9999,
                fontSize: 13,
                fontWeight: activeTag === tag ? 600 : 500,
                cursor: 'pointer',
                border: activeTag === tag ? 'none' : '1px solid #E5E7EB',
                background: activeTag === tag ? '#0A2A3A' : '#fff',
                color: activeTag === tag ? '#fff' : '#6B7280',
                whiteSpace: 'nowrap',
                fontFamily: 'inherit',
              }}>
              {tag}
            </button>
          ))}
        </div>

        <div style={{ padding: '8px 16px 4px' }}>

          {/* Incomplete tasks */}
          {incompleteTasks.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px 10px' }}>
                <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: '#DC2626', margin: 0 }}>Incomplete</h2>
                <span style={{ fontSize: 12, color: '#9CA3AF' }}>({incompleteTasks.length})</span>
              </div>
              {incompleteTasks.map(task => (
                <TaskCard key={task.id} task={task} statusLabel="Incomplete"
                  statusBg="#FFF0F0" statusFg="#DC2626"
                  onClaim={() => handleClaim(task)}
                  ctaText="Tap to claim and finish" />
              ))}
            </div>
          )}

          {/* Available Tasks */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px 10px' }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: '#6B7280', margin: 0 }}>Available Tasks</h2>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>({available.length})</span>
            </div>

            {available.length === 0 && incompleteTasks.length === 0 && (
              <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 14, padding: '40px 0' }}>
                {myTask ? 'Complete your current task first!' :
                 (search || activeTag !== 'All') ? 'No tasks match your filters.' : 'No tasks available right now'}
              </p>
            )}

            {available.map(task => (
              <TaskCard key={task.id} task={task}
                statusLabel={task.priority || 'Normal'}
                statusBg={task.priority === 'Urgent' ? '#FFF0F0' : task.priority === 'High' ? '#FFF3E0' : '#F3F4F6'}
                statusFg={task.priority === 'Urgent' ? '#DC2626' : task.priority === 'High' ? '#9A5000' : '#6B7280'}
                onClaim={() => handleClaim(task)}
                ctaText="Tap to claim and finish" />
            ))}
          </div>

          {/* In Progress — claimed by others */}
          {claimedByOthers.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px 10px' }}>
                <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: '#6B7280', margin: 0 }}>In Progress</h2>
                <span style={{ fontSize: 12, color: '#9CA3AF' }}>({claimedByOthers.length})</span>
              </div>
              {claimedByOthers.map(t => (
                <InProgressCard key={t.id} task={t} isMine={false} />
              ))}
            </div>
          )}

          {/* Shift leader: new volunteer tasks */}
          {newVolInProgress.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px 10px' }}>
                <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: '#9A5000', margin: 0 }}>New Volunteer Tasks</h2>
                <span style={{ fontSize: 12, color: '#9CA3AF' }}>({newVolInProgress.length})</span>
              </div>
              {newVolInProgress.map(t => (
                <div key={t.id} style={{ background: '#FFFBF0', border: '1px solid #FCD34D', borderRadius: 16, padding: 16, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#0A2A3A', margin: '0 0 4px', lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</p>
                    <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>
                      {t.claimedByName
                        ? <>Claimed by <strong style={{ color: '#0A2A3A' }}>{t.claimedByName}</strong></>
                        : 'Unassigned'}
                    </p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 9999, background: '#FFF3E0', color: '#9A5000', whiteSpace: 'nowrap', flexShrink: 0 }}>In Progress</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom tab bar ─────────────────────────────────────────────────── */}
      <nav style={{ background: '#D3EDE9', display: 'flex', padding: '6px 16px 10px', borderTop: '1px solid rgba(10,42,58,0.06)', flexShrink: 0 }}>
        <button style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '8px 0', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', color: '#0A2A3A', fontSize: 12.5, fontWeight: 700, position: 'relative' }}>
          <span style={{ position: 'absolute', top: -6, left: '20%', right: '20%', height: 3, background: '#0D9488', borderRadius: 2 }} />
          Available
        </button>
        <button
          onClick={() => navigate(`/experienced/mytask?pantry=${pantryId}`)}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '8px 0', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', color: '#8B95A1', fontSize: 12.5, fontWeight: 500 }}>
          My Task{myTask
            ? <span style={{ background: '#0D9488', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 9999, padding: '1px 6px', marginLeft: 4, display: 'inline-block' }}>1</span>
            : ''}
        </button>
      </nav>

      {/* ── Shift Leader name modal ─────────────────────────────────────────── */}
      {pendingClaim && (
        <ShiftLeaderModal
          slName={slName}
          setSlName={setSlName}
          onConfirm={handleSetShiftLeader}
          onSkip={() => { setPendingClaim(null); setSlName(''); navigate(`/experienced/mytask?pantry=${pantryId}`) }}
        />
      )}

      <style>{`
        @keyframes pulseGreen {
          0%   { box-shadow: 0 0 0 0 rgba(74,222,128,0.55); }
          70%  { box-shadow: 0 0 0 8px rgba(74,222,128,0); }
          100% { box-shadow: 0 0 0 0 rgba(74,222,128,0); }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
      `}</style>
    </div>
  )
}

// ── Task card ─────────────────────────────────────────────────────────────────
function TaskCard({ task, statusLabel, statusBg, statusFg, onClaim, ctaText }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 16, display: 'flex', gap: 12, marginBottom: 10, cursor: 'pointer', transition: 'border-color 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#0D9488'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#E5E7EB'}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: '#E6F5F3', color: '#0F7A70', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <ClipboardList size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <p style={{ fontSize: 14.5, fontWeight: 600, color: '#0A2A3A', margin: 0, lineHeight: 1.35 }}>{task.name || task.item}</p>
          <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 9999, background: statusBg, color: statusFg, whiteSpace: 'nowrap' }}>{statusLabel}</span>
        </div>
        {(task.source || task.destination) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: '#6B7280' }}>
            <MapPin size={12} style={{ flexShrink: 0 }} />
            <span>{[task.source, task.destination].filter(Boolean).join(' → ')}</span>
          </div>
        )}
        {(task.specialInstructions || task.comments) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>
            <Pin size={11} style={{ flexShrink: 0 }} />
            <span>{task.specialInstructions || task.comments}</span>
          </div>
        )}
        {task.rolledOver && (
          <p style={{ fontSize: 12, color: '#DC2626', margin: 0 }}>Rolled over from {task.rolledOverFrom}</p>
        )}
        <button
          onClick={e => { e.stopPropagation(); onClaim(); }}
          style={{ fontSize: 12.5, fontWeight: 600, color: '#0F7A70', display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', marginTop: 2 }}>
          {ctaText}
          <ArrowRight size={11} />
        </button>
      </div>
    </div>
  )
}

// ── In-progress card (claimed by others) ─────────────────────────────────────
function InProgressCard({ task, isMine }) {
  const name = task.assignedName || 'a volunteer'
  return (
    <div style={{ background: '#FAFBFB', border: '1px solid #E5E7EB', borderRadius: 16, padding: 16, display: 'flex', gap: 12, marginBottom: 10, opacity: 0.9 }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: '#F3F4F6', color: '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <ClipboardList size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <p style={{ fontSize: 14.5, fontWeight: 600, color: '#8B95A1', margin: 0, lineHeight: 1.35 }}>{task.name}</p>
          <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 9999, background: '#FFF3E0', color: '#9A5000', whiteSpace: 'nowrap' }}>In Progress</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6B7280' }}>
          <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#1B4256', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </span>
          Claimed by {isMine ? <strong style={{ color: '#0A2A3A' }}>you</strong> : <strong style={{ color: '#6B7280' }}>{name}</strong>}
        </div>
      </div>
    </div>
  )
}

// ── Shift leader name modal ───────────────────────────────────────────────────
function ShiftLeaderModal({ slName, setSlName, onConfirm, onSkip }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,42,58,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'white', borderRadius: 20, overflow: 'hidden', width: '100%', maxWidth: 360 }}>
        <div style={{ background: '#09665e', padding: '18px 20px' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Shift Leader Task</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'white', marginTop: 2 }}>What's your name?</div>
        </div>
        <div style={{ padding: 20 }}>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 16, marginTop: 0 }}>New volunteers will see you as their point of contact.</p>
          <input
            value={slName}
            onChange={e => setSlName(e.target.value)}
            placeholder="Your name…"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter' && slName.trim()) onConfirm() }}
            style={{ width: '100%', padding: '12px 14px', border: '2px solid #E5E7EB', borderRadius: 10, fontSize: 16, color: '#1e1e1e', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
            onFocus={e => e.target.style.borderColor = '#0d9488'}
            onBlur={e => e.target.style.borderColor = '#E5E7EB'}
          />
          <button
            onClick={onConfirm}
            disabled={!slName.trim()}
            style={{ width: '100%', marginTop: 12, padding: '13px 0', background: slName.trim() ? '#09665e' : '#D1D5DB', color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: slName.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
            Set as Shift Leader
          </button>
          <button
            onClick={onSkip}
            style={{ width: '100%', marginTop: 8, padding: '10px 0', background: 'none', color: '#9CA3AF', border: 'none', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}
