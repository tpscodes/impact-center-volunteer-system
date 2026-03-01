import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { VolunteerProvider } from './context/VolunteerContext'
import ManagerLogin from './pages/ManagerLogin'
import ManagerDashboard from './pages/ManagerDashboard'
import VolunteerIdEntry from './pages/VolunteerIdEntry'
import TaskPool from './pages/TaskPool'
import MyTasks from './pages/MyTasks'
import TaskDetail from './pages/TaskDetail'

// ── Placeholder page factory ──────────────────────────────────────────────────
function Placeholder({ emoji, title, color }) {
  const navigate = useNavigate()
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4 px-4"
      style={{ backgroundColor: '#F8F8FA' }}
    >
      <span className="text-6xl">{emoji}</span>
      <h1 className="text-2xl font-extrabold" style={{ color: color || '#1F497D' }}>
        {title}
      </h1>
      <p className="text-sm text-gray-400">Coming soon</p>
      <button
        onClick={() => navigate('/')}
        className="mt-4 px-6 py-2 rounded-xl text-sm font-bold text-white"
        style={{ backgroundColor: color || '#1F497D', border: 'none', cursor: 'pointer' }}
      >
        ← Back to home
      </button>
    </div>
  )
}

// ── Landing page ──────────────────────────────────────────────────────────────
function LandingPage() {
  const navigate = useNavigate()

  const buttons = [
    {
      label: 'Operations Manager',
      emoji: '🔒',
      bg: '#DC2626',
      hover: '#B91C1C',
      to: '/manager/login',
    },
    {
      label: 'Experienced Volunteer',
      emoji: '👤',
      bg: '#FF9500',
      hover: '#E07B00',
      to: '/experienced',
    },
    {
      label: 'New Volunteer',
      emoji: '🆕',
      bg: '#34C759',
      hover: '#28A745',
      to: '/new',
    },
  ]

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
      style={{ backgroundColor: '#F8F8FA' }}
    >
      {/* Header */}
      <div className="text-center mb-10">
        <h1
          className="text-5xl font-extrabold tracking-widest uppercase"
          style={{ color: '#1F497D' }}
        >
          IMPACT CENTER
        </h1>
        <p
          className="mt-2 text-lg font-semibold tracking-wide uppercase"
          style={{ color: '#1F497D', opacity: 0.7 }}
        >
          Volunteer Task Management
        </p>
        <div
          className="mt-4 mx-auto h-1 w-24 rounded-full"
          style={{ backgroundColor: '#1F497D', opacity: 0.3 }}
        />
      </div>

      {/* Role Buttons */}
      <div className="w-full flex flex-col gap-4" style={{ maxWidth: '400px' }}>
        {buttons.map(({ label, emoji, bg, hover, to }) => (
          <button
            key={label}
            onClick={() => navigate(to)}
            className="w-full flex flex-col items-center justify-center rounded-2xl shadow-lg font-bold text-white transition-transform active:scale-95 cursor-pointer"
            style={{
              backgroundColor: bg,
              minHeight: '100px',
              fontSize: '1.25rem',
              border: 'none',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = bg)}
          >
            <span className="text-3xl mb-1">{emoji}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* QR Code Placeholder */}
      <div className="mt-12 flex flex-col items-center gap-3">
        <div
          className="w-24 h-24 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: '#E2E8F0', border: '2px dashed #94A3B8' }}
        >
          <svg
            width="56"
            height="56"
            viewBox="0 0 56 56"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="QR code placeholder"
          >
            <rect x="0"  y="0"  width="22" height="22" rx="2" fill="#94A3B8" />
            <rect x="4"  y="4"  width="14" height="14" rx="1" fill="#F8F8FA" />
            <rect x="7"  y="7"  width="8"  height="8"  rx="1" fill="#94A3B8" />
            <rect x="34" y="0"  width="22" height="22" rx="2" fill="#94A3B8" />
            <rect x="38" y="4"  width="14" height="14" rx="1" fill="#F8F8FA" />
            <rect x="41" y="7"  width="8"  height="8"  rx="1" fill="#94A3B8" />
            <rect x="0"  y="34" width="22" height="22" rx="2" fill="#94A3B8" />
            <rect x="4"  y="38" width="14" height="14" rx="1" fill="#F8F8FA" />
            <rect x="7"  y="41" width="8"  height="8"  rx="1" fill="#94A3B8" />
            <rect x="26" y="2"  width="4"  height="4"  rx="1" fill="#94A3B8" />
            <rect x="26" y="10" width="4"  height="4"  rx="1" fill="#94A3B8" />
            <rect x="26" y="18" width="4"  height="4"  rx="1" fill="#94A3B8" />
            <rect x="34" y="26" width="4"  height="4"  rx="1" fill="#94A3B8" />
            <rect x="42" y="26" width="4"  height="4"  rx="1" fill="#94A3B8" />
            <rect x="50" y="26" width="4"  height="4"  rx="1" fill="#94A3B8" />
            <rect x="26" y="34" width="4"  height="4"  rx="1" fill="#94A3B8" />
            <rect x="34" y="42" width="4"  height="4"  rx="1" fill="#94A3B8" />
            <rect x="42" y="34" width="4"  height="4"  rx="1" fill="#94A3B8" />
            <rect x="50" y="42" width="4"  height="4"  rx="1" fill="#94A3B8" />
            <rect x="26" y="50" width="4"  height="4"  rx="1" fill="#94A3B8" />
            <rect x="42" y="50" width="4"  height="4"  rx="1" fill="#94A3B8" />
            <rect x="2"  y="26" width="4"  height="4"  rx="1" fill="#94A3B8" />
            <rect x="10" y="26" width="4"  height="4"  rx="1" fill="#94A3B8" />
            <rect x="18" y="26" width="4"  height="4"  rx="1" fill="#94A3B8" />
          </svg>
        </div>
        <p className="text-sm font-medium" style={{ color: '#64748B' }}>
          Scan to access on mobile
        </p>
      </div>
    </div>
  )
}

// ── App with router + providers ───────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <VolunteerProvider>
        <Routes>
          {/* Landing */}
          <Route path="/"                       element={<LandingPage />} />

          {/* Manager flow */}
          <Route path="/manager/login"          element={<ManagerLogin />} />
          <Route path="/manager/dashboard"      element={<ManagerDashboard />} />

          {/* Experienced Volunteer flow */}
          <Route path="/experienced"            element={<VolunteerIdEntry />} />
          <Route path="/experienced/tasks"      element={<TaskPool />} />
          <Route path="/experienced/mytasks"      element={<MyTasks />} />
          <Route path="/experienced/task/:taskId" element={<TaskDetail />} />

          {/* Placeholders */}
          <Route path="/new"                    element={<Placeholder emoji="🆕" title="New Volunteer"  color="#34C759" />} />
          <Route path="/board"                  element={<Placeholder emoji="📋" title="Digital Board"  color="#2563EB" />} />
        </Routes>
      </VolunteerProvider>
    </BrowserRouter>
  )
}
