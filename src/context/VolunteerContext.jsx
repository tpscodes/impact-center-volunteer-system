import { createContext, useContext, useState } from 'react'

export const PRIORITY_COLORS = {
  green:  '#34C759',
  blue:   '#2563EB',
  orange: '#FF9500',
}

export const PRIORITY_LABELS = {
  green:  'High',
  blue:   'Normal',
  orange: 'Urgent',
}

const INITIAL_TASKS = [
  {
    id: 1,
    name: 'Rack 7 - Fill Coffee',
    description: 'Warehouse → Rack 7',
    item: 'Coffee bags',
    action: 'Fill / Stock',
    source: 'Warehouse - Green shelf',
    destination: 'Rack 7',
    comments: 'Make sure to front the shelf when done. Rubber band 2 bags together if possible.',
    time: '~15 min',
    priority: 'green',
  },
  {
    id: 2,
    name: 'Rack 9 - Front Cereal',
    description: 'Aisle 9 → Front',
    item: 'Cereal boxes',
    action: 'Front / Face',
    source: 'Already on shelf',
    destination: 'Rack 9',
    comments: 'Pull all products forward, make it look full. Face labels outward.',
    time: '~10 min',
    priority: 'blue',
  },
  {
    id: 3,
    name: 'Door 1 - Fill Yogurt',
    description: 'Walk-in fridge → Door 1',
    item: 'Yogurt cups',
    action: 'Fill / Stock',
    source: 'Walk-in fridge',
    destination: 'Door 1 (main fridge)',
    comments: 'Check expiration dates, oldest in front (FIFO). Do not mix flavors on the same row.',
    time: '~12 min',
    priority: 'green',
  },
  {
    id: 4,
    name: 'Rack 15 - Stock Beans',
    description: 'Warehouse → Rack 15',
    item: 'Silver bags of Great Northern Beans',
    action: 'Stock / Relocate',
    source: 'Warehouse - Donation bins',
    destination: 'Rack 15',
    comments: 'Move peanut butter to Rack 18 first, then fill Rack 15 with beans.',
    time: '~20 min',
    priority: 'orange',
  },
]

const VolunteerContext = createContext(null)

export function VolunteerProvider({ children }) {
  const [volunteerId, setVolunteerId] = useState(null)
  const [availableTasks, setAvailableTasks] = useState(INITIAL_TASKS)
  // Max 1 claimed task at a time
  const [activeTask, setActiveTask] = useState(null)

  const hasActiveTask = activeTask !== null

  function claimTask(taskId) {
    if (hasActiveTask) return // enforce one-task constraint
    const task = availableTasks.find((t) => t.id === taskId)
    if (!task) return
    const claimed = { ...task, claimedAt: Date.now(), status: 'in_progress' }
    setAvailableTasks((prev) => prev.filter((t) => t.id !== taskId))
    setActiveTask(claimed)
  }

  function completeTask() {
    if (!activeTask) return
    setActiveTask(null)
  }

  function logout() {
    setVolunteerId(null)
    setAvailableTasks(INITIAL_TASKS)
    setActiveTask(null)
  }

  return (
    <VolunteerContext.Provider
      value={{
        volunteerId,
        setVolunteerId,
        availableTasks,
        // Expose active task as a single-item array so existing list UI still works
        claimedTasks: activeTask ? [activeTask] : [],
        activeTask,
        hasActiveTask,
        claimTask,
        completeTask,
        logout,
      }}
    >
      {children}
    </VolunteerContext.Provider>
  )
}

export function useVolunteer() {
  const ctx = useContext(VolunteerContext)
  if (!ctx) throw new Error('useVolunteer must be used within VolunteerProvider')
  return ctx
}
