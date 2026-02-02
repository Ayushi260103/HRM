'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import Notifications from '@/components/Notifications'

export default function HRDashboardPage() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [clockInTime, setClockInTime] = useState<string | null>(null)
  const [clockOutTime, setClockOutTime] = useState<string | null>(null)
  const [logId, setLogId] = useState<string | null>(null)
  const [loadingAttendance, setLoadingAttendance] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      setEmail(user.email ?? null)
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, status, full_name')
        .eq('id', user.id)
        .single()

      // Must be approved first
      if (profile?.status !== 'active') {
        router.replace('/pending-approval')
        return
      }

      // Only HR or Admin allowed
      if (profile?.role !== 'hr' && profile?.role !== 'admin') {
        router.replace('/dashboard/employee')
        return
      }

      setUserName(profile?.full_name)
      setLoading(false)
    }

    checkAccess()
  }, [router, supabase])

  // Load today's attendance
  useEffect(() => {
    const loadAttendance = async () => {
      if (!userId) return

      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('clock_in', today)
        .lte('clock_in', today + 'T23:59:59')
        .order('clock_in', { ascending: false })
        .limit(1)
        .single()

      if (data) {
        setLogId(data.id)
        setClockInTime(data.clock_in)
        setClockOutTime(data.clock_out)
      }
      setLoadingAttendance(false)
    }

    loadAttendance()
  }, [userId, supabase])

  const handleClockIn = async () => {
    if (!userId) return

    const { data, error } = await supabase
      .from('attendance_logs')
      .insert([{ user_id: userId }])
      .select()
      .single()

    if (!error && data) {
      setLogId(data.id)
      setClockInTime(data.clock_in)
    }
  }

  const handleClockOut = async () => {
    if (!logId) return

    const { data, error } = await supabase
      .from('attendance_logs')
      .update({ clock_out: new Date().toISOString() })
      .eq('id', logId)
      .select()
      .single()

    if (!error && data) {
      setClockOutTime(data.clock_out)
    }
  }

  const formatTime = (time: string | null) =>
    time ? new Date(time).toLocaleTimeString() : '--'

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p>Checking access...</p></div>

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Sidebar userEmail={email} userName={userName} role="hr" />

      {/* Notification Bell */}
      <div className="fixed top-4 right-4 z-50 lg:top-6 lg:right-8">
        {userId && <Notifications role="hr" userId={userId} />}
      </div>

      <main className="flex-1 p-4 sm:p-5 md:p-6 lg:p-8 lg:ml-64">
        <div className="w-full max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">HR Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage people, attendance, and policies</p>
          </div>

          {/* Clock In/Out Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">⏰ Clock In / Clock Out</h2>
            {loadingAttendance ? (
              <p className="text-gray-500 text-sm">Loading...</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Clock In</p>
                    <p className="text-lg font-bold text-gray-900">{formatTime(clockInTime)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Clock Out</p>
                    <p className="text-lg font-bold text-gray-900">{formatTime(clockOutTime)}</p>
                  </div>
                </div>
                <div className="flex gap-3">
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

          {/* Quick Links */}
          <div className="grid grid-cols-2 gap-4">
            <a href="/dashboard/hr/employees" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
              <div className="text-2xl mb-2">👥</div>
              <h3 className="font-semibold text-gray-900">All Employees</h3>
              <p className="text-xs text-gray-600 mt-1">View and manage profiles</p>
            </a>
            <a href="/dashboard/hr/attendance" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
              <div className="text-2xl mb-2">📅</div>
              <h3 className="font-semibold text-gray-900">Attendance</h3>
              <p className="text-xs text-gray-600 mt-1">Clock in/out records</p>
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
