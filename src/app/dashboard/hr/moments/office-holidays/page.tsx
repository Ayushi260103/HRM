'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Notifications from '@/components/Notifications'
import { useSupabase } from '@/hooks/useSupabase'
import { getLocalDateString, getDateString } from '@/lib/utils/date'

type Holiday = { id: string; date: string; name: string }

export default function HROfficeHolidaysPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ email: string | null; userName: string | null; avatarUrl: string | null; userId: string | null }>({
    email: null,
    userName: null,
    avatarUrl: null,
    userId: null,
  })

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!authUser) {
        router.replace('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name, avatar_url')
        .eq('id', authUser.id)
        .single()

      if (cancelled) return
      if (profile?.role !== 'hr') {
        router.replace('/dashboard')
        return
      }

      setUser({
        email: authUser.email ?? null,
        userId: authUser.id,
        userName: profile?.full_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
      })

      const today = new Date()
      const startDate = getLocalDateString()
      const endDate = getDateString(new Date(today.getFullYear(), today.getMonth() + 3, today.getDate()))

      const { data } = await supabase
        .from('office_holidays')
        .select('id, date, name')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

      if (!cancelled) setHolidays(data ?? [])
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Sidebar userEmail={user.email} userName={user.userName} avatarUrl={user.avatarUrl} role="hr" />

      <div className="fixed top-4 right-4 z-50 lg:top-6 lg:right-8">
        {user.userId && <Notifications role="hr" userId={user.userId} />}
      </div>

      <main className="flex-1 pt-14 px-4 pb-4 sm:pt-6 sm:px-5 sm:pb-5 md:pt-6 md:px-6 md:pb-6 lg:pt-8 lg:px-8 lg:pb-8 lg:ml-64 min-w-0">
        <div className="max-w-4xl">
          <Link href="/dashboard/hr/moments" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
            ← Back to Moments That Matter
          </Link>
          <Link href="/dashboard/hr/leaves/holiday-allocation" className="ml-4 text-sm text-gray-600 hover:underline">
            Manage holidays
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Office Holidays</h1>
          <p className="text-gray-600 mt-1 text-sm">Dates when the office is closed (within the next 3 months)</p>

          <div className="mt-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {holidays.map(h => (
                    <tr key={h.id}>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(h.date).toLocaleDateString('en-IN', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{h.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {holidays.length === 0 && (
              <div className="p-8 text-center text-gray-500 text-sm">No office holidays scheduled</div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
