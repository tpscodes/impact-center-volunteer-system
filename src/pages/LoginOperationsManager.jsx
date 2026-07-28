import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthCardLayout from '../components/AuthCardLayout';
import VoloLogo from '../components/VoloLogo';

// Place these files in /public:
//   /auth-bg.png              (shared background)
//   /auth-illus-manager.png   (left panel illustration)
const BG_IMAGE    = '/auth-bg.png';
const ILLUS_IMAGE = '/auth-illus-manager.png';

const EASE = 'cubic-bezier(0.16,1,0.3,1)';

const inputStyle = {
  fontFamily: 'inherit',
  fontSize: 14,
  color: '#0A2A3A',
  border: '1px solid #E5E7EB',
  borderRadius: 10,
  padding: '13px 14px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  transition: `border-color 0.18s ${EASE}, box-shadow 0.18s ${EASE}`,
};

function AuthInput({ id, label, type = 'text', value, onChange, placeholder, autoComplete }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, width: '100%' }}>
      <label htmlFor={id} style={{ fontSize: 13.5, fontWeight: 500, color: '#0A2A3A' }}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        style={{
          ...inputStyle,
          borderColor: focused ? '#0D9488' : '#E5E7EB',
          boxShadow: focused ? '0 0 0 3px rgba(13,148,136,0.14)' : 'none',
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </div>
  );
}

export default function LoginOperationsManager() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [btnHover, setBtnHover] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // TODO: wire up Firebase auth via useAuth().login
      const auth = await login(username, password);
      if (auth.role === 'superadmin') {
        navigate('/steve-overview');
      } else {
        navigate('/manager/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
      setLoading(false);
    }
  }

  return (
    <AuthCardLayout
      bgImage={BG_IMAGE}
      illusImage={ILLUS_IMAGE}
      illusAlt="Illustration of an operations manager at a food pantry"
    >
      {/* Logo + heading */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
        <VoloLogo />
        <h1 style={{ fontSize: 21, fontWeight: 600, margin: '2px 0 0', color: '#0A2A3A' }}>Operations Manager</h1>
        <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>Sign in to continue</p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 320 }}
      >
        <AuthInput
          id="username"
          label="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="e.g. jason"
          autoComplete="username"
        />
        <AuthInput
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
        />

        {error && (
          <p style={{ fontSize: 13, fontWeight: 500, textAlign: 'center', borderRadius: 8,
            padding: '8px 12px', background: '#FEE2E2', color: '#DC2626', margin: 0 }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px 18px',
            border: 'none',
            borderRadius: 9999,
            background: '#0D9488',
            color: '#fff',
            fontFamily: 'inherit',
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: `filter 0.15s ${EASE}, transform 0.12s ${EASE}, box-shadow 0.15s ${EASE}`,
            transform: btnHover && !loading ? 'translateY(-1px)' : 'none',
            boxShadow: btnHover && !loading ? '0 6px 16px rgba(13,148,136,0.28)' : 'none',
            filter: btnHover && !loading ? 'brightness(1.05)' : 'none',
          }}
          onMouseEnter={() => setBtnHover(true)}
          onMouseLeave={() => setBtnHover(false)}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)'; }}
          onMouseUp={e => { e.currentTarget.style.transform = btnHover ? 'translateY(-1px)' : ''; }}
        >
          {loading ? 'Signing in…' : 'Login'}
        </button>
      </form>

      {/* Footer */}
      <p style={{ fontSize: 13, color: '#6B7280', margin: 0, textAlign: 'center' }}>
        Volunteer?{' '}
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
