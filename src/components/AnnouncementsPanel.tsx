'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from '@/hooks/useSupabase'
import { capitalizeName } from '@/lib/utils/string'

type Announcement = {
  id: string
  title: string
  body: string
  author_name: string
  author_role: string
  created_at: string
}

interface AnnouncementsPanelProps {
  userId: string
  userName: string
  userRole: string
}

export default function AnnouncementsPanel({ userId, userName, userRole }: AnnouncementsPanelProps) {
  const supabase = useSupabase()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadAnnouncements = useCallback(async () => {
    try {
      const { data, error: loadError } = await supabase
        .from('announcements')
        .select('id, title, body, author_name, author_role, created_at')
        .order('created_at', { ascending: false })

      if (loadError) throw loadError
      setAnnouncements(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadAnnouncements()
  }, [loadAnnouncements])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim() || !body.trim()) {
      setError('Please provide both title and message.')
      return
    }

    setSubmitting(true)
    try {
      const { data, error: insertError } = await supabase
        .from('announcements')
        .insert({
          title: title.trim(),
          body: body.trim(),
          author_id: userId,
          author_name: capitalizeName(userName),
          author_role: userRole,
        })
        .select('id, title, body, author_name, author_role, created_at')
        .single()

      if (insertError) throw insertError

      if (data) {
        setAnnouncements(prev => [data, ...prev])
        setTitle('')
        setBody('')
        setShowCreateForm(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post announcement')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <p style={{ color: 'var(--text-secondary)' }}>Loading announcements...</p>
  }

  return (
    <div className="space-y-6">
      <div className="card card-body">
        {!showCreateForm ? (
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add announcement
          </button>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Create Announcement</h2>
              <button
                type="button"
                onClick={() => { setShowCreateForm(false); setError(null); setTitle(''); setBody(''); }}
                className="text-sm font-medium rounded-lg px-3 py-1.5 hover:bg-gray-100 transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
            </div>
            {error && (
              <div className="mb-4 rounded-lg px-4 py-3 text-sm font-medium border border-red-200 bg-red-50 text-red-700">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border outline-none transition-colors focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)]"
                  style={{ borderColor: 'var(--border)' }}
                  placeholder="Announcement title"
                  maxLength={120}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Message</label>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border outline-none transition-colors resize-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)]"
                  style={{ borderColor: 'var(--border)' }}
                  placeholder="Write your announcement..."
                  rows={4}
                  maxLength={1000}
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-lg font-semibold text-white transition-colors disabled:opacity-50 hover:opacity-90"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                {submitting ? 'Posting...' : 'Post Announcement'}
              </button>
            </form>
          </>
        )}
      </div>

      <div className="card card-body">
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Announcements</h2>
        {announcements.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No announcements yet.</p>
        ) : (
          <div className="space-y-4">
            {announcements.map(a => (
              <div
                key={a.id}
                className="rounded-lg p-4 transition-shadow hover:shadow-sm border"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="flex items-center justify-between gap-4 mb-2">
                  <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{a.title}</h3>
                  <span className="text-xs shrink-0" style={{ color: 'var(--text-secondary)' }}>{new Date(a.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>{a.body}</p>
                <p className="text-xs mt-3" style={{ color: 'var(--text-secondary)' }}>Posted by {capitalizeName(a.author_name)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
