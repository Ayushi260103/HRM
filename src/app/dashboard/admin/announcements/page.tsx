'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/hooks/useSupabase'
import Sidebar from '@/components/Sidebar'
import PageHeader from '@/components/PageHeader'
import AnnouncementsPanel from '@/components/AnnouncementsPanel'

export default function AdminAnnouncementsPage() {
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

      if (profile?.role !== 'admin') {
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

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}><p style={{ color: 'var(--text-secondary)' }}>Loading announcements...</p></div>
  if (!userId || !role) return <div className="p-6" style={{ color: 'var(--text-secondary)' }}>Redirecting...</div>

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      <Sidebar userEmail={email} userName={userName} avatarUrl={avatarUrl} role="admin" />

      <main className="admin-main">
        <div className="w-full max-w-4xl">
          <PageHeader title="Announcements" subtitle="Post updates for everyone and view all announcements" />

          <AnnouncementsPanel userId={userId} userName={userName || email || 'User'} userRole={role} />
        </div>
      </main>
    </div>
  )
}
