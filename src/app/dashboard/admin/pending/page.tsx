'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/hooks/useSupabase'
import { capitalizeName } from '@/lib/utils/string'
import Sidebar from '@/components/Sidebar'
import PageHeader from '@/components/PageHeader'

type PendingUser = {
  id: string
  full_name: string | null
  email_id : string
  created_at: string
}

type RecentlyApprovedUser = {
  id: string
  full_name: string | null
  email_id: string
  role: string
  created_at: string
}

type RecentlyRejectedUser = {
  id: string
  full_name: string | null
  email_id: string
  created_at: string
}

export default function PendingRequestsPage() {
  const router = useRouter()

  const [users, setUsers] = useState<PendingUser[]>([])
  const [recentlyApproved, setRecentlyApproved] = useState<RecentlyApprovedUser[]>([])
  const [recentlyRejected, setRecentlyRejected] = useState<RecentlyRejectedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  // const [userId, setUserId] = useState<string | null>(null)
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
      // setUserId(user.id)

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

      const { data: approvedUsers } = await supabase
        .from('profiles')
        .select('id, full_name, email_id, role, created_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(3)

      setRecentlyApproved((approvedUsers || []) as RecentlyApprovedUser[])

      const { data: rejectedUsers } = await supabase
        .from('profiles')
        .select('id, full_name, email_id, created_at')
        .eq('status', 'rejected')
        .order('created_at', { ascending: false })
        .limit(3)

      setRecentlyRejected((rejectedUsers || []) as RecentlyRejectedUser[])

      setLoading(false)
    }

    loadData()
  }, [router, supabase])

  const approveUser = async (id: string, role: string) => {
    const approvedUser = users.find(u => u.id === id)
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
      if (approvedUser) {
        setRecentlyApproved(prev => [
          { ...approvedUser, role },
          ...prev.slice(0, 2),
        ])
      }
      setActionMessage({ type: 'success', text: `Approved user as ${role}.` })
    } catch (err) {
      console.error('Approve failed:', err)
      setActionMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to approve user' })
    }
  }

  const rejectUser = async (id: string) => {
    const rejectedUser = users.find(u => u.id === id)
    try {
      setActionMessage(null)
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'rejected' })
        .eq('id', id)

      if (error) throw error

      setUsers(users.filter(user => user.id !== id))
      if (rejectedUser) {
        setRecentlyRejected(prev => [
          { ...rejectedUser },
          ...prev.slice(0, 2),
        ])
      }
      setActionMessage({ type: 'success', text: 'User rejected.' })
    } catch (err) {
      console.error('Reject failed:', err)
      setActionMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to reject user' })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status" aria-label="Loading" style={{ background: 'var(--background)' }}>
        <p className="text-sm text-slate-500">Loading requests...</p>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 0%, var(--primary-light) 75%)' }}
    >
      <Sidebar userEmail={email} userName={userName} avatarUrl={avatarUrl} role="admin" />

      <main className="admin-main mt-6 no-scrollbar overflow-y-auto min-h-0">
        <div className="w-full max-w-4xl mx-auto">
          <PageHeader title="Pending Requests" subtitle="Review and approve pending user registrations" />

          {actionMessage && (
            <div
              className={`mb-6 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                actionMessage.type === 'success'
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}
            >
              {actionMessage.text}
            </div>
          )}

          {users.length === 0 ? (
            <div className="card card-body p-12 text-center">
              <p className="text-lg font-semibold text-slate-900">All caught up!</p>
              <p className="text-sm mt-1 text-slate-500">No pending approvals at the moment</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg p-4 bg-[var(--primary-light)] border border-[var(--primary-muted)]">
                <p className="font-semibold text-sm text-[var(--primary)]">{users.length} {users.length === 1 ? 'request' : 'requests'} awaiting approval</p>
              </div>

              {users.map(user => (
                <div key={user.id} className="card card-body p-6 transition-all pending-request-card">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="pending-card-title font-semibold text-slate-900">{capitalizeName(user.full_name) || 'No name provided'}</p>
                      <p className="pending-card-subtitle text-sm text-slate-600">{user.email_id || 'No email provided'}</p>
                      <p className="pending-card-meta text-xs mt-0.5 text-slate-500">ID: {user.id.substring(0, 8)}...</p>
                      <p className="pending-card-meta text-xs mt-0.5 text-slate-500">Applied: {new Date(user.created_at).toLocaleDateString()}</p>
                    </div>

                    <div className="flex gap-2 items-center flex-wrap">
                      <select
                        defaultValue="employee"
                        id={`role-${user.id}`}
                        className="input-base rounded-lg px-3 py-2 text-sm font-medium text-slate-700"
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
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                      >
                        Approve
                      </button>

                      <button
                        onClick={() => rejectUser(user.id)}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(recentlyApproved.length > 0 || recentlyRejected.length > 0) && (
            <section className="mt-12">
              <h2 className="text-base font-semibold text-slate-900 mb-1">Recently Processed Requests</h2>
              <p className="text-sm text-slate-500 mb-4">Latest 3 approved and rejected registrations</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-800">Latest Approved</h3>
                  {recentlyApproved.length === 0 ? (
                    <div className="card card-body p-4 text-sm text-slate-500">No approved requests yet.</div>
                  ) : (
                    recentlyApproved.slice(0, 3).map(user => (
                      <div
                        key={user.id}
                        className="card card-body p-4 border border-slate-200 bg-white transition-colors approved-card"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900">{capitalizeName(user.full_name) || 'No name provided'}</p>
                            <p className="text-sm text-slate-600">{user.email_id || 'No email provided'}</p>
                            <p className="text-xs mt-0.5 text-slate-500">Applied: {new Date(user.created_at).toLocaleDateString()}</p>
                          </div>
                          <span className="badge-common badge-approved shrink-0">Approved</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-800">Latest Rejected</h3>
                  {recentlyRejected.length === 0 ? (
                    <div className="card card-body p-4 text-sm text-slate-500">No rejected requests yet.</div>
                  ) : (
                    recentlyRejected.slice(0, 3).map(user => (
                      <div
                        key={user.id}
                        className="card card-body p-4 border border-slate-200 bg-white transition-colors rejected-card"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900">{capitalizeName(user.full_name) || 'No name provided'}</p>
                            <p className="text-sm text-slate-600">{user.email_id || 'No email provided'}</p>
                            <p className="text-xs mt-0.5 text-slate-500">Applied: {new Date(user.created_at).toLocaleDateString()}</p>
                          </div>
                          <span className="badge-common badge-rejected shrink-0">Rejected</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
