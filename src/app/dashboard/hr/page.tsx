'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export default function HRDashboardPage() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, status')
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

      setEmail(user.email ?? null)
      setLoading(false)
    }

    checkAccess()
  }, [router])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading) return <p className="p-6">Checking access...</p>

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            ← Dashboards
          </Link>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            HRM
          </h1>
        </div>
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
        <h2 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">
          HR dashboard
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          People, leave, and policies
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="p-5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Team
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Directory and org structure.
            </p>
          </div>

          <div className="p-5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <Link
  href="/dashboard/hr/attendance"
  className="p-5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 transition-colors block"
>
  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
    Attendance Logs
  </h3>
  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
    View employee clock-in and clock-out records.
  </p>
</Link>

            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Requests and approvals.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
