'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/hooks/useSupabase'
import Sidebar from '@/components/Sidebar'

const DAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
] as const

type UserRow = {
  id: string
  full_name: string | null
  email_id: string | null
  weekend_days: number[]
}

export default function HRWeekendAllocationPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDays, setEditDays] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
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

      if (profile?.status !== 'active' || profile?.role !== 'hr') {
        router.replace('/dashboard')
        return
      }

      setUserName(profile?.full_name ?? null)
      setAvatarUrl(profile?.avatar_url ?? null)

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email_id')
        .eq('status', 'active')
        .eq('role', 'employee')
        .order('full_name', { ascending: true })

      const ids = (profiles ?? []).map(p => p.id)
      let weekends: { user_id: string; weekend_days: number[] }[] = []
      if (ids.length > 0) {
        const { data } = await supabase
          .from('user_weekends')
          .select('user_id, weekend_days')
          .in('user_id', ids)
        weekends = data ?? []
      }

      const map = new Map<string, number[]>()
      for (const w of weekends) {
        map.set(w.user_id, (w.weekend_days ?? []) as number[])
      }

      setUsers((profiles ?? []).map(p => ({
        id: p.id,
        full_name: p.full_name,
        email_id: p.email_id,
        weekend_days: map.get(p.id) ?? [],
      })))
      setLoading(false)
    }
    load()
  }, [router, supabase])

  const startEdit = (u: UserRow) => {
    setEditingId(u.id)
    setEditDays([...(u.weekend_days || [])].sort((a, b) => a - b))
    setError(null)
  }

  const toggleDay = (d: number) => {
    setEditDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort((a, b) => a - b))
  }

  const save = async () => {
    if (!editingId) return
    setSaving(true)
    setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    const { error: upsertErr } = await supabase
      .from('user_weekends')
      .upsert({
        user_id: editingId,
        weekend_days: editDays,
        updated_at: new Date().toISOString(),
        updated_by: user?.id ?? null,
      }, { onConflict: 'user_id' })
    setSaving(false)
    if (upsertErr) {
      setError(upsertErr.message)
      return
    }
    setUsers(prev => prev.map(u => u.id === editingId ? { ...u, weekend_days: editDays } : u))
    setEditingId(null)
  }

  const formatDays = (days: number[]) => {
    if (!days || days.length === 0) return '—'
    return days.map(d => DAYS.find(x => x.value === d)?.label ?? d).join(', ')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Sidebar userEmail={email} userName={userName} avatarUrl={avatarUrl} role="hr" />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:ml-64">
        <div className="max-w-4xl">
          <Link href="/dashboard/hr/leaves" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
            ← Back to Leave Management
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Weekend Allocation</h1>
          <p className="text-gray-600 mt-1">Set which days of the week are off for employees.</p>

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          <div className="mt-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Weekend days</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map(u => (
                  <tr key={u.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{u.email_id ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {editingId === u.id ? (
                        <div className="flex flex-wrap gap-2">
                          {DAYS.map(d => (
                            <label key={d.value} className="inline-flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editDays.includes(d.value)}
                                onChange={() => toggleDay(d.value)}
                                className="rounded border-gray-300"
                              />
                              <span className="text-xs">{d.label}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        formatDays(u.weekend_days)
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editingId === u.id ? (
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setEditingId(null)} className="text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                          <button type="button" onClick={save} disabled={saving} className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50">
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => startEdit(u)} className="text-sm text-blue-600 hover:text-blue-700 font-medium">Edit</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="p-8 text-center text-gray-500 text-sm">No employees found.</div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
