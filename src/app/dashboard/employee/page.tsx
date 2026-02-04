'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Notifications from '@/components/Notifications'
import { useSupabase } from '@/hooks/useSupabase'
import { useAttendance } from '@/hooks/useAttendance'

interface EmployeeProfile {
  id: string
  full_name: string
  department: string
  position: string
  phone: string
  hire_date: string
  dob: string
  avatar_url?: string
  email_id?: string
}

export default function EmployeeDashboard() {
  const router = useRouter()
  const supabase = useSupabase()
  const [profile, setProfile] = useState<EmployeeProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const { clockInTime, clockOutTime, loading: loadingAttendance, formatTime, handleClockIn, handleClockOut } = useAttendance(userId)

  useEffect(() => {
    let cancelled = false

    const checkProfile = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()

        if (cancelled) return
        if (!authUser) {
          router.push('/login')
          return
        }

        setEmail(authUser.email ?? null)
        setUserId(authUser.id)

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (cancelled) return
        if (error) {
          router.push('/profile-completion')
          return
        }

        const requiredFields = ['full_name', 'department', 'position', 'phone', 'hire_date', 'dob']
        const isProfileIncomplete = requiredFields.some(field => !data[field])

        if (isProfileIncomplete || !data.avatar_url) {
          router.push('/profile-completion')
          return
        }

        setProfile(data)
      } catch (err) {
        if (!cancelled) {
          console.error('Profile check failed:', err)
          router.push('/profile-completion')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    checkProfile()
    return () => { cancelled = true }
  }, [router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" role="status" aria-label="Loading dashboard">
        <p className="text-gray-600 text-sm sm:text-base">Loading dashboard...</p>
      </div>
    )
  }
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" role="status" aria-label="Redirecting">
        <p className="text-gray-600 text-sm sm:text-base">Redirecting...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Sidebar userEmail={email} userName={profile.full_name} avatarUrl={profile.avatar_url} role="employee" />

      {/* Notification Bell */}
      <div className="fixed top-4 right-4 z-50 lg:top-6 lg:right-8">
        {userId && <Notifications role="employee" userId={userId} />}
      </div>

      <main className="flex-1 p-4 sm:p-5 md:p-6 lg:p-8 lg:ml-64 min-w-0">
        <div className="w-full max-w-4xl mx-auto">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">Employee Dashboard</h1>
            <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">Manage your profile and track attendance</p>
          </div>

          {/* Clock In / Out Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Today&apos;s Attendance</h3>

              {loadingAttendance ? (
                <p className="text-gray-500 text-center py-8">Loading attendance records...</p>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs sm:text-sm text-gray-600 mb-2">Clock In Time</p>
                      <p className="text-2xl font-bold text-gray-900">{formatTime(clockInTime)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs sm:text-sm text-gray-600 mb-2">Clock Out Time</p>
                      <p className="text-2xl font-bold text-gray-900">{formatTime(clockOutTime)}</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    {!clockInTime && (
                      <button
                        onClick={handleClockIn}
                        className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                      >
                        🟢 Clock In
                      </button>
                    )}

                    {clockInTime && !clockOutTime && (
                      <button
                        onClick={handleClockOut}
                        className="flex-1 bg-red-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
                      >
                        🔴 Clock Out
                      </button>
                    )}

                    {clockOutTime && (
                      <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                        <p className="text-green-700 font-semibold">✅ Shift Completed</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
        </div>
      </main>
    </div>
  );
}
