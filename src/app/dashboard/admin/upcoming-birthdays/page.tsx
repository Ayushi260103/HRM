'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import UpcomingBirthdays, { useUpcomingBirthdays } from '@/components/UpcomingBirthdays'
import { useSupabase } from '@/hooks/useSupabase'

type UserState = { email: string | null; userName: string | null; avatarUrl: string | null; userId: string | null }

export default function AdminUpcomingBirthdaysPage() {
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
      if (profile?.role !== 'admin') {
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
      <div className="min-h-screen flex items-center justify-center" role="status" aria-label="Loading" style={{ background: 'var(--background)' }}>
        <p className="text-slate-500 text-sm sm:text-base">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      <Sidebar userEmail={user.email} userName={user.userName} avatarUrl={user.avatarUrl} role="admin" />

      <main className="admin-main">
        <div className="w-full max-w-4xl mx-auto">
          <div className="mb-6 sm:mb-8">
            <div className="rounded-2xl border border-[var(--border)] bg-white px-6 py-5 shadow-sm">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 truncate">Upcoming Birthdays</h1>
              <p className="text-slate-500 mt-1 sm:mt-2 text-sm sm:text-base">Birthdays in the next 30 days</p>
            </div>
          </div>

          <UpcomingBirthdays birthdays={birthdays} loading={loadingBirthdays} />
        </div>
      </main>
    </div>
  )
}
