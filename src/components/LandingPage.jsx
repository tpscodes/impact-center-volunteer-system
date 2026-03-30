import { useNavigate } from 'react-router-dom'
import { User, Users, UserPlus, ChevronRight } from 'lucide-react'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">

      {/* LEFT COLUMN — desktop only */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#F0FAFA] flex-col items-center justify-center p-16">
        <h1 className="text-4xl font-bold text-[#0A2A3A] text-left w-full mb-1">IMPACT CENTER</h1>
        <p className="text-[#0D9488] text-base w-full mb-4">Volunteer Task Management</p>
        <div className="w-12 h-0.5 bg-[#0D9488] mb-10 self-start" />
        <img
          src="/illustration-group.png"
          alt="Volunteers"
          className="w-[360px] h-auto mb-10"
        />
        <p className="text-xl font-semibold text-[#0A2A3A] text-center leading-snug">
          Coordinating volunteers,<br />one task at a time
        </p>
        <div className="w-12 h-0.5 bg-[#0D9488] mt-6" />
      </div>

      {/* RIGHT COLUMN */}
      <div className="flex-1 lg:w-1/2 flex flex-col items-center justify-center px-6 lg:px-16 py-12">

        {/* Mobile only header */}
        <div className="lg:hidden text-center mb-6">
          <h1 className="text-3xl font-normal text-[#1e1e1e] tracking-wide">IMPACT CENTER</h1>
          <p className="text-base text-[#757575] mt-1">Volunteer Task Management</p>
          <div className="w-14 h-0.5 bg-[#0D9488] mx-auto mt-3" />
        </div>

        {/* Mobile only illustration */}
        <img
          src="/illustration-group.png"
          alt="Volunteers illustration"
          className="lg:hidden w-[260px] h-auto mx-auto my-6"
        />

        {/* Welcome text */}
        <h2 className="text-2xl font-semibold text-[#1e1e1e] text-center mb-2">Welcome</h2>
        <p className="text-base text-[#757575] text-center mb-8">Select your role to get started.</p>

        {/* Role cards */}
        <div className="w-full max-w-[480px] flex flex-col gap-3">

          <button
            onClick={() => navigate('/manager/login')}
            className="w-full flex items-center gap-6 bg-[#99dbd7] rounded-xl px-6 py-4 text-left hover:opacity-90 transition-opacity"
          >
            <User size={28} className="text-[#1e1e1e] shrink-0" />
            <div>
              <p className="text-base font-semibold text-[#1e1e1e]">Operations Manager</p>
              <p className="text-sm text-[#757575]">Manage tasks and volunteers</p>
            </div>
            <ChevronRight size={18} className="text-[#757575] ml-auto shrink-0" />
          </button>

          <button
            onClick={() => navigate('/experienced')}
            className="w-full flex items-center gap-6 bg-[#09665e] rounded-xl px-6 py-4 text-left hover:opacity-90 transition-opacity"
          >
            <Users size={28} className="text-white shrink-0" />
            <div>
              <p className="text-base font-semibold text-[#f3f3f3]">Experienced Volunteer</p>
              <p className="text-sm text-[#b3b3b3]">View and claim tasks</p>
            </div>
            <ChevronRight size={18} className="text-[#b3b3b3] ml-auto shrink-0" />
          </button>

          <button
            onClick={() => navigate('/new')}
            className="w-full flex items-center gap-6 bg-[#ccedeb] rounded-xl px-6 py-4 text-left hover:opacity-90 transition-opacity"
          >
            <UserPlus size={28} className="text-[#1e1e1e] shrink-0" />
            <div>
              <p className="text-base font-semibold text-[#1e1e1e]">New Volunteer</p>
              <p className="text-sm text-[#757575]">First time? Start here</p>
            </div>
            <ChevronRight size={18} className="text-[#757575] ml-auto shrink-0" />
          </button>

        </div>

        {/* Footer */}
        <p className="text-sm text-[#757575] text-center mt-10">Impact Center · Greenwood, IN</p>
        <p className="hidden lg:block text-xs text-[#757575] mt-2">● No active session</p>

      </div>
    </div>
  )
}
