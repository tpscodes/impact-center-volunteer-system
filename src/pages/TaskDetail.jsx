// TaskDetail.jsx — Prop-driven task detail for Experienced Volunteers
// No hooks, no routing — rendered conditionally by TaskPool and MyTasks
import { useState, useEffect } from 'react'
import { Clock, Check, ClipboardList } from 'lucide-react'

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

      {/* Header — Dark Teal */}
      <div className="bg-[#09665e] px-6 py-5 flex items-center justify-between">
        <div>
          <p className="text-[#ccedeb] text-[11px] uppercase tracking-widest font-normal">
            Experienced Volunteer
          </p>
          <p className="text-white text-[22px] font-semibold leading-tight mt-1">
            My Task
          </p>
        </div>
        <button
          onClick={onBack}
          className="border border-white text-white px-4 py-2 rounded-lg text-base hover:opacity-80 bg-transparent cursor-pointer"
        >
          Exit
        </button>
      </div>

      {/* Status bar — Dark Navy */}
      <div className="bg-[#0a2a3a] px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-[#6b7280] text-[11px] uppercase tracking-widest mb-1">{statusLabel}</p>
          <p className="text-white text-[18px] font-semibold">{task.name || task.item}</p>
        </div>
        <div className="flex items-center gap-2 text-[#6b7280] text-[13px]">
          <Clock size={13} />
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

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">

        {/* Task details card */}
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-6">

          {/* 2-column grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">

            <div>
              <p className="text-[#6b7280] text-[11px] uppercase tracking-widest mb-1">Action</p>
              <p className="text-[#0a2a3a] text-[16px]">{task.action || '—'}</p>
            </div>

            <div>
              <p className="text-[#6b7280] text-[11px] uppercase tracking-widest mb-1">Item</p>
              <p className="text-[#0a2a3a] text-[16px]">{task.item || '—'}</p>
            </div>

            <div>
              <p className="text-[#6b7280] text-[11px] uppercase tracking-widest mb-1">Source</p>
              <p className="text-[#0a2a3a] text-[16px]">{task.source || '—'}</p>
            </div>

            <div>
              <p className="text-[#6b7280] text-[11px] uppercase tracking-widest mb-1">To</p>
              <p className="text-[#0a2a3a] text-[16px]">{task.destination || '—'}</p>
            </div>

            <div>
              <p className="text-[#6b7280] text-[11px] uppercase tracking-widest mb-1">Est. Time</p>
              <p className="text-[#0a2a3a] text-[16px]">
                {task.estimatedTime ? `~${task.estimatedTime.toString().replace(/^~/, '').replace(/\s*min$/i, '')} min` : '—'}
              </p>
            </div>

            {task.priority && (
              <div>
                <p className="text-[#6b7280] text-[11px] uppercase tracking-widest mb-1">Priority</p>
                <p className={`text-[16px] font-semibold ${
                  task.priority === 'Urgent' ? 'text-[#dc2626]' :
                  task.priority === 'High'   ? 'text-[#ff9500]' :
                  'text-[#6b7280]'
                }`}>{task.priority}</p>
              </div>
            )}

          </div>

          {/* Special instructions / comments */}
          {(task.specialInstructions || task.comments) && (
            <div className="border-l-2 border-[#e5e7eb] pl-4 mt-6">
              <p className="text-[#6b7280] text-[11px] uppercase tracking-widest mb-1">
                Special Instructions
              </p>
              <p className="text-[#6b7280] text-[14px] italic leading-relaxed">
                {task.specialInstructions || task.comments}
              </p>
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
        {isMyTask ? (
          <div className="flex">
            {onUnclaim && (
              <button
                onClick={handleUnclaim}
                disabled={acting}
                className="flex-1 bg-[#dc2626] text-white py-4 rounded-l-xl text-[16px] font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 border-none"
              >
                {acting ? 'Working…' : 'Unclaim'}
              </button>
            )}
            <button
              onClick={handleComplete}
              disabled={acting}
              className={`flex-1 bg-[#09665e] text-white py-4 text-[16px] font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 border-none ${onUnclaim ? 'rounded-r-xl' : 'rounded-xl'}`}
            >
              <Check size={16} />
              {acting ? 'Saving…' : 'Mark Complete'}
            </button>
          </div>
        ) : isLocked ? (
          <div className="flex">
            <button disabled className="flex-1 bg-[#f3f4f6] text-[#9ca3af] py-4 rounded-xl text-[16px] font-medium border-none cursor-not-allowed">
              Complete Your Current Task First
            </button>
          </div>
        ) : (
          <div className="flex">
            <button
              onClick={handleClaim}
              disabled={acting}
              className="flex-1 bg-[#09665e] text-white py-4 rounded-xl text-[16px] font-bold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 border-none"
            >
              {acting ? 'Claiming…' : 'CLAIM TASK'}
            </button>
          </div>
        )}

        {/* Back link */}
        <button
          onClick={onBack}
          className="text-center text-[#6b7280] text-[14px] py-2 hover:underline bg-transparent border-none cursor-pointer"
        >
          ← Back to Task Pool
        </button>

      </div>

      {/* Bottom tab bar */}
      <div className="bg-white border-t border-[#e5e7eb] h-14 flex items-center shrink-0">
        <button
          onClick={onBack}
          className="flex-1 h-full flex flex-col items-center justify-center gap-1 text-[#6b7280] bg-transparent border-none cursor-pointer"
        >
          <ClipboardList size={18} />
          <span className="text-[12px]">Available</span>
        </button>
        <button
          className="flex-1 h-full flex flex-col items-center justify-center gap-1 text-[#09665e] border-b-2 border-[#09665e] bg-transparent border-l-0 border-r-0 border-t-0 cursor-default"
        >
          <Check size={18} />
          <span className="text-[12px] font-medium">My task</span>
        </button>
      </div>

    </div>
  )
}
