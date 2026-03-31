// TaskDetail.jsx — Prop-driven task detail for Experienced Volunteers
// No hooks, no routing — rendered conditionally by TaskPool and MyTasks
import { useState, useEffect } from 'react'
import { Clock, Check } from 'lucide-react'

// Live elapsed timer shown in the status bar when task is in progress
function TaskTimer({ claimedAt }) {
  const [elapsed, setElapsed] = useState(Math.floor((Date.now() - claimedAt) / 1000))
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - claimedAt) / 1000)), 1000)
    return () => clearInterval(id)
  }, [claimedAt])
  const mins = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const secs = String(elapsed % 60).padStart(2, '0')
  return <span className="font-mono">{mins}:{secs}</span>
}

// props:
//   task       — the task object
//   isMyTask   — true if this is the volunteer's claimed in-progress task
//   isLocked   — true if volunteer already has a different active task (can't claim)
//   onClaim    — () => void  called when CLAIM TASK tapped
//   onComplete — () => void  called when MARK COMPLETE tapped
//   onUnclaim  — () => void  called when UNCLAIM tapped (returns task to incomplete pool)
//   onBack     — () => void  called when ← Back / Exit tapped
export default function TaskDetail({ task, isMyTask, isLocked, onClaim, onComplete, onUnclaim, onBack }) {
  const [acting, setActing] = useState(false)

  if (!task) return null

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

  const statusLabel = isMyTask ? 'In Progress' : task.status === 'incomplete' ? 'Incomplete' : 'Available'

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col" style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* Header — teal */}
      <div className="bg-[#09665e] px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-[#ccedeb] text-[11px] font-normal uppercase tracking-widest">
            Experienced Volunteer
          </p>
          <p className="text-white text-[20px] font-semibold">My Task</p>
        </div>
        <button
          onClick={onBack}
          className="border border-white text-white px-4 py-2 rounded-lg text-base bg-transparent cursor-pointer"
        >
          Exit
        </button>
      </div>

      {/* Task status bar — dark navy */}
      <div className="bg-[#1a1a1a] px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-[#6b7280] text-[11px] uppercase tracking-widest mb-1">{statusLabel}</p>
          <p className="text-white text-[20px] font-semibold">{task.name || task.item}</p>
        </div>
        <div className="flex items-center gap-2 text-[#6b7280] text-[14px]">
          <Clock size={14} />
          {isMyTask && task.claimedAt
            ? <TaskTimer claimedAt={task.claimedAt} />
            : <span>{task.estimatedTime || '—'}</span>
          }
        </div>
      </div>

      {/* Shift leader badge */}
      {isMyTask && (task.tags || []).includes('Shift Leader') && (
        <div className="mx-4 mt-3 px-4 py-3 bg-[#fff7ed] rounded-lg border-l-4 border-[#ff9500]">
          <p className="text-[#ff9500] text-[13px] font-bold">🟠 You are the Shift Leader — new volunteers can find you for help</p>
        </div>
      )}

      {/* Locked warning */}
      {isLocked && !isMyTask && (
        <div className="mx-4 mt-3 px-4 py-3 bg-[#fef9c3] rounded-lg border-l-4 border-[#f59e0b]">
          <p className="text-[#92400e] text-[13px] font-semibold">⚠️ Complete your current task before claiming another.</p>
        </div>
      )}

      {/* Task details card */}
      <div className="mx-4 mt-4 bg-white rounded-xl border border-[#e5e7eb] p-6">
        <div className="grid grid-cols-2 gap-6">

          <div>
            <p className="text-[#6b7280] text-[11px] uppercase tracking-widest mb-1">Action</p>
            <p className="text-[#1e1e1e] text-base">{task.action || '—'}</p>
          </div>

          <div>
            <p className="text-[#6b7280] text-[11px] uppercase tracking-widest mb-1">Item</p>
            <p className="text-[#1e1e1e] text-base">{task.item || '—'}</p>
          </div>

          <div>
            <p className="text-[#6b7280] text-[11px] uppercase tracking-widest mb-1">Source</p>
            <p className="text-[#1e1e1e] text-base">{task.source || '—'}</p>
          </div>

          <div>
            <p className="text-[#6b7280] text-[11px] uppercase tracking-widest mb-1">To</p>
            <p className="text-[#1e1e1e] text-base">{task.destination || '—'}</p>
          </div>

          <div>
            <p className="text-[#6b7280] text-[11px] uppercase tracking-widest mb-1">Est. Time</p>
            <p className="text-[#1e1e1e] text-base">{task.estimatedTime ? `~${task.estimatedTime} min` : '—'}</p>
          </div>

          {task.priority && (
            <div>
              <p className="text-[#6b7280] text-[11px] uppercase tracking-widest mb-1">Priority</p>
              <p className={`text-base font-semibold ${
                task.priority === 'Urgent' ? 'text-[#dc2626]' :
                task.priority === 'High'   ? 'text-[#ff9500]' :
                'text-[#6b7280]'
              }`}>{task.priority}</p>
            </div>
          )}

        </div>

        {/* Special instructions / comments */}
        {(task.specialInstructions || task.comments) && (
          <div className="mt-6 border-l-2 border-[#e5e7eb] pl-4">
            <p className="text-[#6b7280] text-[11px] uppercase tracking-widest mb-1">Special Instructions</p>
            <p className="text-[#6b7280] text-base italic">{task.specialInstructions || task.comments}</p>
          </div>
        )}

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {task.tags.map(tag => (
              <span key={tag} className="bg-[#ccedeb] text-[#09665e] text-[12px] font-semibold px-3 py-1 rounded-lg">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-0 mx-4 mt-4">
        {isMyTask ? (
          <>
            {onUnclaim && (
              <button
                onClick={handleUnclaim}
                disabled={acting}
                className="flex-1 bg-[#ef4444] text-white py-4 rounded-l-xl text-base font-medium hover:opacity-90 cursor-pointer disabled:opacity-50 border-none"
              >
                {acting ? 'Working…' : 'Unclaim'}
              </button>
            )}
            <button
              onClick={handleComplete}
              disabled={acting}
              className={`flex-1 bg-[#1a1a1a] text-white py-4 text-base font-medium flex items-center justify-center gap-2 hover:opacity-90 cursor-pointer disabled:opacity-50 border-none ${onUnclaim ? 'rounded-r-xl' : 'rounded-xl'}`}
            >
              <Check size={16} />
              {acting ? 'Saving…' : 'MARK COMPLETE'}
            </button>
          </>
        ) : isLocked ? (
          <button disabled className="flex-1 bg-[#f3f4f6] text-[#9ca3af] py-4 rounded-xl text-base font-medium border-none cursor-not-allowed">
            Complete Your Current Task First
          </button>
        ) : (
          <button
            onClick={handleClaim}
            disabled={acting}
            className="flex-1 bg-[#09665e] text-white py-4 rounded-xl text-base font-bold hover:opacity-90 cursor-pointer disabled:opacity-50 border-none"
          >
            {acting ? 'Claiming…' : 'CLAIM TASK'}
          </button>
        )}
      </div>

      {/* Back link */}
      <button
        onClick={onBack}
        className="text-center text-[#6b7280] text-base py-4 hover:underline bg-transparent border-none cursor-pointer"
      >
        ← Back to Task Pool
      </button>

      {/* Bottom tab bar */}
      <div className="mt-auto bg-white border-t border-[#e5e7eb] h-14 flex items-center mx-4 rounded-xl mb-4">
        <button
          onClick={onBack}
          className="flex-1 h-full flex items-center justify-center gap-2 text-[#6b7280] text-base bg-transparent border-none cursor-pointer"
        >
          <span>📋</span> Available Tasks
        </button>
        <button
          className="flex-1 h-full flex items-center justify-center gap-2 text-[#09665e] text-base border-b-2 border-[#09665e] bg-transparent border-l-0 border-r-0 border-t-0 cursor-default"
        >
          <Check size={16} className="text-[#09665e]" /> My Task
        </button>
      </div>

    </div>
  )
}
