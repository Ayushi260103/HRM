'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/hooks/useSupabase'
import Sidebar from '@/components/Sidebar'

type LeaveRequest = {
  id: string
  user_id: string
  leave_type_id: string
  reason: string
  start_date: string
  end_date: string
  comment: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  half_day_part?: 'first' | 'second' | null
  leave_type?: {
    name: string
  } | null
}

type LeaveType = {
  id: string
  name: string
  default_balance: number | null
}

type LeaveBalance = {
  leave_type_id: string
  allocated: number | null
  used: number | null
}

export default function LeavesPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([])

  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    leave_type_id: '',
    reason: '',
    start_date: '',
    end_date: '',
    half_day_part: '' as '' | 'first' | 'second'
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
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

        if (profile?.role !== 'employee') {
          router.replace('/dashboard')
          return
        }

        setUserName(profile?.full_name ?? null)
        setAvatarUrl(profile?.avatar_url ?? null)

        const currentYear = new Date().getFullYear()

        const { data: types } = await supabase
          .from('leave_types')
          .select('id, name, default_balance')
          .order('name', { ascending: true })

        setLeaveTypes(types || [])
        const leaveTypeMap = new Map((types || []).map(t => [t.id, t.name]))
        if (types && types.length > 0) {
          setFormData(prev => ({ ...prev, leave_type_id: prev.leave_type_id || types[0].id }))
        }

        // Load leave requests
        const { data: requests } = await supabase
          .from('leave_requests')
          .select('id, user_id, leave_type_id, reason, start_date, end_date, comment, status, created_at, half_day_part, leave_type:leave_types(name)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (requests) {
          const normalized = requests.map(r => {
            const resolved = Array.isArray(r.leave_type) ? r.leave_type[0] ?? null : r.leave_type
            const fallbackName = r.leave_type_id ? (leaveTypeMap.get(r.leave_type_id) ?? null) : null
            return {
              ...r,
              leave_type: resolved ?? (fallbackName ? { name: fallbackName } : null),
            }
          })
          setLeaveRequests(normalized as LeaveRequest[])
        }

        const { data: balances } = await supabase
          .from('leave_balances')
          .select('leave_type_id, allocated, used')
          .eq('user_id', user.id)
          .eq('year', currentYear)

        setLeaveBalances(balances || [])

        setLoading(false)
      } catch (error) {
        console.error('Error loading data:', error)
        setLoading(false)
      }
    }

    loadData()
  }, [router, supabase])

  const handleSubmitLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!userId || !formData.leave_type_id || !formData.reason || !formData.start_date || !formData.end_date) {
      alert('Please fill all fields')
      return
    }

    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      alert('End date must be after start date')
      return
    }

    const isHalfDay = (selectedType?.name || '').toLowerCase().includes('half')
    if (isHalfDay && !formData.half_day_part) {
      alert('Please select first half or second half')
      return
    }

    if (selectedRemaining <= 0) {
      const leaveName = selectedType?.name || 'This'
      alert(`${leaveName} leave is exhausted, talk to HR`)
      return
    }

    setSubmitting(true)

    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .insert([
          {
            user_id: userId,
            leave_type_id: formData.leave_type_id,
            reason: formData.reason,
            start_date: formData.start_date,
            end_date: formData.end_date,
            half_day_part: isHalfDay ? formData.half_day_part : null,
            status: 'pending'
          }
        ])
        .select()

      if (!error && data) {
        setLeaveRequests([data[0], ...leaveRequests])
        setFormData({
          leave_type_id: leaveTypes[0]?.id || '',
          reason: '',
          start_date: '',
          end_date: '',
          half_day_part: ''
        })
        setShowForm(false)
        alert('Leave request submitted successfully!')
      }
    } catch (error) {
      console.error('Error submitting leave request:', error)
      alert('Failed to submit leave request')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-50 text-green-700'
      case 'rejected':
        return 'bg-red-50 text-red-700'
      case 'pending':
        return 'bg-yellow-50 text-yellow-700'
      default:
        return 'bg-gray-50 text-gray-700'
    }
  }

  const approvedCounts = leaveRequests
    .filter(r => r.status === 'approved')
    .reduce<Record<string, number>>((acc, r) => {
      acc[r.leave_type_id] = (acc[r.leave_type_id] || 0) + 1
      return acc
    }, {})

  const balanceMap = new Map(leaveBalances.map(b => [b.leave_type_id, b]))
  const selectedType = leaveTypes.find(t => t.id === formData.leave_type_id) || null
  const selectedBalance = selectedType ? balanceMap.get(selectedType.id) : null
  const selectedAllocated = selectedType ? (selectedBalance?.allocated ?? selectedType.default_balance ?? 0) : 0
  const selectedUsed = selectedType ? (selectedBalance?.used ?? approvedCounts[selectedType.id] ?? 0) : 0
  const selectedRemaining = Math.max(selectedAllocated - selectedUsed, 0)

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p>Loading leaves...</p></div>

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 0%, var(--primary-light) 80%)' }}>
      <Sidebar userEmail={email} userName={userName} avatarUrl={avatarUrl} role="employee" />

      <main className="flex-1 pt-14 px-4 pb-4 sm:pt-6 sm:px-5 sm:pb-5 md:pt-6 md:px-6 md:pb-6 lg:pt-8 lg:px-8 lg:pb-8 lg:ml-64 min-w-0">
        <div className="w-full max-w-5xl">
          <div className="mb-8 mt-8">
            <h1 className="text-xl font-bold text-gray-900">Apply and track your leave requests</h1>
            {/* <p className="text-gray-600 mt-2">Apply and track your leave requests</p> */}
          </div>

          <div className="flex items-stretch gap-6 mb-8 overflow-x-auto no-scrollbar">
            {leaveTypes
            .filter(type => {
              const bal = balanceMap.get(type.id)
              const allocated = bal?.allocated ?? type.default_balance ?? 0
              return allocated > 0
            })
            .map((type, idx) => {
              const bal = balanceMap.get(type.id)
              const allocated = bal?.allocated ?? type.default_balance ?? 0
              const used = bal?.used ?? approvedCounts[type.id] ?? 0
              const remaining = Math.max(allocated - used, 0)
              const usagePct = allocated > 0 ? (used / allocated) * 100 : 0
              const colors = ['#0ea5e9', '#f59e0b', '#10b981', '#ef4444', '#6366f1']
              const ring = colors[idx % colors.length]
              const ringBg = 'var(--primary-light)'
              return (
                <div key={type.id} className="min-w-[220px] flex flex-col items-center">
                  <div
                    className="w-[190px] h-[190px] rounded-full p-3"
                    style={{
                      backgroundImage: `conic-gradient(${ring} ${usagePct}%, ${ringBg} 0)`,
                    }}
                  >
                    <div className="w-full h-full rounded-full bg-white/90 border border-[var(--primary-muted)] flex flex-col items-center justify-center text-center px-3">
                      <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide truncate w-full">
                        {type.name}
                      </p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{Math.round(usagePct)}%</p>
                      <p className="text-xs text-slate-600 mt-1">Used: {used}</p>
                      <p className="text-xs text-slate-600">Remaining: {remaining}</p>
                      <p className="text-xs text-slate-600">Total: {allocated}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Yearly allocation</p>
                </div>
              )
            })}
          </div>

          <div className="mb-8">
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg"
            >
              {showForm ? 'Cancel' : 'Request a Leave'}
            </button>
          </div>

          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="absolute inset-0 bg-slate-900/40"
                aria-label="Close overlay"
              />
              <div
                className="relative z-10 mx-auto rounded-2xl border border-[var(--primary-muted)] bg-white/90 shadow-xl w-full max-w-[760px] max-h-[90vh] overflow-y-auto"
                style={{ boxShadow: '0 25px 50px -12px rgba(15,23,42,0.15)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-slate-500 hover:bg-[var(--primary-light)] hover:text-[var(--primary)] transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="p-6 pt-10">
                  <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">Submit Leave Request</h2>
                  {selectedRemaining <= 0 && (
                    <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-medium text-yellow-800">
                      {selectedType?.name || 'This'} leave is exhausted, talk to admin.
                    </div>
                  )}
                  <form onSubmit={handleSubmitLeaveRequest} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-semibold text-[var(--primary-hover)] mb-2">Leave Type *</label>
                        <select
                          value={formData.leave_type_id}
                          onChange={(e) => setFormData({ ...formData, leave_type_id: e.target.value })}
                          className="w-full px-4 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] outline-none transition-all bg-white"
                        >
                          {leaveTypes.map((type, idx) => {
                              const bal = balanceMap.get(type.id)
                              const allocated = bal?.allocated ?? type.default_balance ?? 0
                              const used = bal?.used ?? approvedCounts[type.id] ?? 0
                              const remaining = Math.max(allocated - used, 0)
                              const usagePct = allocated > 0 ? (used / allocated) * 100 : 0
                              const colors = ['#0ea5e9', '#f59e0b', '#10b981', '#ef4444', '#6366f1']
                              const ring = colors[idx % colors.length]
                              const ringBg = 'var(--primary-light)'

                              return (
                                <div key={type.id} className="min-w-[220px] flex flex-col items-center">
                                  <div
                                    className="w-[190px] h-[190px] rounded-full p-3"
                                    style={{
                                      backgroundImage: `conic-gradient(${ring} ${usagePct}%, ${ringBg} 0)`,
                                    }}
                                  >
                                    <div className="w-full h-full rounded-full bg-white/90 border border-[var(--primary-muted)] flex flex-col items-center justify-center text-center px-3">
                                      <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide truncate w-full">
                                        {type.name}
                                      </p>
                                      <p className="text-2xl font-bold text-slate-900 mt-1">{Math.round(usagePct)}%</p>
                                      <p className="text-xs text-slate-600 mt-1">Used: {used}</p>
                                      <p className="text-xs text-slate-600">Remaining: {remaining}</p>
                                      <p className="text-xs text-slate-600">Total: {allocated}</p>
                                    </div>
                                  </div>
                                  <p className="text-xs text-slate-500 mt-2">Yearly allocation</p>
                                </div>
                              )
                            })}

                        </select>
                      </div>
                      {(selectedType?.name || '').toLowerCase().includes('half') && (
                        <div>
                          <label className="block text-sm font-semibold text-[var(--primary-hover)] mb-2">Half Day *</label>
                          <select
                            value={formData.half_day_part}
                            onChange={(e) => setFormData({ ...formData, half_day_part: e.target.value as 'first' | 'second' })}
                            className="w-full px-4 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] outline-none transition-all bg-white"
                          >
                            <option value="">Select half</option>
                            <option value="first">First Half</option>
                            <option value="second">Second Half</option>
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-semibold text-[var(--primary-hover)] mb-2">Start Date *</label>
                        <input
                          type="date"
                          value={formData.start_date}
                          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                          className="w-full px-4 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] outline-none transition-all bg-white"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-[var(--primary-hover)] mb-2">End Date *</label>
                        <input
                          type="date"
                          value={formData.end_date}
                          onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                          className="w-full px-4 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] outline-none transition-all bg-white"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[var(--primary-hover)] mb-2">Reason *</label>
                      <textarea
                        value={formData.reason}
                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                        placeholder="Please provide a reason for your leave request..."
                        className="w-full px-4 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] outline-none transition-all resize-none bg-white"
                        rows={4}
                        required
                      ></textarea>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white px-6 py-2 rounded-lg font-semibold hover:from-[var(--primary-hover)] hover:to-[var(--primary)] transition-all disabled:opacity-50"
                      >
                        {submitting ? 'Submitting...' : 'Submit Request'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowForm(false)}
                        className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Applied Requests ({leaveRequests.length})</h2>

            {leaveRequests.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No leave requests yet</p>
                <p className="text-gray-400 text-sm mt-2">
                  Click {"\""}Request a Leave{"\""} to submit your first request
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {leaveRequests.map((request) => (
                  <div key={request.id} className="border border-[var(--border)] border-l-[4px] border-l-[var(--primary-hover)] rounded-lg p-5 bg-[var(--primary-light)]/30 shadow-md hover:shadow-lg transition-all">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {request.leave_type?.name || 'Leave'}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(request.status)}`}>
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm mb-3">{request.reason}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                          <span>📅 <span className="font-medium">{new Date(request.start_date).toLocaleDateString()}</span> to <span className="font-medium">{new Date(request.end_date).toLocaleDateString()}</span></span>
                          {request.half_day_part && (
                            <span>⏰ <span className="font-medium">{request.half_day_part === 'first' ? 'First Half' : 'Second Half'}</span></span>
                          )}
                          <span>🕐 <span className="font-medium">{new Date(request.created_at).toLocaleDateString()}</span></span>
                        </div>
                        {request.comment && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                            <p className="text-xs font-semibold text-blue-700 uppercase mb-1">Admin Comment</p>
                            <p className="text-sm text-blue-900">{request.comment}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}



