'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import UpcomingBirthdays, { useUpcomingBirthdays } from '@/components/UpcomingBirthdays'
import { useSupabase } from '@/hooks/useSupabase'

type UserState = { email: string | null; userName: string | null; avatarUrl: string | null; userId: string | null }

export default function EmployeeMomentsPage() {
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600 text-sm sm:text-base">Loading...</p>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,0.55), rgba(255,255,255,0.55)), url('/image/bg.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <Sidebar userEmail={user.email} userName={user.userName} avatarUrl={user.avatarUrl} role="employee" />

      <main className="admin-main">
        <div className="w-full max-w-4xl mx-auto">
          <div className="page-header mt-6 w-full">
            <div className="-ml-2">
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Upcoming Birthdays</h1>
            </div>
            <Link
              href="/dashboard/employee/moments/office-holidays"
              className="ml-auto inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:border-slate-300"
            >
              View upcoming holidays
            </Link>
          </div>

          <UpcomingBirthdays birthdays={birthdays} loading={loadingBirthdays} />
        </div>
      </main>
    </div>
  )
}
