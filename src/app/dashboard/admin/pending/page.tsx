'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'

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

  const supabase = createClient()

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
        .select('role, full_name, avatar_url')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        router.replace('/dashboard')
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
    await supabase
      .from('profiles')
      .update({ status: 'active', role })
      .eq('id', id)

    setUsers(users.filter(user => user.id !== id))
  }

  const rejectUser = async (id: string) => {
    await supabase
      .from('profiles')
      .update({ status: 'rejected' })
      .eq('id', id)

    setUsers(users.filter(user => user.id !== id))
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p>Loading requests...</p></div>

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Sidebar userEmail={email} userName={userName} avatarUrl={avatarUrl} role="admin" />

      <main className="flex-1 p-4 sm:p-5 md:p-6 lg:p-8 lg:ml-64">
        <div className="w-full max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Pending Requests</h1>
            <p className="text-gray-600 mt-2">Review and approve pending user registrations</p>
          </div>

          {users.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="text-5xl mb-3">🎉</div>
              <p className="text-gray-600 text-lg">All caught up!</p>
              <p className="text-gray-500 text-sm mt-2">No pending approvals at the moment</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-900 font-semibold">📊 {users.length} {users.length === 1 ? 'request' : 'requests'} awaiting approval</p>
              </div>

              {users.map(user => (
                <div key={user.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-900 text-lg">{user.full_name || 'No name provided'}</p>
                      <p className="font-semibold text-gray-600 text-sm">{user.email_id || 'No email provided'}</p>
                      <p className="text-sm text-gray-500 mt-1">ID: {user.id.substring(0, 8)}...</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Applied: {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex gap-3 items-center flex-wrap">
                      <select
                        defaultValue="employee"
                        id={`role-${user.id}`}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
                      >
                        ✅ Approve
                      </button>

                      <button
                        onClick={() => rejectUser(user.id)}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
                      >
                        ❌ Reject
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
