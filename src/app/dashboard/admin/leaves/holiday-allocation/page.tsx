'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/hooks/useSupabase'
import Sidebar from '@/components/Sidebar'
import LeavesNav from '@/components/LeavesNav'

type Holiday = {
  id: string
  date: string
  name: string
  created_at: string
}

export default function AdminHolidayAllocationPage() {
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
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editName, setEditName] = useState('')
  const [savingEditId, setSavingEditId] = useState<string | null>(null)

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
    const existing = holidays.find(h => h.date === newDate)
    if (existing) {
      const wantEdit = window.confirm('A holiday already exists for this date. Would you like to edit it?')
      if (wantEdit) {
        setShowAddForm(false)
        setNewDate('')
        setNewName('')
        setEditingId(existing.id)
        setEditDate(existing.date)
        setEditName(existing.name)
      }
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
    setShowAddForm(false)
    const { data } = await supabase.from('office_holidays').select('id, date, name, created_at').order('date', { ascending: true })
    setHolidays(data ?? [])
  }

  const startEdit = (h: Holiday) => {
    setEditingId(h.id)
    setEditDate(h.date)
    setEditName(h.name)
    setError(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditDate('')
    setEditName('')
  }

  const handleSaveEdit = async (id: string) => {
    if (!editDate.trim() || !editName.trim()) {
      setError('Date and name are required')
      return
    }
    const otherWithSameDate = holidays.find(h => h.id !== id && h.date === editDate)
    if (otherWithSameDate) {
      setError('Another holiday already exists for this date.')
      return
    }
    setSavingEditId(id)
    setError(null)
    const { error: updateErr } = await supabase
      .from('office_holidays')
      .update({ date: editDate, name: editName.trim() })
      .eq('id', id)
    setSavingEditId(null)
    if (updateErr) {
      setError(updateErr.message)
      return
    }
    setHolidays(prev => prev.map(h => h.id === id ? { ...h, date: editDate, name: editName.trim() } : h))
    cancelEdit()
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    await supabase.from('office_holidays').delete().eq('id', id)
    setHolidays(prev => prev.filter(h => h.id !== id))
    setDeletingId(null)
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Sidebar userEmail={email} userName={userName} avatarUrl={avatarUrl} role="admin" />
      <main className="admin-main">
        <div className="max-w-4xl">
          <LeavesNav />
          <h1 className="text-2xl font-bold text-gray-900">Holiday allocation</h1>
          <p className="text-gray-600 mt-1">Mark dates when the office is closed. These apply to everyone.</p>

          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : (
            <>
          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          <div className="mt-6">
            {!showAddForm ? (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                Add holiday
              </button>
            ) : (
              <form onSubmit={handleAdd} className="p-4 bg-white rounded-xl border border-gray-200 flex flex-wrap items-end gap-4">
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
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); setNewDate(''); setNewName(''); }}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </form>
            )}
          </div>

          <div className="mt-6 bg-white rounded-xl border border-gray-200 overflow-x-auto admin-table-wrap">
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
                    {editingId === h.id ? (
                      <>
                        <td className="px-4 py-3">
                          <input
                            type="date"
                            value={editDate}
                            onChange={e => setEditDate(e.target.value)}
                            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            placeholder="Holiday name"
                            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-full max-w-xs"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(h.id)}
                            disabled={savingEditId === h.id}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium mr-2 disabled:opacity-50"
                          >
                            {savingEditId === h.id ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="text-gray-600 hover:text-gray-800 text-sm font-medium mr-2"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(h.id)}
                            disabled={deletingId === h.id}
                            className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                          >
                            {deletingId === h.id ? 'Removing...' : 'Remove'}
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-sm text-gray-900">{new Date(h.date).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{h.name}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => startEdit(h)}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium mr-2"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(h.id)}
                            disabled={deletingId === h.id}
                            className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                          >
                            {deletingId === h.id ? 'Removing...' : 'Remove'}
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {holidays.length === 0 && (
              <div className="p-8 text-center text-gray-500 text-sm">No holidays added yet. Add a date above.</div>
            )}
          </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
