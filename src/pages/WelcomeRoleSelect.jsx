import { useNavigate } from 'react-router-dom';
import AuthCardLayout from '../components/AuthCardLayout';
import VoloLogo from '../components/VoloLogo';

// Illustration images — place these files in /public:
//   /auth-bg.png           (full-bleed background, all screens)
//   /auth-illus-role.png   (left panel illustration for this screen)
const BG_IMAGE    = '/auth-bg.png';
const ILLUS_IMAGE = '/auth-illus-role.png';

const EASE = 'cubic-bezier(0.16,1,0.3,1)';

function RoleCard({ icon, title, subtitle, primary, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        width: '100%',
        padding: '14px 16px',
        borderRadius: 14,
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
        background: primary ? '#09665E' : '#D3EDE9',
        color: primary ? '#fff' : '#0A2A3A',
        transition: `transform 0.18s ${EASE}, box-shadow 0.18s ${EASE}`,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(10,42,58,0.08)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '';
      }}
      onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)'; }}
      onMouseUp={e => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(10,42,58,0.08)';
      }}
    >
      <span style={{
        width: 38, height: 38, borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: primary ? 'rgba(255,255,255,0.15)' : 'rgba(10,42,58,0.08)',
        flexShrink: 0,
      }}>
        {icon}
      </span>
      <span style={{ flex: 1 }}>
        <p style={{ fontSize: 14.5, fontWeight: 600, margin: 0 }}>{title}</p>
        <p style={{ fontSize: 12, margin: '2px 0 0', opacity: 0.75 }}>{subtitle}</p>
      </span>
      <span style={{ opacity: 0.6, flexShrink: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke={primary ? '#ffffff' : '#0A2A3A'} strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </span>
    </button>
  );
}

export default function WelcomeRoleSelect() {
  const navigate = useNavigate();

  return (
    <AuthCardLayout
      bgImage={BG_IMAGE}
      illusImage={ILLUS_IMAGE}
      illusAlt="Illustration of volunteers at a food pantry"
      attribution="Used by Impact Center · Greenwood, IN"
    >
      {/* Logo + heading */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
        <VoloLogo />
        <h1 style={{ fontSize: 21, fontWeight: 600, margin: '2px 0 0', color: '#0A2A3A' }}>Welcome</h1>
        <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>Select your role to get started.</p>
      </div>

      {/* Role cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 340 }}>
        <RoleCard
          title="Operations Manager"
          subtitle="Manage tasks and volunteers"
          onClick={() => navigate('/login')}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="#0A2A3A" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" width="19" height="19">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          }
        />
        <RoleCard
          primary
          title="Experienced Volunteer"
          subtitle="View and claim tasks"
          onClick={() => navigate('/experienced')}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" width="19" height="19">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          }
        />
        <RoleCard
          title="New Volunteer"
          subtitle="First time? Start here"
          onClick={() => navigate('/new-login')}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="#0A2A3A" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" width="19" height="19">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <path d="M20 8v6M23 11h-6"/>
            </svg>
          }
        />
      </div>
    </AuthCardLayout>
  );
}
