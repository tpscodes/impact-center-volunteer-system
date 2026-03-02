import { useNavigate } from 'react-router-dom'

const metrics = [
  { label: 'Active Tasks',      value: 12, color: '#34C759', bg: '#DCFCE7', icon: '✅' },
  { label: 'Completed Today',   value: 8,  color: '#2563EB', bg: '#DBEAFE', icon: '📋' },
  { label: 'Active Volunteers', value: 7,  color: '#FF9500', bg: '#FEF3C7', icon: '👥' },
  { label: 'Families Served',   value: 47, color: '#DC2626', bg: '#FEE2E2', icon: '🏠' },
]

const quickActions = [
  { label: '+ Create New Task', color: '#2563EB', hover: '#1D4ED8' },
  { label: '📊 Import Excel',   color: '#34C759', hover: '#28A745' },
  { label: '📈 View Analytics', color: '#FF9500', hover: '#E07B00' },
]

const tasks = [
  {
    status: 'active',
    statusLabel: 'Active',
    statusColor: '#FF9500',
    task: 'Food Pantry Setup',
    location: 'Main Hall',
    assignedTo: 'Maria S.',
  },
  {
    status: 'completed',
    statusLabel: 'Done',
    statusColor: '#34C759',
    task: 'Registration Desk',
    location: 'Front Entrance',
    assignedTo: 'Carlos T.',
  },
  {
    status: 'pending',
    statusLabel: 'Pending',
    statusColor: '#94A3B8',
    task: 'Clothing Sort',
    location: 'Storage Room B',
    assignedTo: 'Unassigned',
  },
]

export default function ManagerDashboard() {
  const navigate = useNavigate()

  function handleLogout() {
    navigate('/')
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F8FA' }}>

      {/* ── Header ── */}
      <header
        className="w-full px-4 py-4 flex items-center justify-between shadow-sm"
        style={{ backgroundColor: '#1F497D' }}
      >
        <div>
          <h1 className="text-lg font-extrabold text-white leading-tight tracking-wide">
            Operations Manager Dashboard
          </h1>
          <p className="text-xs font-medium text-white" style={{ opacity: 0.75 }}>
            Welcome, Jason
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 rounded-xl text-sm font-bold transition-opacity active:scale-95"
          style={{ backgroundColor: '#DC2626', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          Logout
        </button>
      </header>

      <main className="w-full max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">

        {/* ── Metric Cards ── */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: '#1F497D', opacity: 0.6 }}>
            Today's Overview
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {metrics.map(({ label, value, color, bg, icon }) => (
              <div
                key={label}
                className="rounded-2xl p-4 flex flex-col gap-1 shadow-sm"
                style={{ backgroundColor: bg }}
              >
                <span className="text-2xl">{icon}</span>
                <span
                  className="text-4xl font-extrabold leading-none"
                  style={{ color }}
                >
                  {value}
                </span>
                <span className="text-xs font-semibold text-gray-500 leading-tight">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Quick Actions ── */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: '#1F497D', opacity: 0.6 }}>
            Quick Actions
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            {quickActions.map(({ label, color, hover }) => (
              <button
                key={label}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-white text-sm shadow-sm transition-transform active:scale-95"
                style={{ backgroundColor: color, border: 'none', cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hover)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = color)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* ── Task Table ── */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: '#1F497D', opacity: 0.6 }}>
            Current Tasks
          </h2>

          {/* Desktop table */}
          <div className="hidden sm:block bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#1F497D' }}>
                  {['Status', 'Task', 'Location', 'Assigned To', 'Actions'].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.map((t, i) => (
                  <tr
                    key={t.task}
                    className="border-t"
                    style={{ borderColor: '#F1F5F9', backgroundColor: i % 2 === 0 ? '#fff' : '#F8FAFC' }}
                  >
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2 font-semibold" style={{ color: t.statusColor }}>
                        <span
                          className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: t.statusColor }}
                        />
                        {t.statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{t.task}</td>
                    <td className="px-4 py-3 text-gray-500">{t.location}</td>
                    <td className="px-4 py-3 text-gray-500">{t.assignedTo}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          className="px-3 py-1 rounded-lg text-xs font-bold text-white"
                          style={{ backgroundColor: '#2563EB', border: 'none', cursor: 'pointer' }}
                        >
                          Edit
                        </button>
                        <button
                          className="px-3 py-1 rounded-lg text-xs font-bold text-white"
                          style={{ backgroundColor: '#DC2626', border: 'none', cursor: 'pointer' }}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 sm:hidden">
            {tasks.map((t) => (
              <div key={t.task} className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-800">{t.task}</span>
                  <span
                    className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
                    style={{ backgroundColor: t.statusColor + '22', color: t.statusColor }}
                  >
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: t.statusColor }} />
                    {t.statusLabel}
                  </span>
                </div>
                <p className="text-xs text-gray-500">📍 {t.location}</p>
                <p className="text-xs text-gray-500">👤 {t.assignedTo}</p>
                <div className="flex gap-2 mt-1">
                  <button
                    className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white"
                    style={{ backgroundColor: '#2563EB', border: 'none', cursor: 'pointer' }}
                  >
                    Edit
                  </button>
                  <button
                    className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white"
                    style={{ backgroundColor: '#DC2626', border: 'none', cursor: 'pointer' }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
