'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export default function EmployeeDashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const [loadingAttendance, setLoadingAttendance] = useState(true)
  const [logId, setLogId] = useState<string | null>(null)
  const [clockInTime, setClockInTime] = useState<string | null>(null)
  const [clockOutTime, setClockOutTime] = useState<string | null>(null)

  // 🔹 Get logged-in user
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled || !user) {
        if (!cancelled && !user) router.replace('/login')
        return
      }
      setEmail(user.email ?? null)
      setUserId(user.id)
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('clock_in', today)
        .order('clock_in', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!cancelled && data) {
        setLogId(data.id)
        setClockInTime(data.clock_in)
        setClockOutTime(data.clock_out)
      }
      if (!cancelled) setLoadingAttendance(false)
    }
    run()
    return () => { cancelled = true }
  }, [router, supabase])

  // 🟢 Clock In
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

  // 🔴 Clock Out
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

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const formatTime = (time: string | null) =>
    time ? new Date(time).toLocaleTimeString() : '--'

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
            ← Dashboards
          </Link>
          <h1 className="text-xl font-semibold">HRM</h1>
        </div>
        <div className="flex items-center gap-4">
          {email && <span className="text-sm text-gray-500">{email}</span>}
          <button onClick={handleLogout} className="text-sm text-gray-600 hover:text-gray-900">
            Log out
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-6">
        <div>
          <h2 className="text-lg font-medium mb-1">Employee dashboard</h2>
          <p className="text-sm text-gray-500">Your overview and quick actions</p>
        </div>

        {/* ⏱ Attendance Card */}
        <div className="p-5 rounded-lg border bg-white dark:bg-gray-900 space-y-4">
          <h3 className="text-md font-semibold">Today&apos;s Attendance</h3>

          {loadingAttendance ? (
            <p className="text-sm text-gray-500">Loading attendance...</p>
          ) : (
            <>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Clock In: <strong>{formatTime(clockInTime)}</strong></p>
                <p>Clock Out: <strong>{formatTime(clockOutTime)}</strong></p>
              </div>

              {!clockInTime && (
                <button
                  onClick={handleClockIn}
                  className="bg-green-600 text-white px-4 py-2 rounded text-sm"
                >
                  Clock In
                </button>
              )}

              {clockInTime && !clockOutTime && (
                <button
                  onClick={handleClockOut}
                  className="bg-red-600 text-white px-4 py-2 rounded text-sm"
                >
                  Clock Out
                </button>
              )}

              {clockOutTime && (
                <p className="text-green-600 text-sm font-medium">
                  Shift completed ✅
                </p>
              )}
            </>
          )}
        </div>

        {/* Existing Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="p-5 rounded-lg border bg-white dark:bg-gray-900">
            <h3 className="text-sm font-medium">My info</h3>
            <p className="mt-2 text-sm text-gray-500">Profile and contact details.</p>
          </div>
          <div className="p-5 rounded-lg border bg-white dark:bg-gray-900">
            <h3 className="text-sm font-medium">Leave</h3>
            <p className="mt-2 text-sm text-gray-500">Balance and requests.</p>
          </div>
        </div>
      </main>
    </div>
  )
}
