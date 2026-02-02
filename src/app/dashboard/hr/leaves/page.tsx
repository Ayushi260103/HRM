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
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  comment?: string
  profile?: {
    full_name: string | null
    email_id: string | null
  } | null
}
type FilterType = 'all' | 'pending' | 'approved' | 'rejected'

const LEAVE_TYPES = {
  half_day: 'Half Day Leave',
  medical: 'Medical Leave',
  casual: 'Casual Leave'
}

export default function HRLeavesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [commentData, setCommentData] = useState<Record<string, string>>({})
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.replace('/login')
          return
        }

        setEmail(user.email ?? null)

        const { data: profile } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', user.id)
          .single()

        if (profile?.role !== 'hr') {
          router.replace('/dashboard')
          return
        }

        setUserName(profile?.full_name ?? null)

        // Load all leave requests
        const { data: requests } = await supabase
          .from('leave_requests')
          .select('*')
          .order('created_at', { ascending: false })

        if (requests && requests.length > 0) {
          // Get unique user IDs
          const userIds = [...new Set(requests.map(r => r.user_id))]
          
          // Fetch profiles for these users
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email_id')
            .in('id', userIds)

          // Merge profile data with requests
          const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])
          const enrichedRequests = requests.map(r => ({
            ...r,
            profile: profileMap.get(r.user_id) || null
          }))
          
          setLeaveRequests(enrichedRequests)
        }

        setLoading(false)
      } catch (error) {
        console.error('Error loading data:', error)
        setLoading(false)
      }
    }

    loadData()
  }, [router, supabase])

  const handleApprove = async (id: string) => {
    setActionLoading(prev => ({ ...prev, [id]: true }))
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .update({ 
          status: 'approved',
          comment: commentData[id] || null
        })
        .eq('id', id)
        .select()

      if (!error && data) {
        setLeaveRequests(leaveRequests.map(r => r.id === id ? { ...r, status: 'approved', comment: commentData[id] } : r))
        setCommentData(prev => {
          const newData = { ...prev }
          delete newData[id]
          return newData
        })
        setExpandedId(null)
      }
    } catch (error) {
      console.error('Error approving leave:', error)
      alert('Failed to approve leave request')
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  const handleReject = async (id: string) => {
    setActionLoading(prev => ({ ...prev, [id]: true }))
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .update({ 
          status: 'rejected',
          comment: commentData[id] || null
        })
        .eq('id', id)
        .select()

      if (!error && data) {
        setLeaveRequests(leaveRequests.map(r => r.id === id ? { ...r, status: 'rejected', comment: commentData[id] } : r))
        setCommentData(prev => {
          const newData = { ...prev }
          delete newData[id]
          return newData
        })
        setExpandedId(null)
      }
    } catch (error) {
      console.error('Error rejecting leave:', error)
      alert('Failed to reject leave request')
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
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

  const filteredRequests = leaveRequests.filter(r => 
    filter === 'all' ? true : r.status === filter
  )

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p>Loading leaves...</p></div>

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Sidebar userEmail={email} userName={userName} role="hr" />

      <main className="flex-1 p-4 sm:p-5 md:p-6 lg:p-8 lg:ml-64">
        <div className="w-full max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Leave Management</h1>
            <p className="text-gray-600 mt-2">Review and approve/reject employee leave requests</p>
          </div>

          {/* Filter Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-4">
            <div className="flex flex-wrap gap-2">
              {['all', 'pending', 'approved', 'rejected'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f as FilterType)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f === 'all' ? '📋 All' : f === 'pending' ? '⏳ Pending' : f === 'approved' ? '✅ Approved' : '❌ Rejected'}
                  {f !== 'all' && ` (${leaveRequests.filter(r => r.status === f).length})`}
                </button>
              ))}
            </div>
          </div>

          {/* Leave Requests List */}
          <div className="space-y-4">
            {filteredRequests.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <p className="text-gray-500 text-lg">No {filter === 'all' ? 'leave requests' : filter + ' leave requests'}</p>
              </div>
            ) : (
              filteredRequests.map(request => (
                <div key={request.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all">
                  <div 
                    className="p-6 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === request.id ? null : request.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {request.profile?.full_name || 'Unknown Employee'}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(request.status)}`}>
                            {getStatusIcon(request.status)} {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">{LEAVE_TYPES[request.leave_type as keyof typeof LEAVE_TYPES] || request.leave_type}</span>
                          </p>
                          <p className="text-sm text-gray-600">
                            📅 {new Date(request.start_date).toLocaleDateString()} to {new Date(request.end_date).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-600 line-clamp-2">{request.reason}</p>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <svg 
                          className={`w-5 h-5 text-gray-400 transition-transform ${expandedId === request.id ? 'rotate-180' : ''}`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedId === request.id && (
                    <div className="border-t border-gray-200 p-6 bg-gray-50">
                      <div className="space-y-4">
                        {/* Request Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Employee Email</p>
                            <p className="text-sm text-gray-900">{request.profile?.email_id || '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Leave Type</p>
                            <p className="text-sm text-gray-900">{LEAVE_TYPES[request.leave_type as keyof typeof LEAVE_TYPES] || request.leave_type}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Date Range</p>
                            <p className="text-sm text-gray-900">{new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Requested On</p>
                            <p className="text-sm text-gray-900">{new Date(request.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>

                        {/* Reason */}
                        <div>
                          <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Reason</p>
                          <p className="text-sm text-gray-900 bg-white rounded p-3 border border-gray-200">{request.reason}</p>
                        </div>

                        {/* Existing Comment */}
                        {request.comment && (
                          <div>
                            <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Admin Comment</p>
                            <p className="text-sm text-gray-900 bg-white rounded p-3 border border-gray-200">{request.comment}</p>
                          </div>
                        )}

                        {/* Only show action buttons if pending */}
                        {request.status === 'pending' && (
                          <>
                            {/* Comment Field */}
                            <div>
                              <label className="text-xs font-semibold text-gray-600 uppercase mb-2 block">Add Comment (Optional)</label>
                              <textarea
                                value={commentData[request.id] || ''}
                                onChange={(e) => setCommentData(prev => ({ ...prev, [request.id]: e.target.value }))}
                                placeholder="Add any comments or reason for your decision..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                rows={3}
                              ></textarea>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-2">
                              <button
                                onClick={() => handleApprove(request.id)}
                                disabled={actionLoading[request.id]}
                                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50"
                              >
                                {actionLoading[request.id] ? '⏳' : '✅'} Approve
                              </button>
                              <button
                                onClick={() => handleReject(request.id)}
                                disabled={actionLoading[request.id]}
                                className="flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-lg font-semibold hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-50"
                              >
                                {actionLoading[request.id] ? '⏳' : '❌'} Reject
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
