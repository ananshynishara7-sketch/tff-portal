'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type TodoRow = {
  id: string
  category: string | null
  task: string
  assigned_by: string | null
  assigned_to: string | null
  due_date: string | null
  recurring: boolean
  frequency: string | null
  urgency: string | null
  importance: string | null
  priority_rank: number | null
  status: string
  accountability_partner: string | null
  resources_needed: string | null
  completed_at: string | null
  created_at: string
}

type StatusRow = { id: string; name: string; color: string; sort_order: number }

// Straight from Nishara's own to-do spreadsheet.
const CATEGORIES = [
  'Curriculum', 'Events', 'Facilitator Training', 'Flag Carriers',
  'Language & Leadership', 'Merchandise', 'Office Manager', 'Participants',
  'Public Relations', 'Recruitment of Participants', 'Safeguarding',
]
const FREQUENCIES = ['Weekly', 'Biweekly', 'Monthly']
// Same people list used for Assigned To - reused for Assigned By and
// Accountability Partner too, plus "Admin" since that's a common assigner
// in the spreadsheet.
const PEOPLE = [
  'Admin', 'Jeyastan', 'Nishara', 'Gajan', 'Jenny', 'Rageethan',
  'Thuvarahan', 'Dakshika', 'Jericksha', 'Suganya',
]
const ASSIGNEES = PEOPLE.filter((p) => p !== 'Admin')

const URGENCIES = ['Urgent', 'Not Urgent']
const IMPORTANCES = ['Important', 'Not Important']

const DEFAULT_COLOR = '#9ca3af'

// Small inline icons (no icon library dependency) used to make the meta
// line scannable instead of a wall of dot-separated text.
function Icon({ path, className = 'h-3.5 w-3.5' }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
const ICONS = {
  calendar: 'M5.5 3v2.5M14.5 3v2.5M3.5 8h13M4.5 5h11a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z',
  user: 'M10 10a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm-6 7c0-3 2.7-5.4 6-5.4s6 2.4 6 5.4',
  arrowRight: 'M10 4.5 15.5 10 10 15.5M4 10h11',
  repeat: 'M4 7.5h9a2.5 2.5 0 0 1 2.5 2.5v1M16 12.5H7A2.5 2.5 0 0 1 4.5 10V9M6.5 5 4 7.5 6.5 10M13.5 15l2.5-2.5L13.5 10',
  shield: 'M10 3 4 5v4.5c0 4 2.6 6.9 6 7.5 3.4-.6 6-3.5 6-7.5V5l-6-2Z',
  box: 'M3.5 6.5 10 3l6.5 3.5L10 10 3.5 6.5ZM3.5 6.5V14l6.5 3.5m0-7.5V17.5m0-7.5L16.5 6.5m0 0V14L10 17.5',
  pencil: 'M13 4.5 15.5 7 7 15.5 4 16.5 5 13.5 13 4.5Z',
  trash: 'M4.5 6h11M8.5 6V4.5h3V6M7 6v9.5a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V6M9 9v4M11 9v4',
}

// Turns a picked hex colour into a light-background / coloured-border /
// coloured-text card style, same trick used for Blocked Time and the
// Masterplan.
function colorStyle(hex: string) {
  return {
    backgroundColor: `${hex}1A`,
    borderColor: hex,
    color: hex,
  }
}

// The Eisenhower quadrant, same as the reference spreadsheet's "Quadrant"
// column, worked out from Urgency + Importance instead of typed by hand.
function quadrant(urgency: string | null, importance: string | null) {
  if (!urgency || !importance) return null
  if (urgency === 'Urgent' && importance === 'Important') return { label: 'Q1 · Do First', color: '#dc2626' }
  if (urgency === 'Not Urgent' && importance === 'Important') return { label: 'Q2 · Schedule', color: '#2563eb' }
  if (urgency === 'Urgent' && importance === 'Not Important') return { label: 'Q3 · Delegate', color: '#f59e0b' }
  return { label: 'Q4 · Eliminate', color: '#9ca3af' }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function daysLeft(dueDate: string) {
  const due = new Date(dueDate + 'T00:00:00')
  const today = new Date(todayISO() + 'T00:00:00')
  return Math.round((due.getTime() - today.getTime()) / 86400000)
}

function startOfWeek(d: Date) {
  const copy = new Date(d)
  const day = copy.getDay()
  copy.setDate(copy.getDate() + (day === 0 ? -6 : 1 - day))
  copy.setHours(0, 0, 0, 0)
  return copy
}

// Shared by the Facilitator and Lead Facilitator dashboards (each person
// manages their own list), and read-only by admin on a specific
// facilitator's tab, via the `facilitatorId` + `readOnly` props - same
// pattern as WeeklyBlockedTime.
export default function TodoList({
  facilitatorId,
  readOnly = false,
}: {
  facilitatorId?: string
  readOnly?: boolean
}) {
  const supabase = createClient()
  const [ownId, setOwnId] = useState<string | null>(null)
  const [todos, setTodos] = useState<TodoRow[]>([])
  const [statuses, setStatuses] = useState<StatusRow[]>([])
  const [loading, setLoading] = useState(true)
  const [noProfile, setNoProfile] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('Active')
  const [sortBy, setSortBy] = useState<'due_date' | 'task_asc' | 'task_desc' | 'priority_rank'>('due_date')
  const [showIconKey, setShowIconKey] = useState(false)
  const [showColours, setShowColours] = useState(false)
  const [newStatusName, setNewStatusName] = useState('')
  const [newStatusColor, setNewStatusColor] = useState('#6b7280')

  const [formTarget, setFormTarget] = useState<string | 'new' | null>(null)
  const emptyForm = {
    category: '',
    task: '',
    assigned_by: '',
    assigned_to: '',
    due_date: '',
    recurring: false,
    frequency: '',
    urgency: '',
    importance: '',
    priority_rank: '',
    status: 'To Do',
    accountability_partner: '',
    resources_needed: '',
  }
  const [form, setForm] = useState(emptyForm)

  const targetId = facilitatorId ?? ownId
  const colorByStatus: Record<string, string> = Object.fromEntries(statuses.map((s) => [s.name, s.color]))
  const statusNames = statuses.map((s) => s.name)
  const FILTERS = ['Active', ...statusNames, 'All']

  const load = useCallback(async () => {
    setLoading(true)
    let id = facilitatorId ?? null

    if (!id) {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        setLoading(false)
        return
      }
      id = userData.user.id
      setOwnId(id)
    }

    const [{ data }, { data: statusData }] = await Promise.all([
      supabase
        .from('facilitator_todos')
        .select(
          'id, category, task, assigned_by, assigned_to, due_date, recurring, frequency, urgency, importance, priority_rank, status, accountability_partner, resources_needed, completed_at, created_at'
        )
        .eq('facilitator_id', id)
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at'),
      supabase.from('todo_statuses').select('id, name, color, sort_order').order('sort_order'),
    ])

    if (!data) {
      setNoProfile(true)
    }
    setTodos(data ?? [])
    setStatuses(statusData ?? [])
    setLoading(false)
  }, [facilitatorId, supabase])

  useEffect(() => {
    load()
  }, [load])

  const stats = useMemo(() => {
    const total = todos.length
    const completed = todos.filter((t) => t.status === 'Done').length
    const inProgress = todos.filter((t) => t.status === 'In Progress').length
    const cancelled = todos.filter((t) => t.status === 'Cancelled').length
    const completionRate = total - cancelled > 0 ? completed / (total - cancelled) : 0

    const now = new Date()
    const weekStart = startOfWeek(now)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    const doneThisWeek = todos.filter(
      (t) => t.completed_at && new Date(t.completed_at) >= weekStart
    ).length
    const doneThisMonth = todos.filter(
      (t) => t.completed_at && new Date(t.completed_at) >= monthStart
    ).length
    const doneLastMonth = todos.filter(
      (t) => t.completed_at && new Date(t.completed_at) >= lastMonthStart && new Date(t.completed_at) < monthStart
    ).length
    const changeVsLastMonth = doneLastMonth > 0 ? (doneThisMonth - doneLastMonth) / doneLastMonth : null

    return { total, completed, inProgress, cancelled, completionRate, doneThisWeek, doneThisMonth, changeVsLastMonth }
  }, [todos])

  const visibleTodos = useMemo(() => {
    const base =
      filter === 'All'
        ? todos
        : filter === 'Active'
        ? todos.filter((t) => t.status !== 'Done' && t.status !== 'Cancelled')
        : todos.filter((t) => t.status === filter)

    const sorted = [...base]
    if (sortBy === 'task_asc') sorted.sort((a, b) => a.task.localeCompare(b.task))
    else if (sortBy === 'task_desc') sorted.sort((a, b) => b.task.localeCompare(a.task))
    else if (sortBy === 'priority_rank')
      sorted.sort((a, b) => (a.priority_rank ?? Infinity) - (b.priority_rank ?? Infinity))
    // 'due_date' is already the order the data loaded in (due date, then created).
    return sorted
  }, [todos, filter, sortBy])

  function startAdd() {
    setFormTarget('new')
    setForm({ ...emptyForm, status: statusNames[0] ?? 'To Do' })
    setError(null)
  }

  function startEdit(t: TodoRow) {
    setFormTarget(t.id)
    setForm({
      category: t.category ?? '',
      task: t.task,
      assigned_by: t.assigned_by ?? '',
      assigned_to: t.assigned_to ?? '',
      due_date: t.due_date ?? '',
      recurring: t.recurring,
      frequency: t.frequency ?? '',
      urgency: t.urgency ?? '',
      importance: t.importance ?? '',
      priority_rank: t.priority_rank != null ? String(t.priority_rank) : '',
      status: t.status,
      accountability_partner: t.accountability_partner ?? '',
      resources_needed: t.resources_needed ?? '',
    })
    setError(null)
  }

  function cancelForm() {
    setFormTarget(null)
    setError(null)
  }

  async function saveForm(e: React.FormEvent) {
    e.preventDefault()
    if (!targetId) return
    if (!form.task.trim()) {
      setError('Please describe the task.')
      return
    }
    setSaving(true)

    const wasDone = formTarget !== 'new' ? todos.find((t) => t.id === formTarget)?.status === 'Done' : false
    const nowDone = form.status === 'Done'
    const completed_at = nowDone && !wasDone ? new Date().toISOString() : nowDone ? undefined : null

    const payload: Record<string, unknown> = {
      category: form.category || null,
      task: form.task.trim(),
      assigned_by: form.assigned_by || null,
      assigned_to: form.assigned_to || null,
      due_date: form.due_date || null,
      recurring: form.recurring,
      frequency: form.recurring ? form.frequency || null : null,
      urgency: form.urgency || null,
      importance: form.importance || null,
      priority_rank: form.priority_rank ? Number(form.priority_rank) : null,
      status: form.status,
      accountability_partner: form.accountability_partner || null,
      resources_needed: form.resources_needed.trim() || null,
    }
    if (completed_at !== undefined) payload.completed_at = completed_at

    if (formTarget === 'new') {
      const { data } = await supabase
        .from('facilitator_todos')
        .insert({ facilitator_id: targetId, ...payload })
        .select()
        .single()
      if (data) setTodos((prev) => [...prev, data])
    } else if (formTarget) {
      await supabase
        .from('facilitator_todos')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', formTarget)
      setTodos((prev) => prev.map((t) => (t.id === formTarget ? { ...t, ...payload, completed_at: completed_at ?? t.completed_at } as TodoRow : t)))
    }

    setSaving(false)
    setFormTarget(null)
  }

  async function deleteTodo(id: string) {
    if (!confirm('Delete this task?')) return
    setTodos((prev) => prev.filter((t) => t.id !== id))
    await supabase.from('facilitator_todos').delete().eq('id', id)
  }

  async function quickSetStatus(t: TodoRow, status: string) {
    const completed_at = status === 'Done' && t.status !== 'Done' ? new Date().toISOString() : status === 'Done' ? t.completed_at : null
    setTodos((prev) => prev.map((row) => (row.id === t.id ? { ...row, status, completed_at } : row)))
    await supabase.from('facilitator_todos').update({ status, completed_at, updated_at: new Date().toISOString() }).eq('id', t.id)
  }

  async function updateStatusColor(id: string, color: string) {
    setStatuses((prev) => prev.map((s) => (s.id === id ? { ...s, color } : s)))
    await supabase.from('todo_statuses').update({ color }).eq('id', id)
  }

  async function renameStatus(id: string, name: string) {
    if (!name.trim()) return
    setStatuses((prev) => prev.map((s) => (s.id === id ? { ...s, name: name.trim() } : s)))
    await supabase.from('todo_statuses').update({ name: name.trim() }).eq('id', id)
  }

  async function addStatus(e: React.FormEvent) {
    e.preventDefault()
    if (!newStatusName.trim()) return
    await supabase.from('todo_statuses').insert({ name: newStatusName.trim(), color: newStatusColor, sort_order: statuses.length })
    setNewStatusName('')
    setNewStatusColor('#6b7280')
    load()
  }

  async function deleteStatus(id: string, name: string) {
    if (!confirm(`Remove "${name}" from the status list? Tasks using it will just show grey until you pick a new status.`)) return
    await supabase.from('todo_statuses').delete().eq('id', id)
    load()
  }

  function renderForm() {
    return (
      <form onSubmit={saveForm} className="mb-4 space-y-3 rounded-xl border border-[#022269] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="w-56">
            <label className="mb-1 block text-xs font-medium text-gray-500">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#022269] focus:outline-none"
            >
              <option value="">—</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[220px]">
            <label className="mb-1 block text-xs font-medium text-gray-500">Task</label>
            <input
              type="text"
              value={form.task}
              onChange={(e) => setForm((f) => ({ ...f, task: e.target.value }))}
              placeholder="What needs to get done?"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#022269] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="w-44">
            <label className="mb-1 block text-xs font-medium text-gray-500">Assigned by</label>
            <select
              value={form.assigned_by}
              onChange={(e) => setForm((f) => ({ ...f, assigned_by: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#022269] focus:outline-none"
            >
              <option value="">—</option>
              {PEOPLE.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="w-44">
            <label className="mb-1 block text-xs font-medium text-gray-500">Assigned to</label>
            <select
              value={form.assigned_to}
              onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#022269] focus:outline-none"
            >
              <option value="">—</option>
              {ASSIGNEES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Due date</label>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#022269] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#022269] focus:outline-none"
            >
              {statuses.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Urgency</label>
            <select
              value={form.urgency}
              onChange={(e) => setForm((f) => ({ ...f, urgency: e.target.value }))}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#022269] focus:outline-none"
            >
              <option value="">—</option>
              {URGENCIES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Importance</label>
            <select
              value={form.importance}
              onChange={(e) => setForm((f) => ({ ...f, importance: e.target.value }))}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#022269] focus:outline-none"
            >
              <option value="">—</option>
              {IMPORTANCES.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Priority rank</label>
            <input
              type="number"
              min={1}
              value={form.priority_rank}
              onChange={(e) => setForm((f) => ({ ...f, priority_rank: e.target.value }))}
              placeholder="e.g. 1"
              className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#022269] focus:outline-none"
            />
          </div>
          {(() => {
            const preview = quadrant(form.urgency || null, form.importance || null)
            return preview ? (
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Quadrant</label>
                <span
                  className="inline-block rounded-full border px-2.5 py-2 text-xs font-semibold uppercase tracking-wide"
                  style={{ borderColor: preview.color, color: preview.color }}
                >
                  {preview.label}
                </span>
              </div>
            ) : null
          })()}
          <label className="flex items-center gap-1.5 pb-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.recurring}
              onChange={(e) => setForm((f) => ({ ...f, recurring: e.target.checked }))}
            />
            Recurring
          </label>
          {form.recurring && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Frequency</label>
              <select
                value={form.frequency}
                onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}
                className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#022269] focus:outline-none"
              >
                <option value="">—</option>
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="w-56">
            <label className="mb-1 block text-xs font-medium text-gray-500">Accountability partner</label>
            <select
              value={form.accountability_partner}
              onChange={(e) => setForm((f) => ({ ...f, accountability_partner: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#022269] focus:outline-none"
            >
              <option value="">—</option>
              {PEOPLE.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[220px]">
            <label className="mb-1 block text-xs font-medium text-gray-500">Resources needed</label>
            <input
              type="text"
              value={form.resources_needed}
              onChange={(e) => setForm((f) => ({ ...f, resources_needed: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#022269] focus:outline-none"
            />
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
            onClick={cancelForm}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    )
  }

  if (loading) return <p className="text-sm text-gray-500">Loading...</p>

  if (noProfile && !readOnly) {
    return (
      <p className="text-sm text-red-600">
        We couldn&apos;t find a login-linked record for you. Please let your admin know.
      </p>
    )
  }

  return (
    <div className="max-w-4xl">
      {/* Stats - same numbers the reference spreadsheet tracked at the top. */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <StatTile label="Total Tasks" value={String(stats.total)} />
        <StatTile label="Completed" value={String(stats.completed)} accent="#16a34a" />
        <StatTile label="In Progress" value={String(stats.inProgress)} accent="#2563eb" />
        <StatTile label="Cancelled" value={String(stats.cancelled)} accent="#6b7280" />
        <StatTile label="Completion Rate" value={`${Math.round(stats.completionRate * 100)}%`} />
        <StatTile label="Done This Week" value={String(stats.doneThisWeek)} />
        <StatTile
          label="Done This Month"
          value={String(stats.doneThisMonth)}
          sub={
            stats.changeVsLastMonth != null
              ? `${stats.changeVsLastMonth >= 0 ? '+' : ''}${Math.round(stats.changeVsLastMonth * 100)}% vs last month`
              : undefined
          }
        />
      </div>

      {!readOnly && (
        <div className="mb-3 flex justify-end">
          <button
            onClick={() => setShowColours((v) => !v)}
            className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:border-gray-400 hover:bg-gray-50"
          >
            <span className="flex -space-x-1">
              {statuses.slice(0, 4).map((s) => (
                <span key={s.id} className="h-3 w-3 rounded-full ring-2 ring-white" style={{ backgroundColor: s.color }} />
              ))}
            </span>
            {showColours ? 'Hide Colours' : 'Edit Colours'}
          </button>
        </div>
      )}

      {showColours && !readOnly && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Status colours</h2>
          <div className="space-y-3">
            {statuses.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-3">
                <input
                  type="color"
                  value={s.color}
                  onChange={(e) => updateStatusColor(s.id, e.target.value)}
                  className="h-9 w-9 cursor-pointer rounded border border-gray-300"
                />
                <input
                  type="text"
                  defaultValue={s.name}
                  onBlur={(e) => renameStatus(s.id, e.target.value)}
                  className="w-40 rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
                <span className="rounded-full border px-2 py-1 text-xs font-medium" style={colorStyle(s.color)}>
                  Preview
                </span>
                <button onClick={() => deleteStatus(s.id, s.name)} className="text-xs font-medium text-red-600 hover:underline">
                  Remove
                </button>
              </div>
            ))}
          </div>
          <form onSubmit={addStatus} className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
            <input
              type="color"
              value={newStatusColor}
              onChange={(e) => setNewStatusColor(e.target.value)}
              className="h-9 w-9 cursor-pointer rounded border border-gray-300"
            />
            <input
              type="text"
              value={newStatusName}
              onChange={(e) => setNewStatusName(e.target.value)}
              placeholder="New status name"
              className="w-40 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
            <button type="submit" className="rounded-md bg-[#022269] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">
              + Add Status
            </button>
          </form>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => {
            const count =
              f === 'All' ? todos.length : f === 'Active' ? todos.filter((t) => t.status !== 'Done' && t.status !== 'Cancelled').length : todos.filter((t) => t.status === f).length
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                  filter === f
                    ? 'bg-[#022269] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f}
                <span className={filter === f ? 'ml-1.5 text-white/70' : 'ml-1.5 text-gray-400'}>{count}</span>
              </button>
            )
          })}
        </div>
        {!readOnly && formTarget !== 'new' && (
          <button
            onClick={startAdd}
            className="flex items-center gap-1.5 rounded-md bg-[#022269] px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90"
          >
            <Icon path="M10 4v12M4 10h12" className="h-4 w-4" />
            Add Task
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-gray-500">
          Sort by
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:border-[#022269] focus:outline-none"
          >
            <option value="due_date">Due date</option>
            <option value="task_asc">Task A → Z</option>
            <option value="task_desc">Task Z → A</option>
            <option value="priority_rank">Priority rank</option>
          </select>
        </label>
        <button
          onClick={() => setShowIconKey((v) => !v)}
          className="flex items-center gap-1 text-xs font-medium text-gray-500 underline hover:text-gray-800"
        >
          {showIconKey ? 'Hide' : 'Show'} icon key
        </button>
      </div>

      {showIconKey && (
        <div className="mb-4 flex flex-wrap gap-x-5 gap-y-1.5 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <Icon path={ICONS.calendar} className="h-3.5 w-3.5 opacity-70" /> Due date
          </span>
          <span className="flex items-center gap-1.5">
            <Icon path={ICONS.arrowRight} className="h-3.5 w-3.5 opacity-70" /> Assigned to
          </span>
          <span className="flex items-center gap-1.5">
            <Icon path={ICONS.user} className="h-3.5 w-3.5 opacity-70" /> Assigned by
          </span>
          <span className="flex items-center gap-1.5">
            <Icon path={ICONS.repeat} className="h-3.5 w-3.5 opacity-70" /> Recurring
          </span>
          <span className="flex items-center gap-1.5">
            <Icon path={ICONS.shield} className="h-3.5 w-3.5 opacity-70" /> Accountability partner
          </span>
          <span className="flex items-center gap-1.5">
            <Icon path={ICONS.box} className="h-3.5 w-3.5 opacity-70" /> Resources needed
          </span>
        </div>
      )}

      {formTarget === 'new' && renderForm()}

      {visibleTodos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-sm font-medium text-gray-400">Nothing here yet.</p>
          <p className="mt-0.5 text-xs text-gray-300">
            {filter === 'Active' ? 'All caught up! Switch tabs to see other tasks.' : 'Add a task to get started.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visibleTodos.map((t) => {
            if (t.id === formTarget) return <div key={t.id}>{renderForm()}</div>

            const q = quadrant(t.urgency, t.importance)
            const dl = t.due_date ? daysLeft(t.due_date) : null
            const overdue = dl != null && dl < 0 && t.status !== 'Done' && t.status !== 'Cancelled'
            const hex = colorByStatus[t.status] ?? DEFAULT_COLOR
            const isDone = t.status === 'Done'
            const isCancelled = t.status === 'Cancelled'

            const chips: { icon: string; label: string; danger?: boolean }[] = []
            if (t.due_date) {
              chips.push({
                icon: ICONS.calendar,
                label: `${t.due_date}${dl != null ? ` · ${overdue ? `${Math.abs(dl)}d overdue` : dl === 0 ? 'due today' : `${dl}d left`}` : ''}`,
                danger: overdue,
              })
            }
            if (t.assigned_to) chips.push({ icon: ICONS.arrowRight, label: t.assigned_to })
            if (t.assigned_by) chips.push({ icon: ICONS.user, label: `from ${t.assigned_by}` })
            if (t.recurring) chips.push({ icon: ICONS.repeat, label: t.frequency || 'Recurring' })
            if (t.accountability_partner) chips.push({ icon: ICONS.shield, label: t.accountability_partner })
            if (t.resources_needed) chips.push({ icon: ICONS.box, label: t.resources_needed })

            // A soft tint of the status colour as the card's background and
            // left accent bar - the whole card reads as that status at a
            // glance, without the text becoming hard to read.
            return (
              <div
                key={t.id}
                className="group relative overflow-hidden rounded-xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-transparent transition-shadow hover:shadow-md"
                style={{ backgroundColor: `${hex}0D` }}
              >
                <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: hex }} />
                <div className="pl-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      {(t.category || q || t.priority_rank != null) && (
                        <div className="mb-1 flex flex-wrap items-center gap-1.5">
                          {t.category && (
                            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-gray-400">{t.category}</span>
                          )}
                          {q && (
                            <span
                              className="rounded-full border px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide"
                              style={{ borderColor: q.color, color: q.color }}
                              title={`Urgency: ${t.urgency} · Importance: ${t.importance}`}
                            >
                              {q.label}
                            </span>
                          )}
                          {t.priority_rank != null && (
                            <span className="rounded-full border border-gray-300 px-1.5 py-0.5 text-[9.5px] font-semibold text-gray-500">
                              #{t.priority_rank}
                            </span>
                          )}
                        </div>
                      )}
                      <p className={`text-[15px] font-semibold leading-snug text-gray-900 ${isCancelled ? 'text-gray-400 line-through' : ''}`}>
                        {t.task}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {readOnly ? (
                        <span
                          className="rounded-full px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-white shadow-sm"
                          style={{ backgroundColor: hex }}
                        >
                          {t.status}
                        </span>
                      ) : (
                        <select
                          value={t.status}
                          onChange={(e) => quickSetStatus(t, e.target.value)}
                          className="cursor-pointer appearance-none rounded-full py-1 pl-2.5 pr-6 text-[10.5px] font-semibold uppercase tracking-wide text-white shadow-sm focus:outline-none"
                          style={{
                            backgroundColor: hex,
                            backgroundImage:
                              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='white'%3E%3Cpath d='M5.5 8l4.5 4.5L14.5 8'/%3E%3C/svg%3E\")",
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 6px center',
                            backgroundSize: '10px',
                          }}
                        >
                          {statuses.map((s) => (
                            <option key={s.id} value={s.name} className="bg-white text-gray-900 normal-case">
                              {s.name}
                            </option>
                          ))}
                        </select>
                      )}
                      {!readOnly && (
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => startEdit(t)}
                            title="Edit"
                            className="rounded-md p-1.5 text-gray-400 hover:bg-white hover:text-[#022269]"
                          >
                            <Icon path={ICONS.pencil} />
                          </button>
                          <button
                            onClick={() => deleteTodo(t.id)}
                            title="Delete"
                            className="rounded-md p-1.5 text-gray-400 hover:bg-white hover:text-red-600"
                          >
                            <Icon path={ICONS.trash} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {chips.length > 0 && !isDone && (
                    <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
                      {chips.map((c, i) => (
                        <span
                          key={i}
                          className={`flex items-center gap-1 text-xs ${c.danger ? 'font-semibold text-red-600' : 'text-gray-500'}`}
                        >
                          <Icon path={c.icon} className="h-3.5 w-3.5 shrink-0 opacity-70" />
                          {c.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {filter !== 'Done' && filter !== 'Cancelled' && (() => {
        const recentlyDone = todos
          .filter((t) => t.status === 'Done')
          .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))
          .slice(0, 5)
        if (recentlyDone.length === 0) return null
        return (
          <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Recently completed
            </h3>
            <div className="space-y-1.5">
              {recentlyDone.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 truncate text-gray-600">
                    <span className="text-green-600">✓</span>
                    <span className="truncate line-through decoration-gray-300">{t.task}</span>
                  </span>
                  <span className="shrink-0 text-xs text-gray-400">
                    {t.completed_at ? new Date(t.completed_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

function StatTile({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold" style={{ color: accent ?? '#022269' }}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[10.5px] text-gray-400">{sub}</p>}
    </div>
  )
}
