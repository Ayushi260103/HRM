'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type PendingUser = {
  id: string
  full_name: string | null
  created_at: string
}

export default function AdminDashboard() {
  const supabase = createClient()
  const router = useRouter()

  const [users, setUsers] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        router.replace('/dashboard')
        return
      }

      const { data: pendingUsers } = await supabase
        .from('profiles')
        .select('id, full_name, created_at')
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

  if (loading) return <p className="p-6">Loading requests...</p>

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Pending User Approvals</h1>

      {users.length === 0 && (
        <p className="text-gray-500">No pending requests 🎉</p>
      )}

      <div className="space-y-4">
        {users.map(user => (
          <div key={user.id} className="p-4 border rounded-lg bg-white dark:bg-gray-900 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{user.full_name || 'No name provided'}</p>
              <p className="text-sm text-gray-500">User ID: {user.id}</p>
            </div>

            <div className="flex gap-2 items-center">
              <select
                defaultValue="employee"
                id={`role-${user.id}`}
                className="border rounded px-2 py-1 text-sm"
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
                className="bg-green-600 text-white px-3 py-1 rounded text-sm"
              >
                Approve
              </button>

              <button
                onClick={() => rejectUser(user.id)}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
