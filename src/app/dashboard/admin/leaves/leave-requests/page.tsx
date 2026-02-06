'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/hooks/useSupabase'
import { capitalizeName } from '@/lib/utils/string'
import Sidebar from '@/components/Sidebar'
import LeavesNav from '@/components/LeavesNav'

type LeaveRequest = {
  id: string
  user_id: string
  leave_type_id: string
  reason: string
  start_date: string
  end_date: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  comment?: string
  half_day_part?: 'first' | 'second' | null
  leave_type?: {
    name: string
  } | null
  profile?: {
    full_name: string | null
    email_id: string | null
  } | null
}

export default function AdminLeavesPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [nameSearch, setNameSearch] = useState('')
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
          .select('role, full_name, avatar_url')
          .eq('id', user.id)
          .single()

        if (profile?.role !== 'admin') {
          router.replace('/dashboard')
          return
        }

        setUserName(profile?.full_name ?? null)
        setAvatarUrl(profile?.avatar_url ?? null)

        // Load all leave requests
        const { data: requests } = await supabase
          .from('leave_requests')
          .select('id, user_id, leave_type_id, reason, start_date, end_date, status, created_at, comment, half_day_part, leave_type:leave_types(name)')
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
            leave_type: Array.isArray(r.leave_type) ? r.leave_type[0] ?? null : r.leave_type,
            profile: profileMap.get(r.user_id) || null
          }))
          
          setLeaveRequests(enrichedRequests as LeaveRequest[])
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
        const approvedRequest = data[0]
        if (approvedRequest) {
          const currentYear = new Date().getFullYear()
          const getRequestedDays = (start: string, end: string) => {
            const startDate = new Date(start)
            const endDate = new Date(end)
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 1
            const diffMs = endDate.getTime() - startDate.getTime()
            const days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1
            return Math.max(days, 1)
          }
          const requestedDays = getRequestedDays(approvedRequest.start_date, approvedRequest.end_date)
          if (approvedRequest.leave_type_id) {
            const { data: existingBalance } = await supabase
              .from('leave_balances')
              .select('id, allocated, used')
              .eq('user_id', approvedRequest.user_id)
              .eq('leave_type_id', approvedRequest.leave_type_id)
              .eq('year', currentYear)
              .maybeSingle()

            if (existingBalance?.id) {
              await supabase
                .from('leave_balances')
                .update({ used: (existingBalance.used ?? 0) + requestedDays })
                .eq('id', existingBalance.id)
            } else {
              const { data: typeData } = await supabase
                .from('leave_types')
                .select('default_balance')
                .eq('id', approvedRequest.leave_type_id)
                .maybeSingle()

              await supabase
                .from('leave_balances')
                .insert({
                  user_id: approvedRequest.user_id,
                  leave_type_id: approvedRequest.leave_type_id,
                  year: currentYear,
                  allocated: typeData?.default_balance ?? 0,
                  used: requestedDays,
                })
            }
          }
        }

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

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'approved':
        return 'badge-common badge-approved'
      case 'rejected':
        return 'badge-common badge-rejected'
      case 'pending':
        return 'badge-common badge-pending'
      default:
        return 'badge-common'
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

  const filteredRequests = leaveRequests.filter(r => {
    const statusMatch = filter === 'all' ? true : r.status === filter
    const nameMatch = !nameSearch.trim() || (r.profile?.full_name?.toLowerCase().includes(nameSearch.trim().toLowerCase()) ?? false)
    return statusMatch && nameMatch
  })

  const selectedRequest = expandedId ? leaveRequests.find(r => r.id === expandedId) : null

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--background)' }}>
      <Sidebar userEmail={email} userName={userName} avatarUrl={avatarUrl} role="admin" />

      <main className="admin-main flex flex-col min-h-0">
        <div className="w-full max-w-6xl flex flex-col flex-1 min-h-0">
          <div className="shrink-0">
            <LeavesNav />
          </div>
          <div className="page-header shrink-0">
            <h1 className="page-title">Leave requests</h1>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
            </div>
          ) : (
            <>
          {/* Status filter bar - sticky, single line, reduced padding */}
          <div className="max-w-2xl mx-auto w-full shrink-0 sticky top-0 z-10 py-2">
            <div className="card px-4 py-2 rounded-lg border bg-white" style={{ borderColor: 'var(--border)' }}>
              <div className="flex flex-nowrap items-center justify-center gap-2 sm:gap-3">
                <span className="text-xs sm:text-sm font-bold text-gray-900 shrink-0">Status Filter:</span>
                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                  {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFilter(f)}
                      className={`pb-0.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                        filter === f
                          ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                          : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'
                      }`}
                    >
                      {f === 'all' ? 'All' : f === 'pending' ? 'Pending' : f === 'approved' ? 'Approved' : 'Rejected'}
                      {f !== 'all' && ` (${leaveRequests.filter(r => r.status === f).length})`}
                    </button>
                  ))}
                </div>
                <div className="h-4 w-px bg-gray-200 shrink-0" aria-hidden />
                <label className="relative flex items-center shrink-0">
                  <span className="absolute left-2 text-gray-400 pointer-events-none" aria-hidden>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </span>
                  <input
                    type="text"
                    value={nameSearch}
                    onChange={(e) => setNameSearch(e.target.value)}
                    placeholder="Search by name"
                    className="pl-7 pr-2 py-1 text-xs sm:text-sm border rounded-full w-36 sm:w-40 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                    style={{ borderColor: 'var(--border)' }}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Portrait detail card overlay - over all requests when one is selected */}
          {selectedRequest && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ perspective: '1000px' }}
              role="dialog"
              aria-modal="true"
              aria-label="Leave request details"
            >
              <button
                type="button"
                onClick={() => setExpandedId(null)}
                className="absolute inset-0 bg-black/40 transition-opacity"
                aria-label="Close overlay"
              />
              <div
                className="relative z-10 mx-auto rounded-2xl border bg-white shadow-2xl transition-all duration-300 w-fit max-w-[90vw] min-w-[400px]"
                style={{
                  transform: 'rotateX(2deg) translateZ(20px)',
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)',
                  borderColor: 'var(--border)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(null)}
                  className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <div className="p-5 pt-9 flex flex-col gap-3">
                  {/* Name and status centered at top */}
                  <div className="text-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-sm font-medium text-gray-900">{capitalizeName(selectedRequest.profile?.full_name) || 'Unknown Employee'}</p>
                    <span className={`inline-block mt-1 ${getStatusBadgeClass(selectedRequest.status)}`}>{getStatusIcon(selectedRequest.status)} {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}</span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-xs font-semibold uppercase shrink-0" style={{ color: 'var(--text-secondary)' }}>Email</span>
                    <span className="text-sm text-gray-900 text-right break-all">{selectedRequest.profile?.email_id || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-xs font-semibold uppercase shrink-0" style={{ color: 'var(--text-secondary)' }}>Leave type</span>
                    <span className="text-sm text-gray-900 text-right">{selectedRequest.leave_type?.name || 'Leave'}</span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-xs font-semibold uppercase shrink-0" style={{ color: 'var(--text-secondary)' }}>Date range</span>
                    <span className="text-sm text-gray-900 text-right">{new Date(selectedRequest.start_date).toLocaleDateString()} – {new Date(selectedRequest.end_date).toLocaleDateString()}</span>
                  </div>
                  {selectedRequest.half_day_part && (
                    <div className="flex justify-between items-center gap-4">
                      <span className="text-xs font-semibold uppercase shrink-0" style={{ color: 'var(--text-secondary)' }}>Half day</span>
                      <span className="text-sm text-gray-900 text-right">{selectedRequest.half_day_part === 'first' ? 'First half' : 'Second half'}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-xs font-semibold uppercase shrink-0" style={{ color: 'var(--text-secondary)' }}>Requested on</span>
                    <span className="text-sm text-gray-900 text-right">{new Date(selectedRequest.created_at).toLocaleDateString()}</span>
                  </div>
                  {/* Reason: full-width block */}
                  <div className="pt-1">
                    <p className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--text-secondary)' }}>Reason</p>
                    <p className="text-sm text-gray-900 rounded-lg p-3 border bg-gray-50" style={{ borderColor: 'var(--border)' }}>{selectedRequest.reason}</p>
                  </div>
                  {selectedRequest.comment && (
                    <div>
                      <p className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--text-secondary)' }}>Admin comment</p>
                      <p className="text-sm text-gray-900 rounded-lg p-3 border bg-gray-50" style={{ borderColor: 'var(--border)' }}>{selectedRequest.comment}</p>
                    </div>
                  )}
                  {selectedRequest.status === 'pending' && (
                    <div className="pt-2 space-y-2 border-t" style={{ borderColor: 'var(--border)' }}>
                      <p className="text-xs font-semibold uppercase" style={{ color: 'var(--text-secondary)' }}>Add comment (optional)</p>
                      <textarea
                        value={commentData[selectedRequest.id] || ''}
                        onChange={(e) => setCommentData(prev => ({ ...prev, [selectedRequest.id]: e.target.value }))}
                        placeholder="Comment or reason for decision..."
                        className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-none focus:ring-2 focus:ring-[var(--primary)]"
                        style={{ borderColor: 'var(--border)' }}
                        rows={2}
                      />
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => handleApprove(selectedRequest.id)}
                          disabled={actionLoading[selectedRequest.id]}
                          className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700"
                        >
                          {actionLoading[selectedRequest.id] ? 'Approving…' : 'Approve'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(selectedRequest.id)}
                          disabled={actionLoading[selectedRequest.id]}
                          className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                        >
                          {actionLoading[selectedRequest.id] ? 'Rejecting…' : 'Reject'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Leave requests table - only this area scrolls */}
          <div className="flex-1 min-h-0 overflow-y-auto max-w-4xl mx-auto w-full py-4">
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm divide-y divide-gray-200">
                  <thead className="bg-gray-50" style={{ borderColor: 'var(--border)' }}>
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-tight">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-tight">Email</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-tight">ID</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-tight">Applied date</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-tight">Approve / Reject</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredRequests.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-sm text-gray-500">
                          No {filter === 'all' ? 'leave requests' : filter + ' leave requests'} found.
                        </td>
                      </tr>
                    ) : (
                      filteredRequests.map(request => (
                        <tr
                          key={request.id}
                          onClick={() => setExpandedId(expandedId === request.id ? null : request.id)}
                          className={`hover:bg-gray-50/80 cursor-pointer ${expandedId === request.id ? 'bg-blue-50/50' : ''}`}
                        >
                          <td className="px-3 py-2 text-xs font-medium text-gray-900 whitespace-nowrap">
                            {capitalizeName(request.profile?.full_name) || '—'}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-600 max-w-[160px] truncate" title={request.profile?.email_id || undefined}>
                            {request.profile?.email_id || '—'}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-500 font-mono">
                            {request.id.slice(0, 8)}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                            {new Date(request.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            {request.status === 'pending' ? (
                              <span className="inline-flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => handleApprove(request.id)}
                                  disabled={actionLoading[request.id]}
                                  className="px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 disabled:opacity-50"
                                >
                                  {actionLoading[request.id] ? 'Processing…' : 'Approve'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReject(request.id)}
                                  disabled={actionLoading[request.id]}
                                  className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded hover:bg-gray-200 disabled:opacity-50"
                                >
                                  {actionLoading[request.id] ? 'Processing…' : 'Reject'}
                                </button>
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
