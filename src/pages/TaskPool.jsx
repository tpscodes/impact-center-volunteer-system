// TaskPool.jsx — Experienced volunteer task pool with tag filtering
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSharedTasks, VOLUNTEER_PROFILES } from '../hooks/useSharedTasks'
import TaskDetail from './TaskDetail'

const GRAY = { dark: "#1F2937", mid: "#374151", soft: "#6B7280", light: "#9CA3AF", border: "#E5E7EB", bg: "#F9FAFB" }

const ALL_TAGS = ["Warehouse", "Fridge", "Freezer", "Sorting", "Produce", "Delivery", "Shift Leader", "Warm", "Cool", "Kitchen", "Clothing", "General"]

export default function TaskPool() {
  const navigate = useNavigate()
  const { tasks, synced, error, session, claimTask, setShiftLeader, markTaskIncomplete } = useSharedTasks()
  const [search, setSearch] = useState('')
  const [activeTags, setActiveTags] = useState([])
  const [pendingClaim, setPendingClaim] = useState(null) // task awaiting shift leader name
  const [slName, setSlName] = useState('')
  const [selectedTask, setSelectedTask] = useState(null) // task being viewed in detail

  const volunteerId = sessionStorage.getItem('volunteerId') || '1234'
  const volunteerName = sessionStorage.getItem('volunteerName') || `Vol #${volunteerId}`

  const volunteerProfile = VOLUNTEER_PROFILES.find(v => v.id === volunteerId)
  const isShiftLeader = volunteerProfile?.isShiftLeader || false

  const myTask = tasks.find(t => t.assignedTo === volunteerId && t.status === 'in-progress')

  // In-progress tasks claimed by OTHER volunteers
  const claimedByOthers = tasks.filter(t =>
    t.status === 'in-progress' && t.assignedTo !== volunteerId &&
    !(t.assignedTo || '').startsWith('new-')
  )

  // Shift leader: in-progress new volunteer tasks they can supervise
  const newVolInProgress = isShiftLeader
    ? tasks.filter(t => t.status === 'in-progress' && (t.assignedTo || '').startsWith('new-'))
    : []

  // Incomplete tasks — claimable by any experienced volunteer
  let incompleteTasks = tasks.filter(t =>
    t.status === 'incomplete' &&
    (!t.assignedTo || t.assignedTo === 'experienced' || t.assignedTo === volunteerId || t.assignedTo === '')
  )

  // Available tasks for experienced volunteers
  let available = tasks.filter(t =>
    t.status === 'available' &&
    (!t.assignedTo || t.assignedTo === 'experienced' || t.assignedTo === volunteerId)
  )

  // Apply search + tag filters to available tasks
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

  // Apply tag filter — show tasks matching ANY active tag
  if (activeTags.length > 0) {
    available = available.filter(t =>
      activeTags.some(tag => (t.tags || []).includes(tag))
    )
    incompleteTasks = incompleteTasks.filter(t =>
      activeTags.some(tag => (t.tags || []).includes(tag))
    )
  }

  function toggleTag(tag) {
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
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
      <div style={{ background: GRAY.bg, minHeight: '100vh', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <div style={{ background: GRAY.mid, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Experienced Volunteer</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'white' }}>Welcome, {volunteerName}</div>
          </div>
          <button onClick={() => { sessionStorage.removeItem('volunteerId'); sessionStorage.removeItem('volunteerName'); navigate('/') }}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>Exit</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 80px)', padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: GRAY.dark, marginBottom: 8 }}>No active session right now</div>
          <div style={{ fontSize: 15, color: GRAY.soft }}>Check back when the pantry opens</div>
        </div>
      </div>
    )
  }

  // If a task is selected, show TaskDetail instead of pool
  if (selectedTask) {
    // Re-fetch from tasks to get latest status
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
        {/* Shift Leader modal rendered at root level so it appears above TaskDetail */}
        {pendingClaim && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', width: '100%', maxWidth: 360 }}>
              <div style={{ background: '#FF9500', padding: '18px 20px' }}>
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
                  onFocus={e => e.target.style.borderColor = '#FF9500'}
                  onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                />
                <button
                  onClick={handleSetShiftLeader}
                  disabled={!slName.trim()}
                  style={{ width: '100%', marginTop: 12, padding: '13px 0', background: slName.trim() ? '#FF9500' : '#D1D5DB', color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: slName.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
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
    <div style={{ background: GRAY.bg, minHeight: '100vh', fontFamily: "'Segoe UI', system-ui, sans-serif", paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ background: GRAY.mid, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Experienced Volunteer</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'white' }}>Welcome, {volunteerName}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: error ? '#EF4444' : synced ? '#86EFAC' : '#FCD34D' }} />
          <button
            onClick={() => { sessionStorage.removeItem('volunteerId'); sessionStorage.removeItem('volunteerName'); navigate('/') }}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}
          >Exit</button>
        </div>
      </div>

      {/* Active task banner */}
      {myTask && (
        <div style={{ background: GRAY.dark, margin: '16px 16px 0', borderRadius: 12, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>You're working on</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'white', marginTop: 2 }}>{myTask.name}</div>
          </div>
          <button onClick={() => navigate('/experienced/mytask')}
            style={{ background: 'white', color: GRAY.dark, border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            View →
          </button>
        </div>
      )}

      <div style={{ padding: '16px 16px 0' }}>
        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14 }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks…"
            style={{ width: '100%', padding: '10px 12px 10px 32px', border: `1.5px solid ${GRAY.border}`, borderRadius: 8, fontSize: 14, color: GRAY.dark, background: 'white', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Tag filter row */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10, msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
          {ALL_TAGS.map(tag => {
            const active = activeTags.includes(tag)
            return (
              <button key={tag} onClick={() => toggleTag(tag)}
                style={{
                  flexShrink: 0,
                  padding: '5px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  border: `1.5px solid ${active ? GRAY.mid : GRAY.border}`,
                  background: active ? GRAY.mid : 'white',
                  color: active ? 'white' : GRAY.soft,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                }}
              >
                {tag}
              </button>
            )
          })}
        </div>

        {/* Incomplete tasks — at the top */}
        {incompleteTasks.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Incomplete — Needs Finishing ({incompleteTasks.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {incompleteTasks.map(t => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTask(t)}
                  style={{ background: '#FFF5F5', borderRadius: 12, border: '1.5px solid #FECACA', overflow: 'hidden', cursor: 'pointer' }}
                >
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#DC2626', flex: 1 }}>{t.name}</div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', background: '#FEE2E2', borderRadius: 20, padding: '2px 8px', marginLeft: 8 }}>Incomplete</span>
                    </div>
                    <div style={{ fontSize: 12, color: GRAY.soft, marginBottom: 4 }}>{t.source} → {t.destination}</div>
                    <div style={{ fontSize: 11, color: GRAY.light }}>{t.estimatedTime}</div>
                    {t.rolledOver && <div style={{ fontSize: 11, color: '#DC2626', marginTop: 4, fontWeight: 600 }}>Rolled over from {t.rolledOverFrom}</div>}
                  </div>
                  <div style={{ padding: '8px 16px', borderTop: '1px solid #FECACA', fontSize: 12, fontWeight: 700, color: '#DC2626' }}>
                    Tap to claim and finish →
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ fontSize: 11, fontWeight: 700, color: GRAY.light, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          Available Tasks ({available.length})
        </div>

        {available.length === 0 && incompleteTasks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: GRAY.light, fontSize: 14 }}>
            {myTask
              ? 'Complete your current task first!'
              : (search || activeTags.length > 0)
                ? 'No tasks match your filters.'
                : 'No tasks available right now'}
          </div>
        )}

        {/* Task cards — tap to view detail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {available.map(t => (
            <div
              key={t.id}
              onClick={() => setSelectedTask(t)}
              style={{ background: 'white', borderRadius: 12, border: `1.5px solid ${GRAY.border}`, overflow: 'hidden', cursor: 'pointer' }}
            >
              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: GRAY.dark, flex: 1 }}>{t.name}</div>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: t.priority === 'Urgent' ? '#EF4444' : t.priority === 'High' ? '#FF9500' : '#9CA3AF',
                    background: t.priority === 'Urgent' ? '#FEE2E2' : t.priority === 'High' ? '#FFF7ED' : '#F3F4F6',
                    borderRadius: 20, padding: '2px 8px', marginLeft: 8,
                  }}>
                    {t.priority || 'Normal'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: GRAY.soft, marginBottom: 4 }}>{t.source} → {t.destination}</div>
                <div style={{ fontSize: 11, color: GRAY.light }}>{t.estimatedTime}</div>
                {t.comments && <div style={{ fontSize: 12, color: GRAY.soft, marginTop: 6, fontStyle: 'italic' }}>📌 {t.comments}</div>}

                {/* Tags */}
                {t.tags && t.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                    {t.tags.map(tag => (
                      <span key={tag} style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: GRAY.border, color: GRAY.mid }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ padding: '10px 16px', borderTop: `1px solid ${GRAY.border}`, fontSize: 12, fontWeight: 700, color: GRAY.soft }}>
                Tap to view details →
              </div>
            </div>
          ))}
        </div>
        {/* Claimed by others */}
        {claimedByOthers.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: GRAY.light, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 16, marginBottom: 8 }}>
              In Progress ({claimedByOthers.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {claimedByOthers.map(t => (
                <div key={t.id} style={{ background: '#F9FAFB', borderRadius: 12, border: `1.5px solid ${GRAY.border}`, padding: '12px 16px', opacity: 0.75 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: GRAY.soft }}>{t.name}</div>
                    <span style={{ fontSize: 10, fontWeight: 700, background: '#E5E7EB', color: GRAY.soft, borderRadius: 20, padding: '2px 8px' }}>In Progress</span>
                  </div>
                  <div style={{ fontSize: 12, color: GRAY.light }}>
                    🙋 Claimed by <strong style={{ color: GRAY.soft }}>{t.assignedName || 'a volunteer'}</strong>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Shift leader: new volunteer tasks in progress */}
        {newVolInProgress.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#FF9500', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 20, marginBottom: 8 }}>
              New Volunteer Tasks — In Progress ({newVolInProgress.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {newVolInProgress.map(t => (
                <div key={t.id} style={{ background: '#FFFBF0', borderRadius: 12, border: '1.5px solid #FCD34D', padding: '12px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: GRAY.dark }}>{t.name}</div>
                    <span style={{ fontSize: 10, fontWeight: 700, background: '#FFF3E0', color: '#C2410C', borderRadius: 20, padding: '2px 8px' }}>In Progress</span>
                  </div>
                  <div style={{ fontSize: 12, color: GRAY.soft }}>
                    {t.claimedByName
                      ? <>🙋 Claimed by <strong style={{ color: GRAY.dark }}>{t.claimedByName}</strong></>
                      : 'Unassigned'}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxWidth: 480, margin: '0 auto', background: 'white', borderTop: `1px solid ${GRAY.border}`, display: 'flex' }}>
        <button style={{ flex: 1, padding: '14px 0', background: 'none', border: 'none', fontSize: 12, fontWeight: 700, color: GRAY.dark, cursor: 'pointer', borderBottom: `2px solid ${GRAY.dark}` }}>
          📋 Available ({available.length})
        </button>
        <button onClick={() => navigate('/experienced/mytask')}
          style={{ flex: 1, padding: '14px 0', background: 'none', border: 'none', fontSize: 12, fontWeight: 600, color: GRAY.soft, cursor: 'pointer' }}>
          ✅ My Task {myTask ? '(1)' : ''}
        </button>
      </div>

      {/* Shift Leader name prompt modal */}
      {pendingClaim && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', width: '100%', maxWidth: 360 }}>
            {/* Orange header */}
            <div style={{ background: '#FF9500', padding: '18px 20px' }}>
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
                onFocus={e => e.target.style.borderColor = '#FF9500'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              />
              <button
                onClick={handleSetShiftLeader}
                disabled={!slName.trim()}
                style={{ width: '100%', marginTop: 12, padding: '13px 0', background: slName.trim() ? '#FF9500' : '#D1D5DB', color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: slName.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
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
