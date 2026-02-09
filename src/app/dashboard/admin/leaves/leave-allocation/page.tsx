'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/hooks/useSupabase'
import { capitalizeName } from '@/lib/utils/string'
import Sidebar from '@/components/Sidebar'
import LeavesNav from '@/components/LeavesNav'

type LeaveType = {
  id: string
  name: string
  default_balance: number | null
  is_system: boolean | null
}

type Employee = {
  id: string
  full_name: string | null
  email_id: string | null
  role: string | null
}

type LeaveBalance = {
  id: string
  user_id: string
  leave_type_id: string
  year: number
  allocated: number | null
  used: number | null
}

const SYSTEM_TYPES = [
  { name: 'Casual', default_balance: 0 },
  { name: 'Medical', default_balance: 0 },
  { name: 'Half Day', default_balance: 0 },
]

export default function LeaveAllocationPage() {
  const router = useRouter()
  const supabase = useSupabase()

  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [balances, setBalances] = useState<LeaveBalance[]>([])

  const [selectedTypeId, setSelectedTypeId] = useState<string>('')
  const [newTypeName, setNewTypeName] = useState('')
  const [newTypeDefault, setNewTypeDefault] = useState<number>(0)
  const [savingType, setSavingType] = useState(false)
  const [deletingTypeId, setDeletingTypeId] = useState<string | null>(null)

  const [allocationUserId, setAllocationUserId] = useState<string>('')
  const [allocationValue, setAllocationValue] = useState<number>(0)
  const [savingAllocation, setSavingAllocation] = useState(false)
  const [seedingDefaults, setSeedingDefaults] = useState(false)

  const currentYear = new Date().getFullYear()

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
        .select('role, status, full_name, avatar_url')
        .eq('id', user.id)
        .single()

      if (profile?.status !== 'active') {
        router.replace('/pending-approval')
        return
      }

      if (profile?.role !== 'admin') {
        router.replace('/dashboard')
        return
      }

      setUserName(profile?.full_name ?? null)
      setAvatarUrl(profile?.avatar_url ?? null)

      const { data: types } = await supabase
        .from('leave_types')
        .select('id, name, default_balance, is_system')
        .order('name', { ascending: true })

      if (!types || types.length === 0) {
        await supabase
          .from('leave_types')
          .insert(SYSTEM_TYPES.map(t => ({
            name: t.name,
            default_balance: t.default_balance,
            is_system: true,
          })))
      }

      const { data: refreshedTypes } = await supabase
        .from('leave_types')
        .select('id, name, default_balance, is_system')
        .order('name', { ascending: true })

      setLeaveTypes(refreshedTypes || [])
      setSelectedTypeId(refreshedTypes?.[0]?.id || '')

      const { data: people } = await supabase
        .from('profiles')
        .select('id, full_name, email_id, role')
        .in('role', ['employee', 'hr'])
        .order('full_name', { ascending: true })

      setEmployees(people || [])

      setLoading(false)
    }

    loadData()
  }, [router, supabase])

  useEffect(() => {
    const loadBalances = async () => {
      if (!selectedTypeId) return
      const { data } = await supabase
        .from('leave_balances')
        .select('id, user_id, leave_type_id, year, allocated, used')
        .eq('leave_type_id', selectedTypeId)
        .eq('year', currentYear)

      setBalances(data || [])
    }

    loadBalances()
  }, [selectedTypeId, currentYear, supabase])

  const balanceMap = useMemo(() => {
    return new Map(balances.map(b => [b.user_id, b]))
  }, [balances])

  const selectedType = leaveTypes.find(t => t.id === selectedTypeId) || null

  const handleCreateType = async () => {
    if (!newTypeName.trim()) return
    setSavingType(true)

    const { data, error } = await supabase
      .from('leave_types')
      .insert({
        name: newTypeName.trim(),
        default_balance: newTypeDefault,
        is_system: false,
      })
      .select()
      .single()

    if (!error && data) {
      setLeaveTypes(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedTypeId(data.id)
      setNewTypeName('')
      setNewTypeDefault(0)
    }

    setSavingType(false)
  }

  const handleUpdateDefault = async (typeId: string, value: number) => {
    await supabase
      .from('leave_types')
      .update({ default_balance: value })
      .eq('id', typeId)

    setLeaveTypes(prev => prev.map(t => (t.id === typeId ? { ...t, default_balance: value } : t)))
  }

  const handleDeleteType = async (typeId: string) => {
    const target = leaveTypes.find(t => t.id === typeId)
    if (!target || target.is_system) return
    const confirmDelete = window.confirm(`Delete "${target.name}" leave type?`)
    if (!confirmDelete) return
    setDeletingTypeId(typeId)
    const { error } = await supabase
      .from('leave_types')
      .delete()
      .eq('id', typeId)
      .eq('is_system', false)
    setDeletingTypeId(null)
    if (!error) {
      setLeaveTypes(prev => prev.filter(t => t.id !== typeId))
      if (selectedTypeId === typeId) {
        setSelectedTypeId(() => {
          const next = leaveTypes.find(t => t.id !== typeId)?.id || ''
          return next
        })
      }
    }
  }

  const handleApplyDefaults = async () => {
    if (!selectedType) return
    setSeedingDefaults(true)

    const existingUserIds = new Set(balances.map(b => b.user_id))
    const rows = employees
      .filter(e => !existingUserIds.has(e.id))
      .map(e => ({
        user_id: e.id,
        leave_type_id: selectedType.id,
        year: currentYear,
        allocated: selectedType.default_balance ?? 0,
        used: 0,
      }))

    if (rows.length > 0) {
      await supabase.from('leave_balances').insert(rows)
      setBalances(prev => [...prev, ...rows.map(r => ({
        id: `${r.user_id}-${r.leave_type_id}-${r.year}`,
        user_id: r.user_id,
        leave_type_id: r.leave_type_id,
        year: r.year,
        allocated: r.allocated,
        used: r.used,
      }))])
    }

    setSeedingDefaults(false)
  }

  const handleAllocate = async () => {
    if (!allocationUserId || !selectedTypeId) return
    setSavingAllocation(true)

    const existing = balanceMap.get(allocationUserId)
    const payload = {
      user_id: allocationUserId,
      leave_type_id: selectedTypeId,
      year: currentYear,
      allocated: allocationValue,
      used: existing?.used ?? 0,
    }

    const { data } = await supabase
      .from('leave_balances')
      .upsert(payload, { onConflict: 'user_id,leave_type_id,year' })
      .select()
      .single()

    if (data) {
      setBalances(prev => {
        const next = prev.filter(b => b.user_id !== allocationUserId)
        return [...next, data]
      })
    }

    setSavingAllocation(false)
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 0%, var(--primary-light) 75%)' }}
    >
      <Sidebar userEmail={email} userName={userName} avatarUrl={avatarUrl} role="admin" />

      <main className="admin-main flex flex-col flex-1">
        <div className="w-full max-w-6xl mx-auto p-4 flex flex-col flex-1">
          <LeavesNav />

          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4">Annual Leave Allocation Setup</h1>

          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
              {/* Leave Types */}
              <div className="rounded-xl shadow-sm border border-[var(--border)] p-6 flex flex-col min-h-0">
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 shrink-0">Leave Types</h2>
                <div className="space-y-3 overflow-y-auto no-scrollbar flex-1 min-h-0">
                  {leaveTypes.map(type => (
                    <div key={type.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0">
                      <button
                        onClick={() => setSelectedTypeId(type.id)}
                        className={`flex-1 text-left px-3 py-2 rounded-lg border ${
                          selectedTypeId === type.id
                            ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                            : 'bg-white text-slate-700 border-[var(--border)] hover:bg-[var(--primary-light)]/60'
                        }`}
                      >
                        {type.name}
                      </button>
                      <input
                        type="number"
                        min={0}
                        className="w-full sm:w-20 border border-[var(--border)] rounded-lg px-2 py-2 text-sm bg-white focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
                        defaultValue={type.default_balance ?? 0}
                        onBlur={(e) => handleUpdateDefault(type.id, Number(e.target.value))}
                      />
                      {!type.is_system && (
                        <button
                          type="button"
                          onClick={() => handleDeleteType(type.id)}
                          disabled={deletingTypeId === type.id}
                          className="px-2 py-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                          title="Delete leave type"
                        >
                          {deletingTypeId === type.id ? '...' : 'Delete'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add custom type */}
                <div className="mt-6 border-t border-[var(--border)] pt-4 shrink-0">
                  <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-2">Add Custom Type</h3>
                  <input
                    type="text"
                    placeholder="Type name"
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm mb-2 bg-white focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="Default balance"
                    value={newTypeDefault}
                    onChange={(e) => setNewTypeDefault(Number(e.target.value))}
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm mb-3 bg-white focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
                  />
                  <button
                    onClick={handleCreateType}
                    disabled={savingType}
                    className="w-full px-4 py-2 rounded-lg text-sm font-semibold btn-primary"
                  >
                    {savingType ? 'Creating...' : 'Create Leave Type'}
                  </button>
                </div>
              </div>

              {/* Allocate Balances */}
              <div className="rounded-xl shadow-sm border border-[var(--border)] p-6 lg:col-span-2 flex flex-col min-h-0">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2 shrink-0">
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">Allocate Balances</h2>
                  <button
                    onClick={handleApplyDefaults}
                    disabled={seedingDefaults || !selectedType}
                    className="text-sm font-semibold px-3 py-2 rounded-lg border border-[var(--primary-muted)] bg-[var(--primary-muted)] text-[var(--primary-hover)] hover:bg-[var(--primary-light)]/60"
                  >
                    {seedingDefaults ? 'Applying...' : 'Apply Defaults To New Employees'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 shrink-0">
                  <select
                    value={allocationUserId}
                    onChange={(e) => setAllocationUserId(e.target.value)}
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-white focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
                  >
                    <option value="">Select user</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {capitalizeName(emp.full_name) || emp.email_id || emp.id}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedTypeId}
                    onChange={(e) => setSelectedTypeId(e.target.value)}
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-white focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
                  >
                    {leaveTypes.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min={0}
                    value={allocationValue}
                    onChange={(e) => setAllocationValue(Number(e.target.value))}
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-white focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
                    placeholder="Allocated"
                  />
                </div>

                <button
                  onClick={handleAllocate}
                  disabled={savingAllocation}
                  className="mb-4 shrink-0 px-4 py-2 rounded-lg text-sm font-semibold btn-primary w-fit"
                >
                  {savingAllocation ? 'Saving...' : 'Save Allocation'}
                </button>

                <div className="flex-1 min-h-0 overflow-auto no-scrollbar border border-[var(--border)] rounded-lg bg-white/80">
                  <table className="min-w-full text-sm table-auto md:table-fixed">
                    <thead className="bg-[var(--primary-muted)] border-b border-[var(--border)] sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-[var(--text-primary)]">Employee</th>
                        <th className="px-4 py-2 text-left font-semibold text-[var(--text-primary)]">Role</th>
                        <th className="px-4 py-2 text-left font-semibold text-[var(--text-primary)]">Allocated</th>
                        <th className="px-4 py-2 text-left font-semibold text-[var(--text-primary)]">Used</th>
                        <th className="px-4 py-2 text-left font-semibold text-[var(--text-primary)]">Remaining</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {employees.map(emp => {
                        const bal = balanceMap.get(emp.id)
                        const allocated = bal?.allocated ?? selectedType?.default_balance ?? 0
                        const used = bal?.used ?? 0
                        const remaining = Math.max(allocated - used, 0)
                        return (
                          <tr key={emp.id}>
                            <td className="px-4 py-2 text-gray-900">{capitalizeName(emp.full_name) || emp.email_id || '—'}</td>
                            <td className="px-4 py-2 text-gray-700 capitalize">{emp.role || '—'}</td>
                            <td className="px-4 py-2 text-gray-700">{allocated}</td>
                            <td className="px-4 py-2 text-gray-700">{used}</td>
                            <td className="px-4 py-2 text-gray-700">{remaining}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
