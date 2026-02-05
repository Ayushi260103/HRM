'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/hooks/useSupabase'
import Sidebar from '@/components/Sidebar'

type Holiday = {
  id: string
  date: string
  name: string
  created_at: string
}

export default function HRHolidayAllocationPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [newDate, setNewDate] = useState('')
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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

      const { data, error: fetchErr } = await supabase
        .from('office_holidays')
        .select('id, date, name, created_at')
        .order('date', { ascending: true })

      if (fetchErr) {
        setError(fetchErr.message)
      } else {
        setHolidays(data ?? [])
      }
      setLoading(false)
    }
    load()
  }, [router, supabase])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!newDate.trim() || !newName.trim()) {
      setError('Please enter date and name')
      return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error: insertErr } = await supabase
      .from('office_holidays')
      .insert({
        date: newDate,
        name: newName.trim(),
        created_by: user?.id ?? null,
      })
    setSaving(false)
    if (insertErr) {
      setError(insertErr.message)
      return
    }
    setNewDate('')
    setNewName('')
    const { data } = await supabase.from('office_holidays').select('id, date, name, created_at').order('date', { ascending: true })
    setHolidays(data ?? [])
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    await supabase.from('office_holidays').delete().eq('id', id)
    setHolidays(prev => prev.filter(h => h.id !== id))
    setDeletingId(null)
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
      <main className="flex-1 pt-14 px-4 pb-4 sm:pt-6 sm:px-5 sm:pb-5 md:pt-6 md:px-6 md:pb-6 lg:pt-8 lg:px-8 lg:pb-8 lg:ml-64 min-w-0">
        <div className="max-w-4xl">
          <Link href="/dashboard/hr/leaves" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
            ← Back to Leave Management
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Holiday Allocation</h1>
          <p className="text-gray-600 mt-1">Mark dates when the office is closed. These apply to everyone.</p>

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          <form onSubmit={handleAdd} className="mt-6 p-4 bg-white rounded-xl border border-gray-200 flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2"
                required
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Diwali, Christmas"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                required
              />
            </div>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Adding...' : 'Add Holiday'}
            </button>
          </form>

          <div className="mt-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {holidays.map(h => (
                  <tr key={h.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{new Date(h.date).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{h.name}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(h.id)}
                        disabled={deletingId === h.id}
                        className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                      >
                        {deletingId === h.id ? 'Removing...' : 'Remove'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {holidays.length === 0 && (
              <div className="p-8 text-center text-gray-500 text-sm">No holidays added yet. Add a date above.</div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
