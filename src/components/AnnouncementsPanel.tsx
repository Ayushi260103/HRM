'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { useSupabase } from '@/hooks/useSupabase'
import { capitalizeName } from '@/lib/utils/string'

type Announcement = {
  id: string
  title: string
  body: string
  author_id: string
  author_name: string
  author_role: string
  created_at: string
  author_avatar_url?: string | null
}

interface AnnouncementsPanelProps {
  userId: string
  userName: string
  userRole: string
  userAvatarUrl?: string | null
}

export default function AnnouncementsPanel({ userId, userName, userRole, userAvatarUrl }: AnnouncementsPanelProps) {
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
        .select('id, title, body, author_id, author_name, author_role, created_at')
        .order('created_at', { ascending: false })

      if (loadError) throw loadError

      const list = data || []
      if (list.length > 0) {
        const authorIds = [...new Set(list.map((a) => a.author_id).filter(Boolean))]
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, avatar_url')
          .in('id', authorIds)
        const avatarMap = new Map((profiles || []).map((p) => [p.id, p.avatar_url]))
        const enriched = list.map((a) => ({
          ...a,
          author_avatar_url: avatarMap.get(a.author_id) ?? null,
        }))
        setAnnouncements(enriched)
      } else {
        setAnnouncements([])
      }
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
        .select('id, title, body, author_id, author_name, author_role, created_at')
        .single()

      if (insertError) throw insertError

      if (data) {
        setAnnouncements(prev => [{ ...data, author_avatar_url: userAvatarUrl ?? null }, ...prev])
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
    return <p className="text-sm text-slate-500">Loading announcements...</p>
  }

  return (
    <div className="space-y-6">
      <div className="bg-transparent border-0 shadow-none p-0">
        {!showCreateForm ? (
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add announcement
          </button>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900">Create Announcement</h2>
              <button
                type="button"
                onClick={() => { setShowCreateForm(false); setError(null); setTitle(''); setBody(''); }}
                className="text-sm font-medium rounded-lg px-3 py-1.5 text-slate-500 hover:bg-slate-100 transition-colors"
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
                <label className="block text-sm font-medium mb-2 text-slate-700">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="input-base w-full"
                  placeholder="Announcement title"
                  maxLength={120}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700">Message</label>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  className="input-base w-full resize-none"
                  placeholder="Write your announcement..."
                  rows={4}
                  maxLength={1000}
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-lg font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50"
              >
                {submitting ? 'Posting...' : 'Post Announcement'}
              </button>
            </form>
          </>
        )}
      </div>

      <div className="card card-body">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Announcements</h2>
        {announcements.length === 0 ? (
          <p className="text-sm text-slate-500">No announcements yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {announcements.map((a, i) => {
              const accentColors = ['border-l-indigo-400', 'border-l-violet-400', 'border-l-sky-400', 'border-l-rose-400']
              const accent = accentColors[i % accentColors.length]
              return (
                <div
                  key={a.id}
                  className={`rounded-lg p-4 border border-slate-200 bg-white border-l-4 ${i > 0 ? accent : 'border-l-indigo-400'} transition-all duration-200 hover:shadow-sm hover:bg-indigo-50/50 min-w-0 flex flex-col ${i === 0 ? 'md:col-span-2' : ''}`}
                >
                  <div className="flex gap-3 mb-3">
                    {a.author_avatar_url ? (
                      <Image
                        src={a.author_avatar_url}
                        alt={a.author_name || 'Author'}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-sm font-semibold bg-indigo-100 text-indigo-600">
                        {(a.author_name || 'A')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-800">{capitalizeName(a.author_name)}</p>
                      <span className="text-xs text-slate-500">{new Date(a.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">{a.title}</h3>
                  <p className="text-sm whitespace-pre-line text-slate-600 flex-1">{a.body}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
