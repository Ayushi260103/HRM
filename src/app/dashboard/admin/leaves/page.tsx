'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/hooks/useSupabase'
import Sidebar from '@/components/Sidebar'

export default function AdminLeavesHomePage() {
  const router = useRouter()
  const supabase = useSupabase()
  const [email, setEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      setEmail(user.email ?? null)

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, status, full_name, avatar_url')
        .eq('id', user.id)
        .single()

      if (profile?.status !== 'active') {
        router.replace('/pending-approval')
        return
      }

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading leaves...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Sidebar userEmail={email} userName={userName} avatarUrl={avatarUrl} role="admin" />

      <main className="flex-1 pt-14 px-4 pb-4 sm:pt-6 sm:px-5 sm:pb-5 md:pt-6 md:px-6 md:pb-6 lg:pt-8 lg:px-8 lg:pb-8 lg:ml-64 min-w-0">
        <div className="w-full max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Leaves</h1>
            <p className="text-gray-600 mt-2">Choose what you want to manage</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Link href="/dashboard/admin/leaves/leave-requests" className="block group">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all">
                <div className="text-3xl mb-3">📄</div>
                <h3 className="font-semibold text-gray-900 text-lg group-hover:text-blue-600 transition">
                  Leave Requests
                </h3>
                <p className="text-sm text-gray-600 mt-2">Review and act on employee leave requests</p>
              </div>
            </Link>

            <Link href="/dashboard/admin/leaves/leave-allocation" className="block group">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all">
                <div className="text-3xl mb-3">🧮</div>
                <h3 className="font-semibold text-gray-900 text-lg group-hover:text-blue-600 transition">
                  Leave Allocation
                </h3>
                <p className="text-sm text-gray-600 mt-2">Create leave types and allocate balances</p>
              </div>
            </Link>

            <Link href="/dashboard/admin/leaves/holiday-allocation" className="block group">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all">
                <div className="text-3xl mb-3">📅</div>
                <h3 className="font-semibold text-gray-900 text-lg group-hover:text-blue-600 transition">
                  Holiday Allocation
                </h3>
                <p className="text-sm text-gray-600 mt-2">Mark office closed dates (holidays)</p>
              </div>
            </Link>

            <Link href="/dashboard/admin/leaves/weekend-allocation" className="block group">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all">
                <div className="text-3xl mb-3">🗓️</div>
                <h3 className="font-semibold text-gray-900 text-lg group-hover:text-blue-600 transition">
                  Weekend Allocation
                </h3>
                <p className="text-sm text-gray-600 mt-2">Set weekend days for HR and employees</p>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
