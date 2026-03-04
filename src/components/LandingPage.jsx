import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const navigate = useNavigate()

  const buttons = [
    {
      label: 'Operations Manager',
      emoji: '🔒',
      bg: '#374151',
      hover: '#1F2937',
      to: '/manager/login',
    },
    {
      label: 'Experienced Volunteer',
      emoji: '👤',
      bg: '#6B7280',
      hover: '#4B5563',
      to: '/experienced',
    },
    {
      label: 'New Volunteer',
      emoji: '🆕',
      bg: '#9CA3AF',
      hover: '#6B7280',
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

      {/* QR Code */}
      <div className="mt-12 flex flex-col items-center gap-3">
        <img
          src="/qr-code.png"
          alt="Scan to access on mobile"
          className="rounded-xl shadow-sm"
          style={{ width: 140, height: 140, objectFit: 'contain' }}
        />
        <p className="text-sm font-medium" style={{ color: '#64748B' }}>
          Scan to access on mobile
        </p>
      </div>
    </div>
  )
}
