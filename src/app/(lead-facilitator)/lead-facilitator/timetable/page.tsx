'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import DashboardShell from '@/components/DashboardShell'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { label: 'Dashboard', href: '/lead-facilitator' },
  { label: 'Participants', href: '/lead-facilitator/participants' },
  { label: 'Facilitators', href: '/lead-facilitator/facilitators' },
  { label: 'Attendance', href: '/lead-facilitator/attendance' },
  { label: 'Masterplan Phase 3', href: '/lead-facilitator/timetable' },
  { label: 'My Blocked Time', href: '/lead-facilitator/blocked-time' },
  { label: 'My To-Do List', href: '/lead-facilitator/todo' },
  { label: 'Announcements', href: '/lead-facilitator/announcements' },
  { label: 'Assessments', href: '/lead-facilitator/assessments' },
  { label: 'The Flag Carriers', href: '/lead-facilitator/flag-carriers' },
  { label: 'Progress Tracking', href: '/lead-facilitator/progress' },
]

// Fixed facilitator list, in the order requested - not tied to login
// accounts, since facilitators don't have logins yet.
const FACILITATORS = [
  'Suba', 'Jeyastan', 'Nishara', 'Gajan', 'Jenny',
  'Rageethan', 'Thuvarahan', 'Dakshika', 'Jericksha',
]

type TimetableGroup = { id: string; name: string; color: string; sort_order: number }
type TimetableLocation = { id: string; name: string; color: string; sort_order: number }

type SessionRow = {
  id: string
  title: string
  date: string
  start_time: string
  end_time: string
  group_name: string | null
  facilitator_name: string | null
  co_facilitator_name: string | null
  color: string | null
  location_name: string | null
}

const todayISO = () => new Date().toISOString().slice(0, 10)
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const pad2 = (n: number) => String(n).padStart(2, '0')

// Local (browser) date/time, not UTC - so "now" lines up with what's on
// the timetable, which is entered in local time.
function localNowParts(d: Date) {
  return {
    date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`,
  }
}

function isHappeningNow(s: { date: string; start_time: string; end_time: string }, nowDate: string, nowTime: string) {
  return s.date === nowDate && s.start_time <= nowTime && nowTime < s.end_time
}

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

// Turns a picked hex colour into a light-background / coloured-border /
// coloured-text card style, so one colour choice is enough per group.
function colorStyle(hex: string) {
  return {
    backgroundColor: `${hex}1A`,
    borderColor: hex,
    color: hex,
  }
}

export default function LeadFacilitatorTimetablePage() {
  const supabase = createClient()
  const [date, setDate] = useState(todayISO())
  const [allSessions, setAllSessions] = useState<SessionRow[]>([])
  const [groups, setGroups] = useState<TimetableGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showColours, setShowColours] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupColor, setNewGroupColor] = useState('#f59e0b')
  const [locations, setLocations] = useState<TimetableLocation[]>([])
  const [newLocationName, setNewLocationName] = useState('')
  const [newLocationColor, setNewLocationColor] = useState('#0891b2')
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  const { date: nowDate, time: nowTime } = localNowParts(now)

  const emptyForm = {
    title: '',
    date,
    start_time: '09:00',
    end_time: '10:00',
    group_name: '',
    facilitator_name: '',
    co_facilitator_name: '',
    color: '',
    location_name: '',
  }
  const [form, setForm] = useState(emptyForm)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: sessionData }, { data: groupData }, { data: locationData }] = await Promise.all([
      supabase
        .from('sessions')
        .select(
          'id, title, date, start_time, end_time, group_name, facilitator_name, co_facilitator_name, color, location_name'
        )
        .order('date')
        .order('start_time'),
      supabase.from('timetable_groups').select('id, name, color, sort_order').order('sort_order'),
      supabase.from('timetable_locations').select('id, name, color, sort_order').order('sort_order'),
    ])
    setAllSessions(sessionData ?? [])
    setGroups(groupData ?? [])
    setLocations(locationData ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  const everyoneGroup = groups.find((g) => g.name === 'Everyone')
  const pickableGroups = groups.filter((g) => g.name !== 'Everyone')
  const colorByName: Record<string, string> = Object.fromEntries(groups.map((g) => [g.name, g.color]))
  const everyoneColor = everyoneGroup?.color ?? '#6b7280'

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
      co_facilitator_name: row.co_facilitator_name ?? '',
      color: row.color ?? '',
      location_name: row.location_name ?? '',
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
      co_facilitator_name: form.co_facilitator_name || null,
      color: form.color || null,
      location_name: form.location_name || null,
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

  async function updateGroupColor(id: string, color: string) {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, color } : g)))
    await supabase.from('timetable_groups').update({ color }).eq('id', id)
  }

  async function renameGroup(id: string, name: string) {
    if (!name.trim()) return
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, name: name.trim() } : g)))
    await supabase.from('timetable_groups').update({ name: name.trim() }).eq('id', id)
  }

  async function addGroup(e: React.FormEvent) {
    e.preventDefault()
    if (!newGroupName.trim()) return
    await supabase
      .from('timetable_groups')
      .insert({ name: newGroupName.trim(), color: newGroupColor, sort_order: groups.length })
    setNewGroupName('')
    setNewGroupColor('#f59e0b')
    load()
  }

  async function deleteGroup(id: string, name: string) {
    if (name === 'Everyone') return
    if (
      !confirm(
        `Remove "${name}" from the group list? Sessions already using it will just show grey until you pick a new group for them.`
      )
    )
      return
    await supabase.from('timetable_groups').delete().eq('id', id)
    load()
  }

  async function updateLocationColor(id: string, color: string) {
    setLocations((prev) => prev.map((l) => (l.id === id ? { ...l, color } : l)))
    await supabase.from('timetable_locations').update({ color }).eq('id', id)
  }

  async function renameLocation(id: string, name: string) {
    if (!name.trim()) return
    setLocations((prev) => prev.map((l) => (l.id === id ? { ...l, name: name.trim() } : l)))
    await supabase.from('timetable_locations').update({ name: name.trim() }).eq('id', id)
  }

  async function addLocation(e: React.FormEvent) {
    e.preventDefault()
    if (!newLocationName.trim()) return
    await supabase
      .from('timetable_locations')
      .insert({ name: newLocationName.trim(), color: newLocationColor, sort_order: locations.length })
    setNewLocationName('')
    setNewLocationColor('#0891b2')
    load()
  }

  async function deleteLocation(id: string, name: string) {
    if (
      !confirm(
        `Remove "${name}" from the location list? Sessions already using it will keep the name, it just won't be pickable from the dropdown any more.`
      )
    )
      return
    await supabase.from('timetable_locations').delete().eq('id', id)
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

  // The Add/Edit Session form - shared by the "New session" spot at the top
  // and by the inline editor that replaces a session's own card, so editing
  // "Lunch" doesn't jump you away from Lunch.
  function renderSessionForm(heading: string) {
    return (
      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">{heading}</h2>
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
                onChange={(e) => {
                  const name = e.target.value
                  setForm((f) => ({
                    ...f,
                    group_name: name,
                    // Suggest that group's colour, but only if a colour
                    // hasn't been picked by hand already for this session.
                    color: f.color ? f.color : name ? colorByName[name] ?? f.color : everyoneColor,
                  }))
                }}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#022269] focus:outline-none sm:w-56"
              >
                <option value=""></option>
                <option value="Everyone">Everyone</option>
                {pickableGroups.map((g) => (
                  <option key={g.id} value={g.name}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Colour</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.color || everyoneColor}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  className="h-9 w-9 cursor-pointer rounded border border-gray-300"
                />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color: '' }))}
                  className="text-xs text-gray-500 underline hover:text-gray-700"
                >
                  Use group&apos;s colour
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Location</label>
              <select
                value={form.location_name}
                onChange={(e) => setForm((f) => ({ ...f, location_name: e.target.value }))}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#022269] focus:outline-none sm:w-56"
              >
                <option value="">Not set</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.name}>
                    {l.name}
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
                <option value="All Facilitators">All Facilitators</option>
                {FACILITATORS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Co-facilitator</label>
              <select
                value={form.co_facilitator_name}
                onChange={(e) => setForm((f) => ({ ...f, co_facilitator_name: e.target.value }))}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#022269] focus:outline-none sm:w-56"
              >
                <option value="">Not assigned yet</option>
                <option value="All Facilitators">All Facilitators</option>
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
    )
  }

  return (
    <DashboardShell roleLabel="Lead Facilitator" navItems={navItems}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">Masterplan Phase 3</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowColours((v) => !v)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {showColours ? 'Hide Colours' : 'Edit Colours'}
          </button>
          <button
            onClick={startAdd}
            className="rounded-md bg-[#022269] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            + Add Session
          </button>
        </div>
      </div>

      {showColours ? (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Group colours</h2>
          <div className="space-y-3">
            {groups.map((g) => (
              <div key={g.id} className="flex flex-wrap items-center gap-3">
                <input
                  type="color"
                  value={g.color}
                  onChange={(e) => updateGroupColor(g.id, e.target.value)}
                  className="h-9 w-9 cursor-pointer rounded border border-gray-300"
                />
                {g.name === 'Everyone' ? (
                  <span className="w-48 text-sm font-medium text-gray-900">Everyone (default)</span>
                ) : (
                  <input
                    type="text"
                    defaultValue={g.name}
                    onBlur={(e) => renameGroup(g.id, e.target.value)}
                    className="w-48 rounded-md border border-gray-300 px-2 py-1 text-sm"
                  />
                )}
                <span
                  className="rounded-full border px-2 py-1 text-xs font-medium"
                  style={colorStyle(g.color)}
                >
                  Preview
                </span>
                {g.name !== 'Everyone' && (
                  <button
                    onClick={() => deleteGroup(g.id, g.name)}
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={addGroup} className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
            <input
              type="color"
              value={newGroupColor}
              onChange={(e) => setNewGroupColor(e.target.value)}
              className="h-9 w-9 cursor-pointer rounded border border-gray-300"
            />
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="New group name"
              className="w-48 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
            <button
              type="submit"
              className="rounded-md bg-[#022269] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
            >
              + Add Group
            </button>
          </form>
        </div>
      ) : (
        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <span>Groups:</span>
          {groups.map((g) => (
            <span key={g.id} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g.color }} />
              {g.name}
            </span>
          ))}
          <span className="ml-3">Locations:</span>
          {locations.map((l) => (
            <span key={l.id} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.color }} />
              {l.name}
            </span>
          ))}
        </div>
      )}

      {showColours && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Location colours</h2>
          <div className="space-y-3">
            {locations.map((l) => (
              <div key={l.id} className="flex flex-wrap items-center gap-3">
                <input
                  type="color"
                  value={l.color}
                  onChange={(e) => updateLocationColor(l.id, e.target.value)}
                  className="h-9 w-9 cursor-pointer rounded border border-gray-300"
                />
                <input
                  type="text"
                  defaultValue={l.name}
                  onBlur={(e) => renameLocation(l.id, e.target.value)}
                  className="w-48 rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
                <span className="rounded-full border px-2 py-1 text-xs font-medium" style={colorStyle(l.color)}>
                  Preview
                </span>
                <button
                  onClick={() => deleteLocation(l.id, l.name)}
                  className="text-xs font-medium text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={addLocation} className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
            <input
              type="color"
              value={newLocationColor}
              onChange={(e) => setNewLocationColor(e.target.value)}
              className="h-9 w-9 cursor-pointer rounded border border-gray-300"
            />
            <input
              type="text"
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
              placeholder="New location name"
              className="w-48 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
            <button
              type="submit"
              className="rounded-md bg-[#022269] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
            >
              + Add Location
            </button>
          </form>
        </div>
      )}

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

      {editingId === 'new' && renderSessionForm('New session')}

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
                  // Editing this exact session replaces its card with the
                  // form, right where it is - no jumping to the top.
                  if (s.id === editingId) {
                    return <div key={s.id}>{renderSessionForm('Edit session')}</div>
                  }

                  const hex = s.color || (s.group_name ? colorByName[s.group_name] ?? everyoneColor : everyoneColor)
                  const happeningNow = isHappeningNow(s, nowDate, nowTime)
                  return (
                    <div
                      key={s.id}
                      className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 shadow-sm ${
                        happeningNow ? 'ring-2 ring-offset-1' : ''
                      }`}
                      style={happeningNow ? { ...colorStyle(hex), ...({ '--tw-ring-color': hex } as Record<string, string>) } : colorStyle(hex)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: hex }} />
                        <div>
                          <p className="flex items-center gap-2 font-medium">
                            {s.title}
                            {happeningNow && (
                              <span
                                className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
                                style={{ backgroundColor: hex }}
                              >
                                Happening now
                              </span>
                            )}
                          </p>
                          {(() => {
                            const parts = [
                              s.group_name,
                              s.location_name,
                              s.facilitator_name,
                              s.co_facilitator_name ? `+ ${s.co_facilitator_name}` : null,
                            ].filter(Boolean)
                            return parts.length > 0 ? (
                              <p className="text-xs opacity-80">{parts.join(' · ')}</p>
                            ) : null
                          })()}
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
