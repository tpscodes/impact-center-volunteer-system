import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const VALID_USERNAME = 'jason'
const VALID_PASSWORD = 'impact123'

export default function ManagerLogin() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Simulate a brief auth delay
    setTimeout(() => {
      if (username === VALID_USERNAME && password === VALID_PASSWORD) {
        navigate('/manager/dashboard')
      } else {
        setError('Invalid username or password.')
        setLoading(false)
      }
    }, 400)
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: '#F8F8FA' }}
    >
      {/* Logo / Brand */}
      <div className="text-center mb-8">
        <h1
          className="text-3xl font-extrabold tracking-widest uppercase"
          style={{ color: '#1F497D' }}
        >
          IMPACT CENTER
        </h1>
        <p className="mt-1 text-sm font-semibold tracking-wide uppercase" style={{ color: '#1F497D', opacity: 0.6 }}>
          Operations Manager Portal
        </p>
      </div>

      {/* Card */}
      <div className="w-full bg-white rounded-2xl shadow-lg p-8" style={{ maxWidth: '400px' }}>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">🔒</span>
          <h2 className="text-xl font-bold" style={{ color: '#1F497D' }}>Manager Login</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Username */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-600" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              className="w-full px-4 py-3 rounded-xl border text-gray-800 text-sm outline-none transition-all"
              style={{
                borderColor: '#D1D5DB',
                backgroundColor: '#F9FAFB',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#1F497D')}
              onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-600" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              className="w-full px-4 py-3 rounded-xl border text-gray-800 text-sm outline-none transition-all"
              style={{
                borderColor: '#D1D5DB',
                backgroundColor: '#F9FAFB',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#1F497D')}
              onBlur={(e) => (e.target.style.borderColor = '#D1D5DB')}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm font-medium text-center rounded-lg py-2 px-3" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-white text-base mt-1 transition-opacity active:scale-95"
            style={{
              backgroundColor: '#DC2626',
              opacity: loading ? 0.7 : 1,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>
      </div>

      {/* Back link */}
      <button
        onClick={() => navigate('/')}
        className="mt-6 text-sm font-medium"
        style={{ color: '#1F497D', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.7 }}
      >
        ← Back to home
      </button>
    </div>
  )
}
