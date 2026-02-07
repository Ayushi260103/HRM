'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/hooks/useSupabase'
import Sidebar from '@/components/Sidebar'
import AnnouncementsPanel from '@/components/AnnouncementsPanel'

export default function EmployeeAnnouncementsPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)

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

      if (profile?.role !== 'employee') {
        router.replace('/dashboard')
        return
      }

      setUserName(profile?.full_name ?? null)
      setAvatarUrl(profile?.avatar_url ?? null)
      setRole(profile?.role ?? null)
      setLoading(false)
    }

    loadData()
  }, [router, supabase])

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p>Loading announcements...</p></div>
  if (!userId || !role) return <div className="p-8">Redirecting...</div>

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 0%, var(--primary-light) 80%)' }}
    >
      <Sidebar userEmail={email} userName={userName} avatarUrl={avatarUrl} role="employee" />

      <main className="flex-1 pt-14 px-4 pb-4 sm:pt-6 sm:px-5 sm:pb-5 md:pt-6 md:px-6 md:pb-6 lg:pt-8 lg:px-8 lg:pb-8 lg:ml-64 min-w-0">
        <div className="w-full max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Announcements</h1>
            <p className="text-gray-600 mt-2">Post updates for everyone and view all announcements</p>
          </div>

          <AnnouncementsPanel userId={userId} userName={userName || email || 'User'} userRole={role} />
        </div>
      </main>
    </div>
  )
}
