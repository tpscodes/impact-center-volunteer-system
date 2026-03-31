import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVolunteer } from '../context/VolunteerContext'
import { VOLUNTEER_PROFILES } from '../hooks/useSharedTasks'

export default function VolunteerIdEntry() {
  const navigate = useNavigate()
  const { setVolunteerId } = useVolunteer()
  const [inputVal, setInputVal] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const id = inputVal.replace(/\D/g, '').slice(0, 4)
    if (id.length < 4) {
      setError('Please enter all 4 digits.')
      return
    }
    const profile = VOLUNTEER_PROFILES.find(p => p.id === id)
    if (!profile) {
      setError('ID not recognized. Please check with your session coordinator.')
      return
    }
    setVolunteerId(profile.id)
    sessionStorage.setItem('volunteerId', profile.id)
    sessionStorage.setItem('volunteerName', profile.name)
    navigate('/experienced/tasks')
  }

  function handleClear() {
    setInputVal('')
    setError('')
  }

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">

      {/* LEFT PANEL — desktop only */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#F0FAFA] flex-col items-center justify-center p-16 min-h-screen">
        <div className="w-full max-w-[420px]">
          <h1 className="text-4xl font-bold text-[#1e1e1e] mb-1">IMPACT CENTER</h1>
          <p className="text-lg text-[#0d9488] mb-4">Volunteer Task Management</p>
          <div className="w-12 h-0.5 bg-[#0d9488] mb-10" />
          <img src="/illustration-group.png" alt="Volunteers" className="w-[360px] h-auto mb-10" />
          <p className="text-xl font-semibold text-[#1e1e1e] text-center leading-snug">
            Coordinating volunteers,<br />one task at a time
          </p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 lg:px-16 py-12 min-h-screen">

        {/* Mobile header */}
        <div className="lg:hidden text-center mb-8">
          <h1 className="text-2xl font-normal text-[#1e1e1e] tracking-wide">IMPACT CENTER</h1>
          <p className="text-sm text-[#757575] mt-1">Volunteer Task Management</p>
          <div className="w-12 h-0.5 bg-[#0d9488] mx-auto mt-3" />
        </div>

        {/* Login card */}
        <form onSubmit={handleSubmit} className="w-full max-w-[360px] bg-white border border-[#d9d9d9] rounded-lg p-8">
          <h2 className="text-2xl font-semibold text-[#1e1e1e] text-center mb-1 tracking-tight">
            Experienced Volunteer
          </h2>
          <p className="text-lg text-[#757575] text-center mb-8">Sign in to continue</p>

          {/* ID input */}
          <div className="flex flex-col gap-2 mb-6">
            <label className="text-base text-[#1e1e1e]">Enter your 4-digit ID</label>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="e.g. 1234"
              value={inputVal}
              onChange={e => { setInputVal(e.target.value); setError('') }}
              maxLength={4}
              autoFocus
              className="w-full border border-[#d9d9d9] rounded-lg px-4 py-3 text-base text-[#1e1e1e] placeholder-[#b3b3b3] outline-none focus:border-[#0d9488] transition-colors"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm font-medium text-center rounded-lg py-2 px-3 mb-4 bg-[#fee2e2] text-[#dc2626]">
              {error}
            </p>
          )}

          {/* Buttons */}
          <div className="flex gap-4 mb-6">
            <button
              type="button"
              onClick={handleClear}
              className="flex-1 py-3 rounded-lg text-base text-[#303030] border border-[#d9d9d9] hover:bg-gray-50 cursor-pointer"
            >
              Clear
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-lg text-base bg-[#09665e] border border-[#09665e] text-[#f0fafa] hover:opacity-90 cursor-pointer"
            >
              Login
            </button>
          </div>

          {/* Back link */}
          <p className="text-base text-[#1e1e1e]">
            Not Exp. Volunteer?{' '}
            <span
              onClick={() => navigate('/')}
              className="text-[#0d9488] cursor-pointer hover:underline"
            >
              Go back to home
            </span>
          </p>
        </form>

        <p className="text-base italic text-[#757575] text-center mt-8">
          Impact Center | Greenwood, IN
        </p>
      </div>
    </div>
  )
}
