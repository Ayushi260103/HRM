'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSupabase } from '@/hooks/useSupabase'
import Sidebar from '@/components/Sidebar'
import Notifications from '@/components/Notifications'

type UserState = {
  email: string | null
  userName: string | null
  avatarUrl: string | null
  userId: string | null
}

const initialUserState: UserState = {
  email: null,
  userName: null,
  avatarUrl: null,
  userId: null,
}

export default function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<UserState>(initialUserState)

  const supabase = useSupabase()

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50" role="status" aria-label="Loading dashboard">
        <p className="text-gray-600 text-sm sm:text-base">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Sidebar userEmail={user.email} userName={user.userName} avatarUrl={user.avatarUrl} role="admin" />

      {/* Notification Bell */}
      <div className="fixed top-4 right-4 z-50 lg:top-6 lg:right-8">
        {user.userId && <Notifications role="admin" userId={user.userId} />}
      </div>

      <main className="flex-1 p-4 sm:p-5 md:p-6 lg:p-8 lg:ml-64 min-w-0">
        <div className="w-full max-w-4xl mx-auto">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base truncate">Welcome back, {user.userName || 'Admin'}</p>
          </div>

          <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <Link href="/dashboard/admin/pending" className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 hover:shadow-md hover:border-blue-300 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[88px] sm:min-h-0 flex flex-col justify-center">
              <span className="text-2xl sm:text-3xl mb-2 block" aria-hidden>📋</span>
              <h3 className="font-semibold text-gray-900 text-sm">Pending Requests</h3>
              <p className="text-xs text-gray-600 mt-1">Review user approvals</p>
            </Link>
            <Link href="/dashboard/admin/employees" className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 hover:shadow-md hover:border-blue-300 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[88px] sm:min-h-0 flex flex-col justify-center">
              <span className="text-2xl sm:text-3xl mb-2 block" aria-hidden>👥</span>
              <h3 className="font-semibold text-gray-900 text-sm">All Employees</h3>
              <p className="text-xs text-gray-600 mt-1">View all profiles</p>
            </Link>
            <Link href="/dashboard/admin/attendance" className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-5 hover:shadow-md hover:border-blue-300 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[88px] sm:min-h-0 flex flex-col justify-center sm:col-span-2 lg:col-span-1">
              <span className="text-2xl sm:text-3xl mb-2 block" aria-hidden>📊</span>
              <h3 className="font-semibold text-gray-900 text-sm">Attendance</h3>
              <p className="text-xs text-gray-600 mt-1">Track all records</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
