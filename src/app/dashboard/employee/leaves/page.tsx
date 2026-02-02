'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'

type LeaveRequest = {
  id: string
  user_id: string
  leave_type: string
  reason: string
  start_date: string
  end_date: string
  comment: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

type LeaveBalance = {
  half_day_total: number
  half_day_used: number
  medical_total: number
  medical_used: number
  casual_total: number
  casual_used: number
}

const LEAVE_TYPES = {
  half_day: { label: 'Half Day Leave', total: 24 },
  medical: { label: 'Medical Leave', total: 5 },
  casual: { label: 'Casual Leave', total: 11 }
}

export default function LeavesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance>({
    half_day_total: 24,
    half_day_used: 0,
    medical_total: 5,
    medical_used: 0,
    casual_total: 11,
    casual_used: 0
  })

  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    leave_type: 'half_day',
    reason: '',
    start_date: '',
    end_date: ''
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
          .select('role, full_name')
          .eq('id', user.id)
          .single()

        if (profile?.role !== 'employee') {
          router.replace('/dashboard')
          return
        }

        setUserName(profile?.full_name ?? null)

        // Load leave requests
        const { data: requests } = await supabase
          .from('leave_requests')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (requests) {
          setLeaveRequests(requests)
          
          // Calculate used leaves
          const approved = requests.filter(r => r.status === 'approved')
          const balance = {
            half_day_total: 24,
            half_day_used: approved.filter(r => r.leave_type === 'half_day').length,
            medical_total: 5,
            medical_used: approved.filter(r => r.leave_type === 'medical').length,
            casual_total: 11,
            casual_used: approved.filter(r => r.leave_type === 'casual').length
          }
          setLeaveBalance(balance)
        }

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

    if (!userId || !formData.leave_type || !formData.reason || !formData.start_date || !formData.end_date) {
      alert('Please fill all fields')
      return
    }

    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      alert('End date must be after start date')
      return
    }

    setSubmitting(true)

    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .insert([
          {
            user_id: userId,
            leave_type: formData.leave_type,
            reason: formData.reason,
            start_date: formData.start_date,
            end_date: formData.end_date,
            status: 'pending'
          }
        ])
        .select()

      if (!error && data) {
        setLeaveRequests([data[0], ...leaveRequests])
        setFormData({
          leave_type: 'half_day',
          reason: '',
          start_date: '',
          end_date: ''
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p>Loading leaves...</p></div>

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Sidebar userEmail={email} userName={userName} role="employee" />

      <main className="flex-1 p-4 sm:p-5 md:p-6 lg:p-8 lg:ml-64">
        <div className="w-full max-w-5xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Leave Management</h1>
            <p className="text-gray-600 mt-2">Manage your leaves and leave requests</p>
          </div>

          {/* Leave Balance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Half Day Leaves */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm border border-blue-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Half Day Leaves</p>
                  <p className="text-xs text-blue-600 mt-1">Limited leaves</p>
                </div>
                <span className="text-3xl">🕐</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-blue-700">Used: <span className="font-bold">{leaveBalance.half_day_used}</span></p>
                  <p className="text-sm text-blue-700">Total: <span className="font-bold">{leaveBalance.half_day_total}</span></p>
                </div>
                <div className="bg-blue-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full transition-all"
                    style={{ width: `${(leaveBalance.half_day_used / leaveBalance.half_day_total) * 100}%` }}
                  ></div>
                </div>
                <p className="text-lg font-bold text-blue-900">{leaveBalance.half_day_total - leaveBalance.half_day_used} Available</p>
              </div>
            </div>

            {/* Medical Leaves */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-sm border border-red-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm font-semibold text-red-700 uppercase tracking-wide">Medical Leaves</p>
                  <p className="text-xs text-red-600 mt-1">Critical for health</p>
                </div>
                <span className="text-3xl">🏥</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-red-700">Used: <span className="font-bold">{leaveBalance.medical_used}</span></p>
                  <p className="text-sm text-red-700">Total: <span className="font-bold">{leaveBalance.medical_total}</span></p>
                </div>
                <div className="bg-red-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-red-600 h-full transition-all"
                    style={{ width: `${(leaveBalance.medical_used / leaveBalance.medical_total) * 100}%` }}
                  ></div>
                </div>
                <p className="text-lg font-bold text-red-900">{leaveBalance.medical_total - leaveBalance.medical_used} Available</p>
              </div>
            </div>

            {/* Casual Leaves */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm border border-purple-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm font-semibold text-purple-700 uppercase tracking-wide">Casual Leaves</p>
                  <p className="text-xs text-purple-600 mt-1">Personal reasons</p>
                </div>
                <span className="text-3xl">☀️</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-purple-700">Used: <span className="font-bold">{leaveBalance.casual_used}</span></p>
                  <p className="text-sm text-purple-700">Total: <span className="font-bold">{leaveBalance.casual_total}</span></p>
                </div>
                <div className="bg-purple-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-purple-600 h-full transition-all"
                    style={{ width: `${(leaveBalance.casual_used / leaveBalance.casual_total) * 100}%` }}
                  ></div>
                </div>
                <p className="text-lg font-bold text-purple-900">{leaveBalance.casual_total - leaveBalance.casual_used} Available</p>
              </div>
            </div>
          </div>

          {/* Request Leave Button */}
          <div className="mb-8">
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg"
            >
              {showForm ? '✖️ Cancel' : '✏️ Request a Leave'}
            </button>
          </div>

          {/* Leave Request Form */}
          {showForm && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Submit Leave Request</h2>
              <form onSubmit={handleSubmitLeaveRequest} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Leave Type */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Leave Type *</label>
                    <select
                      value={formData.leave_type}
                      onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    >
                      <option value="half_day">Half Day Leave</option>
                      <option value="medical">Medical Leave</option>
                      <option value="casual">Casual Leave</option>
                    </select>
                  </div>

                  {/* Start Date */}
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

                  {/* End Date */}
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

                {/* Reason */}
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

                {/* Submit Button */}
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

          {/* Leave Requests List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Leave Requests ({leaveRequests.length})</h2>
            
            {leaveRequests.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No leave requests yet</p>
                <p className="text-gray-400 text-sm mt-2">Click "Request a Leave" to submit your first request</p>
              </div>
            ) : (
              <div className="space-y-4">
                {leaveRequests.map((request) => (
                  <div key={request.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-all">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {LEAVE_TYPES[request.leave_type as keyof typeof LEAVE_TYPES]?.label || request.leave_type}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(request.status)}`}>
                            {getStatusIcon(request.status)} {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm mb-3">{request.reason}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                          <span>📅 <span className="font-medium">{new Date(request.start_date).toLocaleDateString()}</span> to <span className="font-medium">{new Date(request.end_date).toLocaleDateString()}</span></span>
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
