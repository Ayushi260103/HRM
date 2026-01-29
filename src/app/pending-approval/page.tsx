'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function PendingApprovalPage() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          HRM
        </h1>
        <button
          type="button"
          onClick={handleLogout}
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
        >
          Log out
        </button>
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        <p className="text-center text-gray-700 dark:text-gray-300">
          Your approval is pending, wait til it gets approved.
        </p>
      </main>
    </div>
  )
}
