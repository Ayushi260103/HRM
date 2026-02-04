'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import Notifications from '@/components/Notifications'
import { useSupabase } from '@/hooks/useSupabase'
import { useAttendance } from '@/hooks/useAttendance'

type UserState = { email: string | null; userName: string | null; avatarUrl: string | null; userId: string | null }

export default function HRDashboardPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<UserState>({ email: null, userName: null, avatarUrl: null, userId: null })

  const { clockInTime, clockOutTime, loading: loadingAttendance, formatTime, handleClockIn, handleClockOut } = useAttendance(user.userId)

  useEffect(() => {
    let cancelled = false

    const checkAccess = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (cancelled) return
      if (!authUser) {
        router.replace('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, status, full_name, avatar_url')
        .eq('id', authUser.id)
        .single()

      if (cancelled) return
      if (profile?.status !== 'active') {
        router.replace('/pending-approval')
        return
      }
      if (profile?.role !== 'hr' && profile?.role !== 'admin') {
        router.replace('/dashboard/employee')
        return
      }

      setUser({
        email: authUser.email ?? null,
        userId: authUser.id,
        userName: profile?.full_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
      })
      setLoading(false)
    }

    checkAccess()
    return () => { cancelled = true }
  }, [router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" role="status" aria-label="Checking access">
        <p className="text-gray-600 text-sm sm:text-base">Checking access...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Sidebar userEmail={user.email} userName={user.userName} avatarUrl={user.avatarUrl} role="hr" />

      <div className="fixed top-4 right-4 z-50 lg:top-6 lg:right-8">
        {user.userId && <Notifications role="hr" userId={user.userId} />}
      </div>

      <main className="flex-1 p-4 sm:p-5 md:p-6 lg:p-8 lg:ml-64 min-w-0">
        <div className="w-full max-w-4xl mx-auto">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">HR Dashboard</h1>
            <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">Manage people, attendance, and policies</p>
          </div>

          {/* Clock In/Out Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">⏰ Clock In / Clock Out</h2>
            {loadingAttendance ? (
              <p className="text-gray-500 text-sm">Loading...</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Clock In</p>
                    <p className="text-lg font-bold text-gray-900">{formatTime(clockInTime)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Clock Out</p>
                    <p className="text-lg font-bold text-gray-900">{formatTime(clockOutTime)}</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  {!clockInTime && (
                    <button
                      onClick={handleClockIn}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition"
                    >
                      🟢 Clock In
                    </button>
                  )}
                  {clockInTime && !clockOutTime && (
                    <button
                      onClick={handleClockOut}
                      className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition"
                    >
                      🔴 Clock Out
                    </button>
                  )}
                  {clockOutTime && (
                    <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                      <p className="text-green-700 font-medium text-sm">✅ Shift Completed</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Link
              href="/dashboard/hr/employees"
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md hover:border-blue-300 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[88px] flex flex-col justify-center"
            >
              <span className="text-2xl mb-2 block" aria-hidden>👥</span>
              <h3 className="font-semibold text-gray-900 text-sm">All Employees</h3>
              <p className="text-xs text-gray-600 mt-1">View and manage profiles</p>
            </Link>
            <Link
              href="/dashboard/hr/attendance"
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md hover:border-blue-300 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[88px] flex flex-col justify-center"
            >
              <span className="text-2xl mb-2 block" aria-hidden>📅</span>
              <h3 className="font-semibold text-gray-900 text-sm">Attendance</h3>
              <p className="text-xs text-gray-600 mt-1">Clock in/out records</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
