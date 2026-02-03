'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'

export default function DashboardPage() {
  const router = useRouter()

  const [email, setEmail] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      setEmail(user.email ?? null)

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('status, role, full_name')
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
      if (profile.role === 'admin') {
        
        router.replace('/dashboard/admin')
        return
      }
      if (profile.role === 'hr') {
        
        router.replace('/dashboard/hr ')
        return
      }
      if (profile.role === 'employee') {
        
        router.replace('/dashboard/employee')
        return
      }

      setUserName(profile.full_name)
      setRole(profile.role)
      setLoading(false)
    }

    checkAccess()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading dashboard…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Sidebar userEmail={email} userName={userName} role={role} />

      <main className="flex-1 p-4 sm:p-5 md:p-6 lg:p-8 lg:ml-64">
        <div className="w-full max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-2">Select your workspace below</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {role === 'admin' && (
              <Link href="/dashboard/admin" className="block group">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer">
                  <div className="text-3xl mb-3">⚙️</div>
                  <h3 className="font-semibold text-gray-900 text-lg group-hover:text-blue-600 transition">Admin Panel</h3>
                  <p className="text-sm text-gray-600 mt-2">Approve pending users and manage system settings</p>
                </div>
              </Link>
            )}

            {(role === 'admin' || role === 'hr') && (
              <Link href="/dashboard/hr" className="block group">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer">
                  <div className="text-3xl mb-3">👥</div>
                  <h3 className="font-semibold text-gray-900 text-lg group-hover:text-blue-600 transition">HR Dashboard</h3>
                  <p className="text-sm text-gray-600 mt-2">Manage employees, attendance, and policies</p>
                </div>
              </Link>
            )}

            <Link href="/dashboard/employee" className="block group">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer">
                <div className="text-3xl mb-3">👤</div>
                <h3 className="font-semibold text-gray-900 text-lg group-hover:text-blue-600 transition">My Dashboard</h3>
                <p className="text-sm text-gray-600 mt-2">View your profile and track attendance</p>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}