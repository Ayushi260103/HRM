'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/hooks/useSupabase'
import { capitalizeName } from '@/lib/utils/string'
import Sidebar from '@/components/Sidebar'
import LeavesNav from '@/components/LeavesNav'

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
  department: string | null
  position: string | null
  weekend_days: number[]
}

export default function AdminWeekendAllocationPage() {
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
  const [departmentFilter, setDepartmentFilter] = useState<string>('')

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

      if (profile?.status !== 'active' || profile?.role !== 'admin') {
        router.replace('/dashboard')
        return
      }

      setUserName(profile?.full_name ?? null)
      setAvatarUrl(profile?.avatar_url ?? null)

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, department, position')
        .eq('status', 'active')
        .in('role', ['hr', 'employee'])
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
        department: p.department ?? null,
        position: p.position ?? null,
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

  const departments = [...new Set(users.map(u => u.department).filter((d): d is string => !!d))].sort()
  const filteredUsers = departmentFilter ? users.filter(u => u.department === departmentFilter) : users

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Sidebar userEmail={email} userName={userName} avatarUrl={avatarUrl} role="admin" />
      <main className="admin-main">
        <div className="max-w-4xl">
          <LeavesNav />
          <h1 className="text-2xl font-bold text-gray-900">Weekend Allocation</h1>
          <p className="text-gray-600 mt-1">Set which days of the week are off for HR and employees.</p>

          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : (
            <>
          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <span className="font-medium">Filter by department:</span>
              <select
                value={departmentFilter}
                onChange={e => setDepartmentFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">All departments</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-tight">
                      Name
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-tight">
                      Department
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-tight">
                      Designation
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-tight">
                      Weekend days
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-tight w-16">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs font-medium text-gray-900">{capitalizeName(u.full_name) ?? '—'}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{u.department ?? '—'}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{u.position ?? '—'}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">
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
                      <td className="px-3 py-2 text-right w-16">
                        {editingId === u.id ? (
                          <div className="flex justify-end gap-1.5 flex-wrap">
                            <button type="button" onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700 text-xs">Cancel</button>
                            <button type="button" onClick={save} disabled={saving} className="text-blue-600 hover:text-blue-700 text-xs font-medium disabled:opacity-50">
                              {saving ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => startEdit(u)} className="text-blue-600 hover:text-blue-700 text-xs font-medium">Edit</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredUsers.length === 0 && (
              <div className="p-6 text-center text-gray-500 text-sm">
                {users.length === 0 ? 'No HR or employees found.' : 'No employees in this department.'}
              </div>
            )}
          </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
