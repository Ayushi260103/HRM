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
  email_id: string | null
  department: string | null
  position: string | null
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
        .select('id, full_name, email_id, department, position')
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

  return (
    <div className="min-h-screen flex flex-col bg-[var(--primary-light)]/80">
      <Sidebar userEmail={email} userName={userName} avatarUrl={avatarUrl} role="hr" />
      <main className="admin-main">
        <LeavesNav basePath="/dashboard/hr/leaves" />
        <div className="max-w-4xl -ml-2">
          <h1 className="text-xl font-bold text-gray-900 text-left">Set weekly off days</h1>
        </div>
        <div className="max-w-4xl mx-auto">

          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : (
            <>
          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          <div className="mt-4 rounded-xl border border-[var(--primary-muted)] bg-white/70 shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[65vh] overflow-y-auto no-scrollbar">
              <table className="min-w-full divide-y divide-[var(--primary-muted)] text-sm">
                <thead className="bg-[var(--primary-light)]/80 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-[var(--text-primary)] uppercase tracking-tight">
                      Name
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-[var(--text-primary)] uppercase tracking-tight">
                      Email
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-[var(--text-primary)] uppercase tracking-tight">
                      Department
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-[var(--text-primary)] uppercase tracking-tight">
                      Designation
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-[var(--text-primary)] uppercase tracking-tight">
                      Weekend days
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-[var(--text-primary)] uppercase tracking-tight w-16">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--primary-muted)]">
                  {users.map(u => (
                    <tr key={u.id} className="odd:bg-white even:bg-[var(--primary-light)]/30 hover:bg-[var(--primary-light)]/60">
                      <td className="px-3 py-2 text-xs font-medium text-[var(--text-primary)] text-center">{capitalizeName(u.full_name) ?? '—'}</td>
                      <td className="px-3 py-2 text-xs text-slate-700 text-center">{u.email_id ?? '—'}</td>
                      <td className="px-3 py-2 text-xs text-slate-700 text-center">{u.department ?? '—'}</td>
                      <td className="px-3 py-2 text-xs text-slate-700 text-center">{u.position ?? '—'}</td>
                      <td className="px-3 py-2 text-xs text-slate-700 text-center">
                        {editingId === u.id ? (
                          <div className="flex flex-wrap gap-2 justify-center">
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
                      <td className="px-3 py-2 text-center w-16">
                        {editingId === u.id ? (
                          <div className="flex justify-center gap-1.5 flex-wrap">
                            <button type="button" onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700 text-xs">Cancel</button>
                            <button type="button" onClick={save} disabled={saving} className="text-blue-600 hover:text-blue-700 text-xs font-medium disabled:opacity-50">
                              {saving ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEdit(u)}
                            className="inline-flex items-center justify-center text-[var(--primary)] hover:text-[var(--primary-hover)]"
                            aria-label="Edit weekend days"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {users.length === 0 && (
              <div className="p-6 text-center text-gray-500 text-sm">No employees found.</div>
            )}
          </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
