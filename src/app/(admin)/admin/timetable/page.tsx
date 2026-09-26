'use client'

import { useCallback, useEffect, useState } from 'react'
import DashboardShell from '@/components/DashboardShell'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Participants', href: '/admin/participants' },
  { label: 'Facilitators', href: '/admin/facilitators' },
  { label: 'Attendance', href: '/admin/attendance' },
  { label: 'Leave Requests', href: '/admin/leave-requests' },
  { label: 'Timetable', href: '/admin/timetable' },
  { label: 'Announcements', href: '/admin/announcements' },
  { label: 'Families', href: '/admin/groups' },
  { label: 'Settings', href: '/admin/settings' },
]

type Family = { id: string; name: string; display_color: string }
type Facilitator = { id: string; full_name: string }

type SessionRow = {
  id: string
  title: string
  date: string
  start_time: string
  end_time: string
  family_id: string | null
  family_name: string | null
  family_color: string | null
  facilitator_id: string | null
  facilitator_name: string | null
}

const todayISO = () => new Date().toISOString().slice(0, 10)

export default function AdminTimetablePage() {
  const supabase = createClient()
  const [families, setFamilies] = useState<Family[]>([])
  const [facilitators, setFacilitators] = useState<Facilitator[]>([])
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showPast, setShowPast] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const emptyForm = {
    title: '',
    date: todayISO(),
    start_time: '09:00',
    end_time: '10:00',
    family_id: '' as string,
    facilitator_id: '' as string,
  }
  const [form, setForm] = useState(emptyForm)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: familiesData }, { data: facilitatorsData }, { data: sessionsData }] =
      await Promise.all([
        supabase.from('families').select('id, name, display_color').order('name'),
        supabase
          .from('profiles')
          .select('id, full_name')
          .in('role', ['facilitator', 'facilitator_support', 'lead_facilitator'])
          .order('full_name'),
        supabase
          .from('sessions')
          .select('id, title, date, start_time, end_time, family_id, facilitator_id, families(name, display_color), facilitator:profiles(full_name)')
          .order('date')
          .order('start_time'),
      ])

    setFamilies(familiesData ?? [])
    setFacilitators(facilitatorsData ?? [])

    type JoinRow = {
      id: string
      title: string
      date: string
      start_time: string
      end_time: string
      family_id: string | null
      facilitator_id: string | null
      families: { name: string; display_color: string } | null
      facilitator: { full_name: string } | null
    }
    const rows: SessionRow[] = ((sessionsData as unknown as JoinRow[]) ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      date: s.date,
      start_time: s.start_time,
      end_time: s.end_time,
      family_id: s.family_id,
      family_name: s.families?.name ?? null,
      family_color: s.families?.display_color ?? null,
      facilitator_id: s.facilitator_id,
      facilitator_name: s.facilitator?.full_name ?? null,
    }))
    setSessions(rows)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  function startAdd() {
    setEditingId('new')
    setForm(emptyForm)
    setError(null)
  }

  function startEdit(row: SessionRow) {
    setEditingId(row.id)
    setForm({
      title: row.title,
      date: row.date,
      start_time: row.start_time.slice(0, 5),
      end_time: row.end_time.slice(0, 5),
      family_id: row.family_id ?? '',
      facilitator_id: row.facilitator_id ?? '',
    })
    setError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setError(null)
  }

  async function saveSession(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.title.trim()) {
      setError('Please give the session a title.')
      return
    }
    if (form.end_time <= form.start_time) {
      setError('The end time has to be after the start time.')
      return
    }

    setSaving(true)
    const payload = {
      title: form.title.trim(),
      date: form.date,
      start_time: form.start_time,
      end_time: form.end_time,
      family_id: form.family_id || null,
      facilitator_id: form.facilitator_id || null,
    }

    if (editingId === 'new') {
      await supabase.from('sessions').insert(payload)
    } else if (editingId) {
      await supabase.from('sessions').update(payload).eq('id', editingId)
    }

    setSaving(false)
    setEditingId(null)
    load()
  }

  async function deleteSession(id: string) {
    if (!confirm('Delete this session from the timetable? This cannot be undone.')) return
    await supabase.from('sessions').delete().eq('id', id)
    load()
  }

  const visibleSessions = showPast ? sessions : sessions.filter((s) => s.date >= todayISO())

  return (
    <DashboardShell roleLabel="Participants Attendance Dashboard" navItems={navItems}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">Timetable</h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showPast}
              onChange={(e) => setShowPast(e.target.checked)}
            />
            Show past sessions
          </label>
          <button
            onClick={startAdd}
            className="rounded-md bg-[#022269] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            + Add Session
          </button>
        </div>
      </div>

      {editingId && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            {editingId === 'new' ? 'New session' : 'Edit session'}
          </h2>
          <form onSubmit={saveSession} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. English Class"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#022269] focus:outline-none sm:w-96"
              />
            </div>

            <div className="flex flex-wrap gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#022269] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Start time</label>
                <input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#022269] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">End time</label>
                <input
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#022269] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Family</label>
                <select
                  value={form.family_id}
                  onChange={(e) => setForm((f) => ({ ...f, family_id: e.target.value }))}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#022269] focus:outline-none sm:w-56"
                >
                  <option value="">Everyone</option>
                  {families.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Facilitator</label>
                <select
                  value={form.facilitator_id}
                  onChange={(e) => setForm((f) => ({ ...f, facilitator_id: e.target.value }))}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#022269] focus:outline-none sm:w-56"
                >
                  <option value="">Not assigned yet</option>
                  {facilitators.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-[#022269] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Family</th>
              <th className="px-4 py-3">Facilitator</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : visibleSessions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  {showPast ? 'No sessions yet.' : 'No upcoming sessions. Add one above.'}
                </td>
              </tr>
            ) : (
              visibleSessions.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">{s.date}</td>
                  <td className="px-4 py-3">
                    {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{s.title}</td>
                  <td className="px-4 py-3">
                    {s.family_name ? (
                      <span
                        className="rounded-full border px-2 py-1 text-xs font-medium"
                        style={{ borderColor: s.family_color ?? '#ccc', color: s.family_color ?? '#333' }}
                      >
                        {s.family_name}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Everyone</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{s.facilitator_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(s)}
                        className="text-xs font-medium text-[#022269] hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteSession(s.id)}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  )
}
