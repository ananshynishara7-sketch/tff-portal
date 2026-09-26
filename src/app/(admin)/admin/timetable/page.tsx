'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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

// Fixed facilitator list, in the order requested - not tied to login
// accounts, since facilitators don't have logins yet.
const FACILITATORS = [
  'Suba', 'Jeyastan', 'Nishara', 'Gajan', 'Jenny',
  'Rageethan', 'Thuvarahan', 'Dakshika', 'Jericksha',
]

// The rotating groups used in the Phase 3 schedule - a separate concept
// from the attendance Families. Each gets its own colour so a day's
// parallel activities are easy to tell apart at a glance.
const GROUPS: { name: string; badge: string; dot: string }[] = [
  { name: 'Spartans', badge: 'bg-red-100 text-red-800 border-red-300', dot: 'bg-red-500' },
  { name: 'Thebans', badge: 'bg-blue-100 text-blue-800 border-blue-300', dot: 'bg-blue-500' },
  { name: 'Athenians', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', dot: 'bg-emerald-500' },
]
const GROUP_STYLE: Record<string, { badge: string; dot: string }> = Object.fromEntries(
  GROUPS.map((g) => [g.name, g])
)
const EVERYONE_STYLE = { badge: 'bg-gray-100 text-gray-700 border-gray-300', dot: 'bg-gray-400' }

type SessionRow = {
  id: string
  title: string
  date: string
  start_time: string
  end_time: string
  group_name: string | null
  facilitator_name: string | null
}

const todayISO = () => new Date().toISOString().slice(0, 10)
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function addDays(iso: string, n: number) {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function startOfWeek(iso: string) {
  const d = new Date(iso + 'T00:00:00Z')
  const day = d.getUTCDay() // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diffToMonday)
  return d.toISOString().slice(0, 10)
}

export default function AdminTimetablePage() {
  const supabase = createClient()
  const [date, setDate] = useState(todayISO())
  const [allSessions, setAllSessions] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const emptyForm = {
    title: '',
    date,
    start_time: '09:00',
    end_time: '10:00',
    group_name: '',
    facilitator_name: '',
  }
  const [form, setForm] = useState(emptyForm)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('sessions')
      .select('id, title, date, start_time, end_time, group_name, facilitator_name')
      .order('date')
      .order('start_time')
    setAllSessions(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  function startAdd() {
    setEditingId('new')
    setForm({ ...emptyForm, date })
    setError(null)
  }

  function startEdit(row: SessionRow) {
    setEditingId(row.id)
    setForm({
      title: row.title,
      date: row.date,
      start_time: row.start_time.slice(0, 5),
      end_time: row.end_time.slice(0, 5),
      group_name: row.group_name ?? '',
      facilitator_name: row.facilitator_name ?? '',
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
      group_name: form.group_name || null,
      facilitator_name: form.facilitator_name || null,
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

  const weekStart = useMemo(() => startOfWeek(date), [date])
  const weekDays = useMemo(() => Array.from({ length: 5 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const sessionCountByDate = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const s of allSessions) counts[s.date] = (counts[s.date] ?? 0) + 1
    return counts
  }, [allSessions])

  const daySessions = useMemo(
    () => allSessions.filter((s) => s.date === date).sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [allSessions, date]
  )

  // Group sessions that share the same start time, so parallel activities
  // (e.g. three groups' English Language rotation) show together.
  const timeBlocks = useMemo(() => {
    const blocks: { start: string; end: string; rows: SessionRow[] }[] = []
    for (const s of daySessions) {
      const last = blocks[blocks.length - 1]
      if (last && last.start === s.start_time) {
        last.rows.push(s)
      } else {
        blocks.push({ start: s.start_time, end: s.end_time, rows: [s] })
      }
    }
    return blocks
  }, [daySessions])

  return (
    <DashboardShell roleLabel="Participants Attendance Dashboard" navItems={navItems}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">Timetable</h1>
        <button
          onClick={startAdd}
          className="rounded-md bg-[#022269] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
        >
          + Add Session
        </button>
      </div>

      {/* Colour legend */}
      <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-gray-500">
        <span>Groups:</span>
        {GROUPS.map((g) => (
          <span key={g.name} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${g.dot}`} />
            {g.name}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${EVERYONE_STYLE.dot}`} />
          Everyone
        </span>
      </div>

      {/* Week strip - quick day navigation */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setDate(addDays(date, -7))}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          ‹ Week
        </button>
        {weekDays.map((d) => {
          const isSelected = d === date
          const count = sessionCountByDate[d] ?? 0
          return (
            <button
              key={d}
              onClick={() => setDate(d)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                isSelected
                  ? 'border-[#022269] bg-[#022269] text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {dayNames[new Date(d + 'T00:00:00Z').getUTCDay()].slice(0, 3)}{' '}
              {d.slice(8, 10)}/{d.slice(5, 7)}
              {count > 0 && (
                <span
                  className={`ml-1.5 rounded-full px-1.5 text-xs ${
                    isSelected ? 'bg-white/20' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
        <button
          onClick={() => setDate(addDays(date, 7))}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          Week ›
        </button>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="ml-auto rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
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
                placeholder="e.g. English Language"
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
                <label className="mb-1 block text-sm font-medium text-gray-700">Group</label>
                <select
                  value={form.group_name}
                  onChange={(e) => setForm((f) => ({ ...f, group_name: e.target.value }))}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#022269] focus:outline-none sm:w-56"
                >
                  <option value="">Everyone</option>
                  {GROUPS.map((g) => (
                    <option key={g.name} value={g.name}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Facilitator</label>
                <select
                  value={form.facilitator_name}
                  onChange={(e) => setForm((f) => ({ ...f, facilitator_name: e.target.value }))}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#022269] focus:outline-none sm:w-56"
                >
                  <option value="">Not assigned yet</option>
                  {FACILITATORS.map((f) => (
                    <option key={f} value={f}>
                      {f}
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

      <h2 className="mb-3 text-lg font-semibold text-gray-900">
        {dayNames[new Date(date + 'T00:00:00Z').getUTCDay()]}, {date}
      </h2>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : timeBlocks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
          Nothing on the timetable for this day yet.
        </div>
      ) : (
        <div className="space-y-4">
          {timeBlocks.map((block) => (
            <div key={block.start} className="flex gap-4">
              <div className="w-20 shrink-0 pt-3 text-right text-xs font-medium text-gray-500">
                {block.start.slice(0, 5)}
                <br />–<br />
                {block.end.slice(0, 5)}
              </div>
              <div className="flex-1 space-y-2">
                {block.rows.map((s) => {
                  const style = s.group_name ? GROUP_STYLE[s.group_name] ?? EVERYONE_STYLE : EVERYONE_STYLE
                  return (
                    <div
                      key={s.id}
                      className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 shadow-sm ${style.badge}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} />
                        <div>
                          <p className="font-medium">{s.title}</p>
                          <p className="text-xs opacity-80">
                            {s.group_name ?? 'Everyone'}
                            {s.facilitator_name ? ` · ${s.facilitator_name}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(s)}
                          className="text-xs font-medium underline opacity-80 hover:opacity-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteSession(s.id)}
                          className="text-xs font-medium underline opacity-80 hover:opacity-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  )
}
