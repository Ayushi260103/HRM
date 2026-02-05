'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Notifications from '@/components/Notifications'
import { useSupabase } from '@/hooks/useSupabase'

type UserState = { email: string | null; userName: string | null; avatarUrl: string | null; userId: string | null }

export default function EmployeeMomentsPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<UserState>({ email: null, userName: null, avatarUrl: null, userId: null })

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
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
      if (profile?.role !== 'employee') {
        router.replace('/dashboard')
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

    loadData()
    return () => { cancelled = true }
  }, [router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600 text-sm sm:text-base">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Sidebar userEmail={user.email} userName={user.userName} avatarUrl={user.avatarUrl} role="employee" />

      <div className="fixed top-4 right-4 z-50 lg:top-6 lg:right-8">
        {user.userId && <Notifications role="employee" userId={user.userId} />}
      </div>

      <main className="flex-1 pt-14 px-4 pb-4 sm:pt-6 sm:px-5 sm:pb-5 md:pt-6 md:px-6 md:pb-6 lg:pt-8 lg:px-8 lg:pb-8 lg:ml-64 min-w-0">
        <div className="w-full max-w-4xl mx-auto">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">Moments That Matter</h1>
            <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">Celebrate birthdays and stay informed about office holidays</p>
          </div>

          <Link
            href="/dashboard/employee/moments/office-holidays"
            className="mb-6 block"
          >
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all">
              <div className="flex items-center gap-4">
                <span className="text-3xl">📅</span>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">Office Holidays</h3>
                  <p className="text-sm text-gray-600 mt-1">View dates when the office is closed</p>
                </div>
                <span className="ml-auto text-gray-400">→</span>
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard/employee/upcoming-birthdays"
            className="block"
          >
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all">
              <div className="flex items-center gap-4">
                <span className="text-3xl">🎂</span>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">Upcoming Birthdays</h3>
                  <p className="text-sm text-gray-600 mt-1">Birthdays in the next 30 days</p>
                </div>
                <span className="ml-auto text-gray-400">→</span>
              </div>
            </div>
          </Link>
        </div>
      </main>
    </div>
  )
}
