import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthCardLayout from '../components/AuthCardLayout';
import VoloLogo from '../components/VoloLogo';

// Place these files in /public:
//   /auth-bg.png             (shared background)
//   /auth-illus-new.png      (left panel illustration)
const BG_IMAGE    = '/auth-bg.png';
const ILLUS_IMAGE = '/auth-illus-new.png';

const EASE = 'cubic-bezier(0.16,1,0.3,1)';

function AuthInput({ id, label, value, onChange, placeholder, autoComplete }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, width: '100%' }}>
      <label htmlFor={id} style={{ fontSize: 13.5, fontWeight: 500, color: '#0A2A3A' }}>{label}</label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          fontFamily: 'inherit',
          fontSize: 14,
          color: '#0A2A3A',
          border: `1px solid ${focused ? '#0D9488' : '#E5E7EB'}`,
          borderRadius: 10,
          padding: '13px 14px',
          outline: 'none',
          width: '100%',
          boxSizing: 'border-box',
          boxShadow: focused ? '0 0 0 3px rgba(13,148,136,0.14)' : 'none',
          transition: `border-color 0.18s ${EASE}, box-shadow 0.18s ${EASE}`,
        }}
      />
    </div>
  );
}

export default function LoginNewVolunteer() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [btnHover, setBtnHover]   = useState(false);

  const canSubmit = firstName.trim().length > 0 && lastName.trim().length > 0;

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    // TODO: optionally create a session token here before navigating
    // Save name to localStorage so NewVolunteerTasks auto-skips name entry
    localStorage.setItem('newVolunteerName', JSON.stringify({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    }));
    // Generate a simple session token (same pattern as NewVolunteerTasks)
    const token = `nv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    localStorage.setItem('newVolunteerSession', token);
    navigate('/new');
  }

  return (
    <AuthCardLayout
      bgImage={BG_IMAGE}
      illusImage={ILLUS_IMAGE}
      illusAlt="Illustration of a new volunteer being welcomed"
    >
      {/* Logo + heading */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
        <VoloLogo />
        <h1 style={{ fontSize: 21, fontWeight: 600, margin: '2px 0 0', color: '#0A2A3A' }}>New Volunteer</h1>
        <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>Enter your information</p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 320 }}
      >
        <AuthInput
          id="firstName"
          label="First name"
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
          placeholder="e.g. Jordan"
          autoComplete="given-name"
        />
        <AuthInput
          id="lastName"
          label="Last name"
          value={lastName}
          onChange={e => setLastName(e.target.value)}
          placeholder="e.g. Smith"
          autoComplete="family-name"
        />

        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            width: '100%',
            padding: '14px 18px',
            border: 'none',
            borderRadius: 9999,
            background: canSubmit ? '#0D9488' : '#D1D5DB',
            color: '#fff',
            fontFamily: 'inherit',
            fontSize: 14,
            fontWeight: 600,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            transition: `filter 0.15s ${EASE}, transform 0.12s ${EASE}, box-shadow 0.15s ${EASE}`,
            transform: btnHover && canSubmit ? 'translateY(-1px)' : 'none',
            boxShadow: btnHover && canSubmit ? '0 6px 16px rgba(13,148,136,0.28)' : 'none',
          }}
          onMouseEnter={() => setBtnHover(true)}
          onMouseLeave={() => setBtnHover(false)}
          onMouseDown={e => { if (canSubmit) e.currentTarget.style.transform = 'scale(0.98)'; }}
          onMouseUp={e => { if (canSubmit) e.currentTarget.style.transform = btnHover ? 'translateY(-1px)' : ''; }}
        >
          Continue
        </button>
      </form>

      {/* Footer */}
      <p style={{ fontSize: 13, color: '#6B7280', margin: 0, textAlign: 'center' }}>
        Not a Volunteer?{' '}
        <button
          type="button"
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            color: '#09665E', fontWeight: 500, fontFamily: 'inherit', fontSize: 13 }}
          onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline'; }}
          onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none'; }}
        >
          Go back to home
        </button>
      </p>
    </AuthCardLayout>
  );
}
