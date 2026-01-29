'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      setEmail(user.email ?? null)

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('status, role')
        .eq('id', user.id)
        .single()

      if (error || !profile) {
        await supabase.auth.signOut()
        router.replace('/login')
        return
      }

      if (profile.status !== 'active') {
        await supabase.auth.signOut()
        router.replace('/pending-approval')
        return
      }

      setRole(profile.role)
      setLoading(false)
    }

    checkAccess()
  }, [router, supabase])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Loading dashboard…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          HRM
        </h1>
        <div className="flex items-center gap-4">
          {email && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {email}
            </span>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <h2 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-6">
          Choose dashboard
        </h2>

        <div className="grid gap-4 sm:grid-cols-3">

          {role === 'admin' && (
            <Link href="/dashboard/admin" className="block p-5 rounded-lg border bg-white dark:bg-gray-900">
              <span className="text-sm text-gray-500">Admin</span>
              <p className="mt-1 font-medium">Admin dashboard</p>
              <p className="text-sm text-gray-500">System and settings</p>
            </Link>
          )}

          {(role === 'admin' || role === 'hr') && (
            <Link href="/dashboard/hr" className="block p-5 rounded-lg border bg-white dark:bg-gray-900">
              <span className="text-sm text-gray-500">HR</span>
              <p className="mt-1 font-medium">HR dashboard</p>
              <p className="text-sm text-gray-500">People and policies</p>
            </Link>
          )}

          <Link href="/dashboard/employee" className="block p-5 rounded-lg border bg-white dark:bg-gray-900">
            <span className="text-sm text-gray-500">Employee</span>
            <p className="mt-1 font-medium">Employee dashboard</p>
            <p className="text-sm text-gray-500">Your overview</p>
          </Link>

        </div>
      </main>
    </div>
  )
}
