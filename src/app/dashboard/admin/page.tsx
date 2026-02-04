'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import Notifications from '@/components/Notifications'


export default function AdminDashboard() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [clockInTime, setClockInTime] = useState<string | null>(null)
  const [clockOutTime, setClockOutTime] = useState<string | null>(null)
  const [logId, setLogId] = useState<string | null>(null)
  const [loadingAttendance, setLoadingAttendance] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      setEmail(user.email ?? null)
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name, avatar_url')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        router.replace('/dashboard')
        return
      }

      setUserName(profile?.full_name ?? null)
      setAvatarUrl(profile?.avatar_url ?? null)
      setLoading(false)
    }

    loadData()
  }, [router, supabase])

  // Load today's attendance
  
      const getLocalDayRange = () => {
        const now = new Date()
      
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      
        return {
          startISO: start.toISOString(),
          endISO: end.toISOString(),
        }
      }
useEffect(() => {
  const loadAttendance = async () => {
    if (!userId) return

    const { startISO, endISO } = getLocalDayRange()

    const { data } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('clock_in', startISO)
      .lt('clock_in', endISO)
      .order('clock_in', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (data) {
      setLogId(data.id)
      setClockInTime(data.clock_in)
      setClockOutTime(data.clock_out)
    } else {
      // ✅ NEW DAY → RESET STATE
      setLogId(null)
      setClockInTime(null)
      setClockOutTime(null)
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

  const parseSupabaseTime = (time: string) => {
    const hasTz = /[zZ]|[+-]\d{2}:\d{2}$/.test(time)
    return new Date(hasTz ? time : `${time}Z`)
  }

  const formatTime = (time: string | null) =>
    time
      ? parseSupabaseTime(time).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '--'
  

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p>Loading dashboard...</p></div>

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Sidebar userEmail={email} userName={userName} avatarUrl={avatarUrl} role="admin" />

      {/* Notification Bell */}
      <div className="fixed top-4 right-4 z-50 lg:top-6 lg:right-8">
        {userId && <Notifications role="admin" userId={userId} />}
      </div>

      <main className="flex-1 p-4 sm:p-5 md:p-6 lg:p-8 lg:ml-64">
        <div className="w-full max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">Welcome back, {userName || 'Admin'}</p>
          </div>

          {/* Clock In/Out Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">⏰ Clock In / Clock Out</h2>
            {loadingAttendance ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Loading attendance...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                    <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide mb-2">Clock In Time</p>
                    <p className="text-4xl font-bold text-blue-900">{formatTime(clockInTime)}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
                    <p className="text-sm font-semibold text-purple-700 uppercase tracking-wide mb-2">Clock Out Time</p>
                    <p className="text-4xl font-bold text-purple-900">{formatTime(clockOutTime)}</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  {!clockInTime && (
                    <button
                      onClick={handleClockIn}
                      className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-4 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg text-lg"
                    >
                      🟢 Clock In
                    </button>
                  )}
                  {clockInTime && !clockOutTime && (
                    <button
                      onClick={handleClockOut}
                      className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-4 rounded-lg font-semibold hover:from-red-600 hover:to-red-700 transition-all shadow-md hover:shadow-lg text-lg"
                    >
                      🔴 Clock Out
                    </button>
                  )}
                  {clockOutTime && (
                    <div className="flex-1 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-4 text-center">
                      <p className="text-green-700 font-bold text-lg">✅ Shift Completed</p>
                      <p className="text-green-600 text-sm mt-1">Good work today!</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <a href="/dashboard/admin/pending" className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md hover:border-blue-300 transition-all">
              <div className="text-3xl mb-2">📋</div>
              <h3 className="font-semibold text-gray-900 text-sm">Pending Requests</h3>
              <p className="text-xs text-gray-600 mt-1">Review user approvals</p>
            </a>
            <a href="/dashboard/admin/employees" className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md hover:border-blue-300 transition-all">
              <div className="text-3xl mb-2">👥</div>
              <h3 className="font-semibold text-gray-900 text-sm">All Employees</h3>
              <p className="text-xs text-gray-600 mt-1">View all profiles</p>
            </a>
            <a href="/dashboard/admin/attendance" className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md hover:border-blue-300 transition-all">
              <div className="text-3xl mb-2">📅</div>
              <h3 className="font-semibold text-gray-900 text-sm">Attendance</h3>
              <p className="text-xs text-gray-600 mt-1">Track all records</p>
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
