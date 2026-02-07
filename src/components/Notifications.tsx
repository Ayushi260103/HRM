'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from '@/hooks/useSupabase'

interface NotificationsProps {
  role: 'admin' | 'hr' | 'employee'
  userId: string
}

interface Notification {
  id: string
  message: string
}

interface DbNotification {
  id: string
  message: string
  created_at: string
  role_target: 'admin' | 'hr' | 'employee' | null
  for_user: string | null
}

interface NotificationRead {
  notification_id: string
}

export default function Notifications({ role, userId }: NotificationsProps) {
  const supabase = useSupabase()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const loadUnreadNotifications = useCallback(async () => {
    if (!userId) return
    try {
      const roleFilter = role ? `role_target.eq.${role}` : ''
      const userFilter = `for_user.eq.${userId}`

      const { data: notificationsData } = await supabase
          .from('notifications')
          .select('*')
          .or(`${roleFilter},${userFilter}`)
          .order('created_at', { ascending: false })
          .returns<DbNotification[]>()

        const { data: reads } = await supabase
          .from('notification_reads')
          .select('notification_id')
          .eq('user_id', userId)
          .returns<NotificationRead[]>()

        const readIds = new Set((reads || []).map(r => r.notification_id))

        const unread: Notification[] = (notificationsData || [])
          .filter(n => !readIds.has(n.id))
          .map(n => ({ id: n.id, message: n.message }))

      setNotifications(unread)
      setUnreadCount(unread.length)
    } catch (error) {
      console.error('Error loading notifications:', error)
    }
  }, [role, userId, supabase])

  useEffect(() => {
    loadUnreadNotifications()
    const interval = setInterval(loadUnreadNotifications, 30000)
    return () => clearInterval(interval)
  }, [loadUnreadNotifications])

  return (
    <div className="relative">
      <button
        onClick={async () => {
          if (showDropdown) {
            setShowDropdown(false)
            try {
              if (notifications.length > 0) {
                const rows = notifications.map(n => ({ notification_id: n.id, user_id: userId }))
                await supabase.from('notification_reads').insert(rows)
              }
            } catch {
              // ignore duplicate errors
            }
            setNotifications([])
            setUnreadCount(0)
          } else {
            setShowDropdown(true)
            try {
              if (notifications.length > 0) {
                const rows = notifications.map(n => ({ notification_id: n.id, user_id: userId }))
                await supabase.from('notification_reads').insert(rows)
                setUnreadCount(0)
              }
            } catch {
              // ignore duplicate errors
            }
          }
        }}
        className="relative p-2.5 text-[var(--primary)] hover:text-[var(--primary-hover)] hover:bg-[var(--primary-light)] rounded-full transition-all"
        title="Notifications"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setShowDropdown(false)
              setNotifications([])
            }}
          />

          <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-80 sm:max-w-none sm:w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-[70vh] sm:max-h-96 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="p-4 border-b border-gray-200 bg-gray-50 sticky top-0">
              <h3 className="font-bold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <p className="text-xs text-gray-600 mt-1">
                  {unreadCount} notification{unreadCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <svg
                  className="w-12 h-12 mx-auto text-gray-300 mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <p className="text-gray-500 font-medium">No notifications</p>
                <p className="text-gray-400 text-sm mt-1">You&apos;re all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map(notif => (
                  <div
                    key={notif.id}
                    className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <p className="text-sm text-gray-900 font-medium">{notif.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
