'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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

export default function HRLeaveApplyPage() {
  const router = useRouter()
  const supabase = createClient()
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

        if (profile?.role !== 'hr' && profile?.role !== 'admin') {
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
        if (types && types.length > 0) {
          setFormData(prev => ({ ...prev, leave_type_id: prev.leave_type_id || types[0].id }))
        }

        const { data: requests } = await supabase
          .from('leave_requests')
          .select('id, user_id, leave_type_id, reason, start_date, end_date, comment, status, created_at, half_day_part, leave_type:leave_types(name)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (requests) {
                    const normalized = requests.map(r => ({
                        ...r,
                        leave_type: Array.isArray(r.leave_type) ? r.leave_type[0] ?? null : r.leave_type
                    }))
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
      alert(`${leaveName} leave is exhausted, talk to admin`)
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return '✅'
      case 'rejected':
        return '❌'
      case 'pending':
        return '⏳'
      default:
        return '📋'
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
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Sidebar userEmail={email} userName={userName} avatarUrl={avatarUrl} role="hr" />

      <main className="flex-1 p-4 sm:p-5 md:p-6 lg:p-8 lg:ml-64">
        <div className="w-full max-w-5xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Leave Management</h1>
            <p className="text-gray-600 mt-2">Apply and track your leave requests</p>
          </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {leaveTypes.map(type => {
              const bal = balanceMap.get(type.id)
              const allocated = bal?.allocated ?? type.default_balance ?? 0
              const used = bal?.used ?? approvedCounts[type.id] ?? 0
              const remaining = Math.max(allocated - used, 0)
              const usagePct = allocated > 0 ? (used / allocated) * 100 : 0
              return (
                <div key={type.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{type.name}</p>
                      <p className="text-xs text-gray-500 mt-1">Yearly allocation</p>
                    </div>
                    <span className="text-2xl">#</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-600">Used: <span className="font-bold">{used}</span></p>
                      <p className="text-sm text-gray-600">Allocated: <span className="font-bold">{allocated}</span></p>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gray-700 h-full transition-all"
                        style={{ width: `${usagePct}%` }}
                      ></div>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{remaining} Available</p>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mb-8"> 
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg"
            >
              {showForm ? '✖️ Cancel' : '✏️ Request a Leave'}
            </button>
          </div>

          {showForm && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Submit Leave Request</h2>
              {selectedRemaining <= 0 && (
                <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-medium text-yellow-800">
                  {selectedType?.name || 'This'} leave is exhausted, talk to admin.
                </div>
              )}
              <form onSubmit={handleSubmitLeaveRequest} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Leave Type *</label>
                    <select
                      value={formData.leave_type_id}
                      onChange={(e) => setFormData({ ...formData, leave_type_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    >
                      {leaveTypes.map(type => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                  </div>
                  {(selectedType?.name || '').toLowerCase().includes('half') && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Half Day *</label>
                      <select
                        value={formData.half_day_part}
                        onChange={(e) => setFormData({ ...formData, half_day_part: e.target.value as 'first' | 'second' })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      >
                        <option value="">Select half</option>
                        <option value="first">First Half</option>
                        <option value="second">Second Half</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Start Date *</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">End Date *</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Reason *</label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Please provide a reason for your leave request..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                    rows={4}
                    required
                  ></textarea>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-2 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50"
                  >
                    {submitting ? '⏳ Submitting...' : '✅ Submit Request'}
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
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Leave Requests ({leaveRequests.length})</h2>

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
                  <div key={request.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-all">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {request.leave_type?.name || 'Leave'}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(request.status)}`}>
                            {getStatusIcon(request.status)} {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
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
