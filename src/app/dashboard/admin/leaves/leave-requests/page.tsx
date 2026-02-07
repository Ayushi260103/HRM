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


  const filteredRequests = leaveRequests.filter(r => {
    const statusMatch = filter === 'all' ? true : r.status === filter
    const nameMatch = !nameSearch.trim() || (r.profile?.full_name?.toLowerCase().includes(nameSearch.trim().toLowerCase()) ?? false)
    return statusMatch && nameMatch
  })

  const selectedRequest = expandedId ? leaveRequests.find(r => r.id === expandedId) : null

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 0%, var(--primary-light) 75%)' }}
    >
      <Sidebar userEmail={email} userName={userName} avatarUrl={avatarUrl} role="admin" />

      <main className="admin-main flex flex-col min-h-0">
        <div className="w-full max-w-6xl flex flex-col flex-1 min-h-0">
          <div className="shrink-0">
            <LeavesNav />
          </div>
          <div className="page-header shrink-0"></div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
            </div>
          ) : (
            <>
          {/* Status filter bar */}
          <div className="max-w-2xl mx-auto w-full shrink-0 sticky top-0 z-10 py-2">
            <div className="card px-4 py-2.5 bg-transparent border-transparent shadow-[0_8px_20px_-12px_rgba(59,130,246,0.65)]" style={{ background: 'transparent' }}>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <span className="text-xs font-semibold text-slate-600 shrink-0">Status:</span>
                <div className="flex items-center gap-3 shrink-0">
                  {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFilter(f)}
                      className={`pb-0.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                        filter === f
                          ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                          : 'text-slate-500 hover:text-slate-700 border-b-2 border-transparent'
                      }`}
                    >
                      {f === 'all' ? 'All' : f === 'pending' ? 'Pending' : f === 'approved' ? 'Approved' : 'Rejected'}
                    </button>
                  ))}
                </div>
                <div className="h-4 w-px bg-slate-200 shrink-0" aria-hidden />
                <label className="relative flex items-center shrink-0 w-full sm:w-auto sm:ml-auto">
                  <input
                    type="text"
                    value={nameSearch}
                    onChange={(e) => setNameSearch(e.target.value)}
                    placeholder="Search by name"
                    className="input-base pl-4 pr-4 py-2 rounded-full w-full sm:w-60 text-sm bg-white border border-[var(--border)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Portrait detail card overlay - over all requests when one is selected */}
          {selectedRequest && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-[2px]"
              style={{ perspective: '1000px' }}
              role="dialog"
              aria-modal="true"
              aria-label="Leave request details"
            >
              <button
                type="button"
                onClick={() => setExpandedId(null)}
                className="absolute inset-0"
                aria-label="Close overlay"
              />
              <div
                className="relative z-10 mx-auto rounded-2xl border border-[var(--border)] bg-white shadow-xl w-fit max-w-[90vw] min-w-[400px]"
                style={{ boxShadow: '0 25px 50px -12px rgba(15,23,42,0.15)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(null)}
                  className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-slate-500 hover:bg-[var(--primary-light)] hover:text-[var(--primary)] transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <div className="p-6 pt-10 flex flex-col gap-3">
                  <div className="text-center border-b border-slate-200 pb-3">
                    <p className="text-sm font-medium text-slate-900">{capitalizeName(selectedRequest.profile?.full_name) || 'Unknown Employee'}</p>
                    <span className={`inline-block mt-1.5 ${getStatusBadgeClass(selectedRequest.status)}`}>{selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}</span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-xs font-semibold uppercase text-slate-500 shrink-0">Email</span>
                    <span className="text-sm text-slate-900 text-right break-all">{selectedRequest.profile?.email_id || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-xs font-semibold uppercase text-slate-500 shrink-0">Leave type</span>
                    <span className="text-sm text-slate-900 text-right">{selectedRequest.leave_type?.name || 'Leave'}</span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-xs font-semibold uppercase text-slate-500 shrink-0">Date range</span>
                    <span className="text-sm text-slate-900 text-right">{new Date(selectedRequest.start_date).toLocaleDateString()} – {new Date(selectedRequest.end_date).toLocaleDateString()}</span>
                  </div>
                  {selectedRequest.half_day_part && (
                    <div className="flex justify-between items-center gap-4">
                      <span className="text-xs font-semibold uppercase text-slate-500 shrink-0">Half day</span>
                      <span className="text-sm text-slate-900 text-right">{selectedRequest.half_day_part === 'first' ? 'First half' : 'Second half'}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-xs font-semibold uppercase text-slate-500 shrink-0">Requested on</span>
                    <span className="text-sm text-slate-900 text-right">{new Date(selectedRequest.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="pt-1">
                    <p className="text-xs font-semibold uppercase text-slate-500 mb-1">Reason</p>
                    <p className="text-sm text-slate-700 rounded-lg p-3 border border-slate-200 bg-slate-50">{selectedRequest.reason}</p>
                  </div>
                  {selectedRequest.comment && (
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-500 mb-1">Admin comment</p>
                      <p className="text-sm text-slate-700 rounded-lg p-3 border border-slate-200 bg-slate-50">{selectedRequest.comment}</p>
                    </div>
                  )}
                  {selectedRequest.status === 'pending' && (
                    <div className="pt-3 space-y-2 border-t border-slate-200">
                      <p className="text-xs font-semibold uppercase text-slate-500">Add comment (optional)</p>
                      <textarea
                        value={commentData[selectedRequest.id] || ''}
                        onChange={(e) => setCommentData(prev => ({ ...prev, [selectedRequest.id]: e.target.value }))}
                        placeholder="Comment or reason for decision..."
                        className="input-base w-full resize-none"
                        rows={2}
                      />
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => handleApprove(selectedRequest.id)}
                          disabled={actionLoading[selectedRequest.id]}
                          className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
                        >
                          {actionLoading[selectedRequest.id] ? 'Approving…' : 'Approve'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(selectedRequest.id)}
                          disabled={actionLoading[selectedRequest.id]}
                          className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
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

          {/* Leave requests table */}
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar max-w-4xl mx-auto w-full py-4">
            <div
              className="overflow-hidden rounded-xl border border-slate-200 shadow-md border-l-[3px] border-l-[var(--primary-hover)] border-r-[3px] border-r-[var(--primary-hover)]"
              style={{ backgroundImage: 'linear-gradient(45deg, #ffffff 0%, var(--primary-light) 75%)' }}
            >
              <div className="overflow-x-auto admin-table-wrap">
                <table className="min-w-full text-sm divide-y divide-slate-200 table-admin">
                  <thead>
                    <tr className="bg-[var(--primary-muted)]">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider ">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider ">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider ">Applied</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider ">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-500">
                          No {filter === 'all' ? 'leave requests' : filter + ' requests'} found.
                        </td>
                      </tr>
                    ) : (
                      filteredRequests.map(request => (
                        <tr
                          key={request.id}
                          onClick={() => setExpandedId(expandedId === request.id ? null : request.id)}
                          className={`cursor-pointer transition-colors hover:bg-[var(--primary-light)]/60 ${expandedId === request.id ? 'bg-[var(--primary-light)]/70' : ''}`}
                        >
                          <td className="px-4 py-3 text-sm font-medium text-slate-900 whitespace-nowrap">
                            {capitalizeName(request.profile?.full_name) || '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-[var(--primary-hover)] font-medium max-w-[160px] truncate" title={request.profile?.email_id || undefined}>
                            {request.profile?.email_id || '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                            {new Date(request.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3 text-left whitespace-nowrap">
                            <span className={`badge-common ${getStatusBadgeClass(request.status)}`}>
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </span>
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
