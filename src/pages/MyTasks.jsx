// MyTasks.jsx — Experienced volunteer "My Task" screen
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSharedTasks } from '../hooks/useSharedTasks'
import TaskDetail from './TaskDetail'

const GRAY = { dark: "#1F2937", mid: "#374151", soft: "#6B7280", light: "#9CA3AF", border: "#E5E7EB", bg: "#F9FAFB" }

function TaskTimer({ claimedAt }) {
  const [elapsed, setElapsed] = useState(Math.floor((Date.now() - claimedAt) / 1000))
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - claimedAt) / 1000)), 1000)
    return () => clearInterval(id)
  }, [claimedAt])
  const mins = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const secs = String(elapsed % 60).padStart(2, '0')
  return <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: GRAY.soft }}>⏱ {mins}:{secs}</span>
}

export default function MyTasks() {
  const navigate = useNavigate()
  const { tasks, synced, completeTask, clearShiftLeader } = useSharedTasks()
  const [completing, setCompleting] = useState(false)
  const [showDetail, setShowDetail] = useState(false)

  const volunteerId = sessionStorage.getItem('volunteerId') || '1234'
  const myTask = tasks.find(t => t.assignedTo === volunteerId && t.status === 'in-progress')

  async function handleComplete() {
    if (!myTask) return
    setCompleting(true)
    // completeTask auto-clears shiftLeader if task has "Shift Leader" tag
    // clearShiftLeader is also called explicitly here for safety
    const isShiftLeaderTask = (myTask.tags || []).includes('Shift Leader')
    const completedBy = myTask.assignedName || volunteerId
    await completeTask(myTask.id, completedBy)
    if (isShiftLeaderTask) await clearShiftLeader()
    setShowDetail(false)
    setTimeout(() => navigate('/experienced/tasks'), 1200)
  }

  // Show TaskDetail fullscreen when task card is tapped
  if (showDetail && myTask) {
    return (
      <TaskDetail
        task={myTask}
        isMyTask={true}
        isLocked={false}
        onClaim={null}
        onComplete={handleComplete}
        onBack={() => setShowDetail(false)}
      />
    )
  }

  return (
    <div style={{ background: GRAY.bg, minHeight: '100vh', fontFamily: "'Segoe UI', system-ui, sans-serif", paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ background: GRAY.mid, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Experienced Volunteer</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'white' }}>My Task</div>
        </div>
        <button onClick={() => { sessionStorage.removeItem('volunteerId'); navigate('/') }}
          style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>
          Exit
        </button>
      </div>

      <div style={{ padding: '20px 16px' }}>
        {!myTask ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{completing ? '✅' : '📭'}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: GRAY.dark, marginBottom: 4 }}>
              {completing ? 'Task Complete!' : 'No active task'}
            </div>
            <div style={{ fontSize: 13, color: GRAY.soft, marginBottom: 20 }}>
              {completing ? 'Heading back to task pool…' : 'Head back to pick a new one!'}
            </div>
            {!completing && (
              <button onClick={() => navigate('/experienced/tasks')}
                style={{ padding: '12px 24px', background: GRAY.dark, color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                ← Back to Tasks
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Task card — tap to open detail */}
            <div
              onClick={() => setShowDetail(true)}
              style={{ background: 'white', borderRadius: 14, border: `2px solid ${GRAY.dark}`, overflow: 'hidden', marginBottom: 16, cursor: 'pointer' }}
            >
              <div style={{ background: GRAY.dark, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>In Progress</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: 'white' }}>{myTask.name}</div>
                </div>
                <TaskTimer claimedAt={myTask.claimedAt || Date.now()} />
              </div>

              <div style={{ padding: '16px 18px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', marginBottom: myTask.comments ? 14 : 0 }}>
                  {[['ACTION', myTask.action], ['ITEM', myTask.item], ['FROM', myTask.source], ['TO', myTask.destination], ['EST. TIME', myTask.estimatedTime]]
                    .filter(([, v]) => v)
                    .map(([label, val]) => (
                      <div key={label}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: GRAY.light, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                        <div style={{ fontSize: 14, color: GRAY.dark, fontWeight: 600, marginTop: 2 }}>{val}</div>
                      </div>
                    ))}
                </div>
                {myTask.comments && (
                  <div style={{ background: GRAY.bg, borderRadius: 8, padding: '10px 12px', borderLeft: `3px solid ${GRAY.light}` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: GRAY.light, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Special Instructions</div>
                    <div style={{ fontSize: 13, color: GRAY.soft }}>{myTask.comments}</div>
                  </div>
                )}
                {/* Shift Leader badge */}
                {(myTask.tags || []).includes('Shift Leader') && (
                  <div style={{ marginTop: 12, padding: '8px 12px', background: '#FFF7ED', borderRadius: 8, borderLeft: '3px solid #FF9500', fontSize: 12, color: '#FF9500', fontWeight: 700 }}>
                    🟠 You are the Shift Leader — new volunteers can find you for help
                  </div>
                )}
                <div style={{ marginTop: 10, fontSize: 12, color: GRAY.light, fontWeight: 600 }}>Tap card for full details →</div>
              </div>
            </div>

            <button onClick={handleComplete} disabled={completing}
              style={{ width: '100%', padding: '16px 0', background: completing ? '#D1D5DB' : GRAY.dark, color: 'white', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: completing ? 'not-allowed' : 'pointer' }}>
              {completing ? 'Marking complete…' : '✓ MARK COMPLETE'}
            </button>

            <button onClick={() => navigate('/experienced/tasks')}
              style={{ width: '100%', marginTop: 10, padding: '12px 0', background: 'white', color: GRAY.soft, border: `2px solid ${GRAY.border}`, borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              ← Back to Task Pool
            </button>
          </>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxWidth: 480, margin: '0 auto', background: 'white', borderTop: `1px solid ${GRAY.border}`, display: 'flex' }}>
        <button onClick={() => navigate('/experienced/tasks')}
          style={{ flex: 1, padding: '14px 0', background: 'none', border: 'none', fontSize: 12, fontWeight: 600, color: GRAY.soft, cursor: 'pointer' }}>
          📋 Available Tasks
        </button>
        <button style={{ flex: 1, padding: '14px 0', background: 'none', border: 'none', fontSize: 12, fontWeight: 700, color: GRAY.dark, cursor: 'pointer', borderBottom: `2px solid ${GRAY.dark}` }}>
          ✅ My Task
        </button>
      </div>
    </div>
  )
}
