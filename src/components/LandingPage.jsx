import { useNavigate } from 'react-router-dom'
import { User, Users, UserPlus } from 'lucide-react'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-10 max-w-[390px] mx-auto w-full">

      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-normal text-center text-[#1e1e1e] tracking-wide">IMPACT CENTER</h1>
        <p className="text-base text-[#757575] text-center mt-1">Volunteer Task Management</p>
        <div className="w-14 h-0.5 bg-[#0D9488] mx-auto mt-3" />
      </div>

      {/* Illustration */}
      <img
        src="/illustration-group.png"
        alt="Volunteers illustration"
        className="w-[260px] h-auto mx-auto my-8"
      />

      {/* Welcome */}
      <h2 className="text-2xl font-semibold text-center text-[#1e1e1e] mb-2">Welcome</h2>
      <p className="text-lg text-[#757575] text-center mb-6">Select your role to get started.</p>

      {/* Role cards */}
      <div className="w-full flex flex-col gap-2">

        <button
          onClick={() => navigate('/manager/login')}
          className="w-full flex items-center gap-6 bg-[#99dbd7] rounded-lg px-6 py-4 text-left"
        >
          <User size={28} className="text-[#1e1e1e] shrink-0" />
          <div>
            <p className="text-base font-semibold text-[#1e1e1e]">Operations Manager</p>
            <p className="text-sm text-[#757575]">Manage task and volunteers</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/experienced')}
          className="w-full flex items-center gap-6 bg-[#09665e] rounded-lg px-6 py-4 text-left"
        >
          <Users size={28} className="text-white shrink-0" />
          <div>
            <p className="text-base font-semibold text-[#f3f3f3]">Experienced Volunteer</p>
            <p className="text-sm text-[#b3b3b3]">View and claim tasks</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/new')}
          className="w-full flex items-center gap-6 bg-[#ccedeb] rounded-lg px-6 py-4 text-left"
        >
          <UserPlus size={28} className="text-[#1e1e1e] shrink-0" />
          <div>
            <p className="text-base font-semibold text-[#1e1e1e]">New Volunteer</p>
            <p className="text-sm text-[#757575]">First time? Start here</p>
          </div>
        </button>

      </div>

      {/* Footer */}
      <p className="text-sm text-[#757575] text-center mt-8">Impact Center | Greenwood, IN</p>

    </div>
  )
}
