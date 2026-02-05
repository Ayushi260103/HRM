'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Notifications from '@/components/Notifications'
import UpcomingBirthdays, { useUpcomingBirthdays } from '@/components/UpcomingBirthdays'
import { useSupabase } from '@/hooks/useSupabase'

type UserState = { email: string | null; userName: string | null; avatarUrl: string | null; userId: string | null }

export default function EmployeeUpcomingBirthdaysPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<UserState>({ email: null, userName: null, avatarUrl: null, userId: null })
  const { birthdays, loading: loadingBirthdays } = useUpcomingBirthdays(supabase)

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50" role="status" aria-label="Loading">
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

      <main className="flex-1 p-4 sm:p-5 md:p-6 lg:p-8 lg:ml-64 min-w-0">
        <div className="w-full max-w-4xl mx-auto">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">Upcoming Birthdays</h1>
            <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">Birthdays in the next 30 days</p>
          </div>

          <UpcomingBirthdays birthdays={birthdays} loading={loadingBirthdays} />
        </div>
      </main>
    </div>
  )
}
