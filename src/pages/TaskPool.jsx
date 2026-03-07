// TaskPool.jsx — Experienced volunteer task pool with tag filtering
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSharedTasks } from '../hooks/useSharedTasks'

const GRAY = { dark: "#1F2937", mid: "#374151", soft: "#6B7280", light: "#9CA3AF", border: "#E5E7EB", bg: "#F9FAFB" }

const ALL_TAGS = ["Warehouse", "Fridge", "Freezer", "Sorting", "Produce", "Delivery", "Shift Leader", "Warm", "Cool", "Kitchen", "Clothing", "General"]

export default function TaskPool() {
  const navigate = useNavigate()
  const { tasks, synced, error, claimTask } = useSharedTasks()
  const [search, setSearch] = useState('')
  const [activeTags, setActiveTags] = useState([])

  const volunteerId = sessionStorage.getItem('volunteerId') || '1234'
  const volunteerName = sessionStorage.getItem('volunteerName') || `Vol #${volunteerId}`

  const myTask = tasks.find(t => t.assignedTo === volunteerId && t.status === 'in-progress')

  // Available tasks for experienced volunteers
  let available = tasks.filter(t =>
    t.status === 'available' &&
    (!t.assignedTo || t.assignedTo === 'experienced' || t.assignedTo === volunteerId)
  )

  // Apply search filter
  if (search) {
    available = available.filter(t =>
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
  }

  function toggleTag(tag) {
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  async function handleClaim(task) {
    await claimTask(task.id, volunteerId, volunteerName)
    navigate('/experienced/mytask')
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

        <div style={{ fontSize: 11, fontWeight: 700, color: GRAY.light, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          Available Tasks ({available.length})
        </div>

        {available.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: GRAY.light, fontSize: 14 }}>
            {myTask
              ? 'Complete your current task first!'
              : (search || activeTags.length > 0)
                ? 'No tasks match your filters.'
                : 'No tasks available right now'}
          </div>
        )}

        {/* Task cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {available.map(t => (
            <div key={t.id} style={{ background: 'white', borderRadius: 12, border: `1.5px solid ${GRAY.border}`, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: GRAY.dark, flex: 1 }}>{t.name}</div>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: t.priority === 'Urgent' ? '#374151' : t.priority === 'High' ? '#6B7280' : '#9CA3AF',
                    background: t.priority === 'Urgent' ? '#E5E7EB' : '#F3F4F6',
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

              <button
                onClick={() => !myTask && handleClaim(t)}
                disabled={!!myTask}
                style={{ width: '100%', padding: '12px 0', background: myTask ? '#F3F4F6' : GRAY.dark, color: myTask ? GRAY.light : 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: myTask ? 'not-allowed' : 'pointer' }}
              >
                {myTask ? 'Complete your current task first' : 'CLAIM TASK'}
              </button>
            </div>
          ))}
        </div>
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
    </div>
  )
}
