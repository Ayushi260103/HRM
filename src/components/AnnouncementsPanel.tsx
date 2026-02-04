'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
  const supabase = createClient()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadAnnouncements = async () => {
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
    }

    loadAnnouncements()
  }, [supabase])

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
          author_name: userName,
          author_role: userRole,
        })
        .select('id, title, body, author_name, author_role, created_at')
        .single()

      if (insertError) throw insertError

      if (data) {
        setAnnouncements(prev => [data, ...prev])
        setTitle('')
        setBody('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post announcement')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="text-gray-600">Loading announcements...</div>
  }

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Create Announcement</h2>
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Announcement title"
              maxLength={120}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Message</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
              placeholder="Write your announcement..."
              rows={4}
              maxLength={1000}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Posting...' : 'Post Announcement'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Announcements</h2>
        {announcements.length === 0 ? (
          <p className="text-gray-500">No announcements yet.</p>
        ) : (
          <div className="space-y-4">
            {announcements.map(a => (
              <div key={a.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <h3 className="font-semibold text-gray-900">{a.title}</h3>
                  <span className="text-xs text-gray-500">{new Date(a.created_at).toLocaleString()}</span>
                </div>
                <p className="text-gray-700 text-sm whitespace-pre-line">{a.body}</p>
                <p className="text-xs text-gray-500 mt-3">Posted by {a.author_name}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
