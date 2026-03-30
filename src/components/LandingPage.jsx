import { useNavigate } from 'react-router-dom'
import { User, Users, UserPlus } from 'lucide-react'

const ILLUSTRATION_URL = 'https://www.figma.com/api/mcp/asset/23e9b4f1-869d-433e-90b7-3c7516075322'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: "'Inter', system-ui, sans-serif",
        maxWidth: 390,
        margin: '0 auto',
        paddingTop: 52,
        paddingBottom: 24,
        boxSizing: 'border-box',
      }}
    >
      {/* Title */}
      <div style={{ textAlign: 'center', paddingLeft: 16, paddingRight: 16 }}>
        <h1 style={{ fontSize: 32, fontWeight: 400, color: '#1e1e1e', margin: 0, letterSpacing: 0 }}>
          IMPACT CENTER
        </h1>
        <p style={{ fontSize: 16, fontWeight: 400, color: '#757575', margin: '6px 0 0' }}>
          Volunteer Task Management
        </p>
        <div style={{ width: 55, height: 2, backgroundColor: '#0D9488', margin: '8px auto 0' }} />
      </div>

      {/* Illustration */}
      <div style={{ marginTop: 24, marginBottom: 24 }}>
        <img
          src={ILLUSTRATION_URL}
          alt="Volunteers illustration"
          style={{ width: 280, height: 200, objectFit: 'contain', display: 'block' }}
          onError={e => {
            e.target.style.display = 'none'
            e.target.nextSibling.style.display = 'block'
          }}
        />
        <div style={{ display: 'none', width: 280, height: 200, backgroundColor: '#f3f4f6', borderRadius: 12 }} />
      </div>

      {/* Welcome */}
      <div style={{ textAlign: 'center', marginBottom: 16, paddingLeft: 16, paddingRight: 16 }}>
        <h2 style={{ fontSize: 24, fontWeight: 600, color: '#1e1e1e', margin: 0 }}>Welcome</h2>
        <p style={{ fontSize: 20, fontWeight: 400, color: '#757575', margin: '16px 0 0' }}>
          Select your role to get started.
        </p>
      </div>

      {/* Role cards */}
      <div style={{ width: 342, display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>

        {/* Operations Manager */}
        <button
          onClick={() => navigate('/manager/login')}
          style={{
            width: '100%', height: 68, backgroundColor: '#99dbd7',
            border: 'none', borderRadius: 8, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 14,
            paddingLeft: 24, paddingRight: 24, boxSizing: 'border-box',
            textAlign: 'left',
          }}
        >
          <User size={32} color="#1e1e1e" strokeWidth={1.5} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1e1e1e', lineHeight: 1.3 }}>Operations Manager</div>
            <div style={{ fontSize: 14, fontWeight: 400, color: '#757575', marginTop: 2 }}>Manage task and volunteers</div>
          </div>
        </button>

        {/* Experienced Volunteer */}
        <button
          onClick={() => navigate('/experienced')}
          style={{
            width: '100%', height: 68, backgroundColor: '#09665e',
            border: 'none', borderRadius: 8, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 14,
            paddingLeft: 24, paddingRight: 24, boxSizing: 'border-box',
            textAlign: 'left',
          }}
        >
          <Users size={32} color="white" strokeWidth={1.5} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#f3f3f3', lineHeight: 1.3 }}>Experienced Volunteer</div>
            <div style={{ fontSize: 14, fontWeight: 400, color: '#b3b3b3', marginTop: 2 }}>View and claim tasks</div>
          </div>
        </button>

        {/* New Volunteer */}
        <button
          onClick={() => navigate('/new')}
          style={{
            width: '100%', height: 64, backgroundColor: '#ccedeb',
            border: 'none', borderRadius: 8, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 14,
            paddingLeft: 24, paddingRight: 24, boxSizing: 'border-box',
            textAlign: 'left',
          }}
        >
          <UserPlus size={32} color="#1e1e1e" strokeWidth={1.5} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1e1e1e', lineHeight: 1.3 }}>New Volunteer</div>
            <div style={{ fontSize: 14, fontWeight: 400, color: '#757575', marginTop: 2 }}>First time? Start here</div>
          </div>
        </button>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 'auto', paddingTop: 24, textAlign: 'center' }}>
        <p style={{ fontSize: 14, fontWeight: 400, color: '#757575', margin: 0 }}>
          Impact Center | Greenwood, IN
        </p>
      </div>
    </div>
  )
}
