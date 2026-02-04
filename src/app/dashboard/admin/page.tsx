'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import Notifications from '@/components/Notifications'

export default function AdminDashboard() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      setEmail(user.email ?? null)
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name, avatar_url')
        .eq('id', user.id)
        .single()

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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p>Loading dashboard...</p></div>

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Sidebar userEmail={email} userName={userName} avatarUrl={avatarUrl} role="admin" />

      {/* Notification Bell */}
      <div className="fixed top-4 right-4 z-50 lg:top-6 lg:right-8">
        {userId && <Notifications role="admin" userId={userId} />}
      </div>

      <main className="flex-1 p-4 sm:p-5 md:p-6 lg:p-8 lg:ml-64">
        <div className="w-full max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">Welcome back, {userName || 'Admin'}</p>
          </div>

          {/* Quick Links */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <a href="/dashboard/admin/pending" className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md hover:border-blue-300 transition-all">
              <div className="text-3xl mb-2">ðŸ“‹</div>
              <h3 className="font-semibold text-gray-900 text-sm">Pending Requests</h3>
              <p className="text-xs text-gray-600 mt-1">Review user approvals</p>
            </a>
            <a href="/dashboard/admin/employees" className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md hover:border-blue-300 transition-all">
              <div className="text-3xl mb-2">ðŸ‘¥</div>
              <h3 className="font-semibold text-gray-900 text-sm">All Employees</h3>
              <p className="text-xs text-gray-600 mt-1">View all profiles</p>
            </a>
            <a href="/dashboard/admin/attendance" className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md hover:border-blue-300 transition-all">
              <div className="text-3xl mb-2">ðŸ“…</div>
              <h3 className="font-semibold text-gray-900 text-sm">Attendance</h3>
              <p className="text-xs text-gray-600 mt-1">Track all records</p>
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
