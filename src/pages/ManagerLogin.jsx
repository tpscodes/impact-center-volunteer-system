import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const VALID_USERNAME = 'admin'
const VALID_PASSWORD = 'admin'

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
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">

      {/* LEFT PANEL — desktop only */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#F0FAFA] flex-col items-center justify-center p-16 min-h-screen">
        <div className="w-full max-w-[420px]">
          <h1 className="text-4xl font-bold text-[#1e1e1e] mb-1">IMPACT CENTER</h1>
          <p className="text-lg text-[#757575] mb-4">Volunteer Task Management</p>
          <div className="w-12 h-0.5 bg-[#0D9488] mb-10" />
          <img
            src="/illustration-group.png"
            alt="Volunteers"
            className="w-[360px] h-auto mb-10"
          />
          <p className="text-xl font-semibold text-[#1e1e1e] text-center leading-snug">
            Coordinating volunteers,<br />one task at a time
          </p>
        </div>
      </div>

      {/* RIGHT PANEL — login form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 lg:px-16 py-12 min-h-screen">

        {/* Mobile only header */}
        <div className="lg:hidden text-center mb-8">
          <h1 className="text-2xl font-normal text-[#1e1e1e] tracking-wide">IMPACT CENTER</h1>
          <p className="text-sm text-[#757575] mt-1">Volunteer Task Management</p>
          <div className="w-12 h-0.5 bg-[#0D9488] mx-auto mt-3" />
        </div>

        {/* Login card */}
        <div className="w-full max-w-[360px] bg-white border border-[#d9d9d9] rounded-lg p-8">

          <h2 className="text-2xl font-semibold text-[#1e1e1e] text-center mb-1 tracking-tight">
            Operations Manager
          </h2>
          <p className="text-lg text-[#757575] text-center mb-8">Sign in to continue</p>

          <form onSubmit={handleSubmit} className="flex flex-col">

            {/* Username */}
            <div className="flex flex-col gap-2 mb-6">
              <label className="text-base text-[#1e1e1e]" htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                placeholder="Value"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-[#d9d9d9] rounded-lg px-4 py-3 text-base text-[#1e1e1e] placeholder-[#b3b3b3] outline-none focus:border-[#0D9488] transition-colors"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2 mb-6">
              <label className="text-base text-[#1e1e1e]" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Value"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-[#d9d9d9] rounded-lg px-4 py-3 text-base text-[#1e1e1e] placeholder-[#b3b3b3] outline-none focus:border-[#0D9488] transition-colors"
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm font-medium text-center rounded-lg py-2 px-3 mb-4 bg-[#FEE2E2] text-[#DC2626]">
                {error}
              </p>
            )}

            {/* Login button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#09665e] border border-[#09665e] text-[#f0fafa] rounded-lg py-3 text-base font-normal hover:bg-[#0D9488] transition-colors mb-6 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in…' : 'Login'}
            </button>

          </form>

          {/* Back link */}
          <p className="text-base text-[#1e1e1e]">
            Volunteer?{' '}
            <span
              onClick={() => navigate('/')}
              className="text-[#0d9488] cursor-pointer hover:underline"
            >
              Go back to home
            </span>
          </p>
        </div>

        {/* Footer */}
        <p className="text-base italic text-[#757575] text-center mt-8">
          Impact Center | Greenwood, IN
        </p>
      </div>
    </div>
  )
}
