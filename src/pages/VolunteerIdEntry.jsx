import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVolunteer } from '../context/VolunteerContext'

export default function VolunteerIdEntry() {
  const navigate = useNavigate()
  const { setVolunteerId } = useVolunteer()
  const [digits, setDigits] = useState(['', '', '', ''])
  const [error, setError] = useState('')
  const refs = [useRef(), useRef(), useRef(), useRef()]

  function handleChange(index, value) {
    const v = value.replace(/\D/g, '').slice(-1) // keep only last digit
    const next = [...digits]
    next[index] = v
    setDigits(next)
    setError('')
    if (v && index < 3) {
      refs[index + 1].current.focus()
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs[index - 1].current.focus()
    }
  }

  function handlePaste(e) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (pasted.length > 0) {
      const next = ['', '', '', '']
      pasted.split('').forEach((ch, i) => { next[i] = ch })
      setDigits(next)
      const focusIdx = Math.min(pasted.length, 3)
      refs[focusIdx].current.focus()
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    const id = digits.join('')
    if (id.length < 4) {
      setError('Please enter all 4 digits.')
      return
    }
    setVolunteerId(id)
    navigate('/experienced/tasks')
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: '#F8F8FA' }}
    >
      {/* Brand */}
      <div className="text-center mb-10">
        <h1
          className="text-3xl font-extrabold tracking-widest uppercase"
          style={{ color: '#1F497D' }}
        >
          IMPACT CENTER
        </h1>
        <div
          className="mt-3 mx-auto h-1 w-16 rounded-full"
          style={{ backgroundColor: '#FF9500', opacity: 0.7 }}
        />
      </div>

      {/* Card */}
      <div className="w-full bg-white rounded-2xl shadow-lg p-8" style={{ maxWidth: '400px' }}>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">👤</span>
          <h2 className="text-xl font-bold" style={{ color: '#1F497D' }}>
            Experienced Volunteer
          </h2>
        </div>
        <p className="text-sm text-gray-500 mb-8">Enter your 4-digit volunteer ID</p>

        <form onSubmit={handleSubmit}>
          {/* PIN boxes */}
          <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={refs[i]}
                type="tel"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-16 h-16 text-center text-2xl font-extrabold rounded-xl border-2 outline-none transition-all"
                style={{
                  borderColor: d ? '#FF9500' : '#D1D5DB',
                  backgroundColor: d ? '#FFF7ED' : '#F9FAFB',
                  color: '#1F497D',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#FF9500')}
                onBlur={(e) => (e.target.style.borderColor = d ? '#FF9500' : '#D1D5DB')}
              />
            ))}
          </div>

          {error && (
            <p
              className="text-sm font-medium text-center rounded-lg py-2 px-3 mb-4"
              style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-xl font-bold text-white text-base transition-transform active:scale-95"
            style={{ backgroundColor: '#FF9500', border: 'none', cursor: 'pointer' }}
          >
            Continue →
          </button>
        </form>
      </div>

      {/* Back */}
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
