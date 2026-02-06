'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/hooks/useSupabase'
import { capitalizeName } from '@/lib/utils/string'
import Sidebar from '@/components/Sidebar'
import PageHeader from '@/components/PageHeader'
import Notifications from '@/components/Notifications'

type PendingUser = {
  id: string
  full_name: string | null
  email_id : string
  created_at: string
}

export default function PendingRequestsPage() {
  const router = useRouter()

  const [users, setUsers] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const supabase = useSupabase()

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
        router.replace('/dashboard/admin/home')
        return
      }

      setUserName(profile?.full_name ?? null)
      setAvatarUrl(profile?.avatar_url ?? null)

      const { data: pendingUsers } = await supabase
        .from('profiles')
        .select('id, full_name, email_id, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      setUsers(pendingUsers || [])
      setLoading(false)
    }

    loadData()
  }, [router, supabase])

  const approveUser = async (id: string, role: string) => {
    try {
      setActionMessage(null)
      const res = await fetch('/api/admin/set-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id, role }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Failed to update auth role')
      }

      const { error } = await supabase
        .from('profiles')
        .update({ status: 'active', role })
        .eq('id', id)

      if (error) throw error

      setUsers(users.filter(user => user.id !== id))
      setActionMessage({ type: 'success', text: `Approved user as ${role}.` })
    } catch (err) {
      console.error('Approve failed:', err)
      setActionMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to approve user' })
    }
  }

  const rejectUser = async (id: string) => {
    try {
      setActionMessage(null)
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'rejected' })
        .eq('id', id)

      if (error) throw error

      setUsers(users.filter(user => user.id !== id))
      setActionMessage({ type: 'success', text: 'User rejected.' })
    } catch (err) {
      console.error('Reject failed:', err)
      setActionMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to reject user' })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status" aria-label="Loading" style={{ background: 'var(--background)' }}>
        <p className="text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>Loading requests...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      <Sidebar userEmail={email} userName={userName} avatarUrl={avatarUrl} role="admin" />

      <div className="admin-notifications-fixed">
        {userId && <Notifications role="admin" userId={userId} />}
      </div>

      <main className="admin-main">
        <div className="w-full max-w-4xl mx-auto">
          <PageHeader title="Pending Requests" subtitle="Review and approve pending user registrations" />

          {actionMessage && (
            <div
              className={`mb-6 rounded-lg border px-4 py-3 text-sm font-medium ${
                actionMessage.type === 'success'
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}
            >
              {actionMessage.text}
            </div>
          )}

          {users.length === 0 ? (
            <div className="card card-body rounded-xl p-12 text-center" style={{ borderColor: 'var(--border)' }}>
              <p className="text-lg" style={{ color: 'var(--text-primary)' }}>All caught up!</p>
              <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>No pending approvals at the moment</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg p-4 border" style={{ backgroundColor: 'var(--primary-light)', borderColor: 'var(--primary)' }}>
                <p className="font-semibold" style={{ color: 'var(--primary)' }}>{users.length} {users.length === 1 ? 'request' : 'requests'} awaiting approval</p>
              </div>

              {users.map(user => (
                <div key={user.id} className="card card-body rounded-xl p-6 hover:shadow-md transition-shadow" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>{capitalizeName(user.full_name) || 'No name provided'}</p>
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-secondary)' }}>{user.email_id || 'No email provided'}</p>
                      <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>ID: {user.id.substring(0, 8)}...</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Applied: {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex gap-3 items-center flex-wrap">
                      <select
                        defaultValue="employee"
                        id={`role-${user.id}`}
                        className="rounded-lg px-3 py-2 text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      >
                        <option value="employee">Employee</option>
                        <option value="hr">HR</option>
                        <option value="admin">Admin</option>
                      </select>

                      <button
                        onClick={() => {
                          const role = (document.getElementById(`role-${user.id}`) as HTMLSelectElement).value
                          approveUser(user.id, role)
                        }}
                        className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors hover:opacity-90"
                        style={{ backgroundColor: 'var(--primary)' }}
                      >
                        Approve
                      </button>

                      <button
                        onClick={() => rejectUser(user.id)}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
