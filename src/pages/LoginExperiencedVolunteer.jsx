import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { useEffect } from 'react';
import { VOLUNTEER_PROFILES } from '../hooks/useSharedTasks';
import AuthCardLayout from '../components/AuthCardLayout';
import VoloLogo from '../components/VoloLogo';

// Place these files in /public:
//   /auth-bg.png             (shared background)
//   /auth-illus-exp.png      (left panel illustration)
const BG_IMAGE    = '/auth-bg.png';
const ILLUS_IMAGE = '/auth-illus-exp.png';

const EASE = 'cubic-bezier(0.16,1,0.3,1)';

export default function LoginExperiencedVolunteer() {
  const navigate  = useNavigate();
  const pinRef    = useRef(null);

  const [pin, setPin]         = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [btnHover, setBtnHover] = useState(false);
  const [focused, setFocused]   = useState(false);
  const [firebaseVolunteers, setFirebaseVolunteers] = useState(null);

  useEffect(() => {
    const unsub = onValue(ref(db, 'volunteers'), snap => {
      const data = snap.val();
      if (data) setFirebaseVolunteers(Object.values(data));
    });
    return () => unsub();
  }, []);

  function handleClear() {
    setPin('');
    setError('');
    pinRef.current?.focus();
  }

  function handleSubmit(e) {
    e.preventDefault();
    const id = pin.replace(/\D/g, '').slice(0, 4);
    if (id.length < 4) {
      setError('Please enter all 4 digits.');
      return;
    }
    setLoading(true);
    setError('');
    // TODO: wire up Firebase volunteer lookup
    const roster  = firebaseVolunteers || VOLUNTEER_PROFILES;
    const profile = roster.find(p => String(p.id) === String(id));
    if (!profile) {
      setError('ID not found. Check your last 4 digits and try again.');
      setLoading(false);
      return;
    }
    navigate('/volunteer-mode-select', { state: { volunteer: profile } });
  }

  return (
    <AuthCardLayout
      bgImage={BG_IMAGE}
      illusImage={ILLUS_IMAGE}
      illusAlt="Illustration of two experienced volunteers carrying donation boxes"
    >
      {/* Logo + heading */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
        <VoloLogo />
        <h1 style={{ fontSize: 21, fontWeight: 600, margin: '2px 0 0', color: '#0A2A3A' }}>Experienced Volunteer</h1>
        <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>Sign in to continue</p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 320 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <label htmlFor="pin" style={{ fontSize: 13.5, fontWeight: 500, color: '#0A2A3A' }}>
            Enter the last 4 digits of your phone number
          </label>
          <input
            ref={pinRef}
            id="pin"
            type="tel"
            inputMode="numeric"
            maxLength={4}
            placeholder="e.g. 1234"
            autoComplete="off"
            value={pin}
            onChange={e => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }}
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
          }}
          onMouseEnter={() => setBtnHover(true)}
          onMouseLeave={() => setBtnHover(false)}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)'; }}
          onMouseUp={e => { e.currentTarget.style.transform = btnHover ? 'translateY(-1px)' : ''; }}
        >
          {loading ? 'Signing in…' : 'Login'}
        </button>
      </form>

      {/* Clear entry — demoted text link */}
      <button
        type="button"
        onClick={handleClear}
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: '#09665E',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          padding: '12px 16px',
          margin: '-8px 0',
          minHeight: 44,
          display: 'flex',
          alignItems: 'center',
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '0.75'; e.currentTarget.style.textDecoration = 'underline'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.textDecoration = 'none'; }}
      >
        Clear entry
      </button>

      {/* Footer */}
      <p style={{ fontSize: 13, color: '#6B7280', margin: 0, textAlign: 'center' }}>
        Not an Experienced Volunteer?{' '}
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
