'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type AnnouncementRow = {
  id: string
  title: string
  body: string
  urgent: boolean
  posted_at: string
  target_role: string | null
  posted_by_name: string | null
  target_family_name: string | null
}

type FamilyOption = { id: string; name: string }

const ROLES = [
  { value: '', label: 'Everyone' },
  { value: 'admin', label: 'Admin' },
  { value: 'lead_facilitator', label: 'Lead Facilitators' },
  { value: 'facilitator', label: 'Facilitators' },
  { value: 'facilitator_support', label: 'Facilitator Support' },
  { value: 'participant', label: 'Participants' },
]

function timeAgo(iso: string) {
  const then = new Date(iso).getTime()
  const diffMs = Date.now() - then
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export default function Announcements({
  canPost = false,
  limit,
}: {
  canPost?: boolean
  limit?: number
}) {
  const supabase = createClient()
  const [rows, setRows] = useState<AnnouncementRow[]>([])
  const [loading, setLoading] = useState(true)
  const [families, setFamilies] = useState<FamilyOption[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', urgent: false, target_role: '', target_family_id: '' })

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('announcements')
      .select('id, title, body, urgent, posted_at, target_role, posted_by:profiles(full_name), target_family:families(name)')
      .order('urgent', { ascending: false })
      .order('posted_at', { ascending: false })
    if (limit) query = query.limit(limit)
    const { data } = await query

    setRows(
      (data ?? []).map((r) => {
        const posted = Array.isArray(r.posted_by) ? r.posted_by[0] : r.posted_by
        const fam = Array.isArray(r.target_family) ? r.target_family[0] : r.target_family
        return {
          id: r.id,
          title: r.title,
          body: r.body,
          urgent: r.urgent,
          posted_at: r.posted_at,
          target_role: r.target_role,
          posted_by_name: posted?.full_name ?? null,
          target_family_name: fam?.name ?? null,
        }
      })
    )
    setLoading(false)
  }, [supabase, limit])

  useEffect(() => {
    load()
    if (canPost) {
      supabase
        .from('families')
        .select('id, name')
        .order('name')
        .then(({ data }) => setFamilies(data ?? []))
    }
  }, [load, canPost, supabase])

  async function post() {
    if (!form.title.trim() || !form.body.trim()) return
    setSaving(true)
    const { data: userData } = await supabase.auth.getUser()
    await supabase.from('announcements').insert({
      title: form.title.trim(),
      body: form.body.trim(),
      urgent: form.urgent,
      target_role: form.target_role || null,
      target_family_id: form.target_family_id || null,
      posted_by: userData.user?.id ?? null,
    })
    setForm({ title: '', body: '', urgent: false, target_role: '', target_family_id: '' })
    setShowForm(false)
    setSaving(false)
    load()
  }

  async function remove(id: string) {
    if (!confirm('Delete this announcement?')) return
    await supabase.from('announcements').delete().eq('id', id)
    load()
  }

  return (
    <div className="max-w-3xl">
      {canPost && (
        <div className="mb-5">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="rounded-lg bg-[#022269] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              + Post Announcement
            </button>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3">
                <label className="mb-1 block text-xs font-medium text-gray-500">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Announcement title"
                />
              </div>
              <div className="mb-3">
                <label className="mb-1 block text-xs font-medium text-gray-500">Message</label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="What do you want to tell people?"
                />
              </div>
              <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Who should see this?</label>
                  <select
                    value={form.target_role}
                    onChange={(e) => setForm((f) => ({ ...f, target_role: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Which family? (optional)</label>
                  <select
                    value={form.target_family_id}
                    onChange={(e) => setForm((f) => ({ ...f, target_family_id: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">All families</option>
                    {families.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <label className="mb-4 flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.urgent}
                  onChange={(e) => setForm((f) => ({ ...f, urgent: e.target.checked }))}
                />
                Mark as urgent
              </label>
              <div className="flex gap-2">
                <button
                  onClick={post}
                  disabled={saving}
                  className="rounded-lg bg-[#022269] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? 'Posting...' : 'Post'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-400">No announcements yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <div
              key={r.id}
              className={`rounded-xl border p-4 shadow-sm ${
                r.urgent ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="mb-1 flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-gray-900">
                  {r.urgent && <span className="mr-1.5 text-red-600">●</span>}
                  {r.title}
                </h3>
                <div className="flex shrink-0 items-center gap-2 text-xs text-gray-400">
                  <span>{timeAgo(r.posted_at)}</span>
                  {canPost && (
                    <button onClick={() => remove(r.id)} className="text-gray-300 hover:text-red-600" title="Delete">
                      ✕
                    </button>
                  )}
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm text-gray-600">{r.body}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-400">
                {r.posted_by_name && <span>— {r.posted_by_name}</span>}
                {r.target_family_name && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5">{r.target_family_name} only</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
