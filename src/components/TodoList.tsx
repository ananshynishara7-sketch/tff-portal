'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type TodoRow = {
  id: string
  category: string | null
  task: string
  assigned_by: string | null
  due_date: string | null
  recurring: boolean
  frequency: string | null
  urgency: string | null
  importance: string | null
  status: string
  accountability_partner: string | null
  resources_needed: string | null
  completed_at: string | null
  created_at: string
}

const STATUSES = ['To Do', 'In Progress', 'Done', 'Cancelled']
const URGENCIES = ['Urgent', 'Not Urgent']
const IMPORTANCES = ['Important', 'Not Important']

const FILTERS = ['Active', 'To Do', 'In Progress', 'Done', 'Cancelled', 'All'] as const
type Filter = (typeof FILTERS)[number]

const statusStyle: Record<string, string> = {
  'To Do': 'border-gray-300 bg-gray-100 text-gray-600',
  'In Progress': 'border-blue-200 bg-blue-50 text-blue-700',
  Done: 'border-green-200 bg-green-50 text-green-700',
  Cancelled: 'border-gray-200 bg-gray-50 text-gray-400 line-through',
}

// The Eisenhower quadrant, same as the reference spreadsheet's "Quadrant"
// column, worked out from Urgency + Importance instead of typed by hand.
function quadrant(urgency: string | null, importance: string | null) {
  if (!urgency || !importance) return null
  if (urgency === 'Urgent' && importance === 'Important') return { label: 'Do First', color: '#dc2626' }
  if (urgency === 'Not Urgent' && importance === 'Important') return { label: 'Schedule', color: '#2563eb' }
  if (urgency === 'Urgent' && importance === 'Not Important') return { label: 'Delegate', color: '#f59e0b' }
  return { label: 'Eliminate', color: '#9ca3af' }
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
  const [loading, setLoading] = useState(true)
  const [noProfile, setNoProfile] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('Active')

  const [formTarget, setFormTarget] = useState<string | 'new' | null>(null)
  const emptyForm = {
    category: '',
    task: '',
    assigned_by: '',
    due_date: '',
    recurring: false,
    frequency: '',
    urgency: '',
    importance: '',
    status: 'To Do',
    accountability_partner: '',
    resources_needed: '',
  }
  const [form, setForm] = useState(emptyForm)

  const targetId = facilitatorId ?? ownId

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

    const { data } = await supabase
      .from('facilitator_todos')
      .select(
        'id, category, task, assigned_by, due_date, recurring, frequency, urgency, importance, status, accountability_partner, resources_needed, completed_at, created_at'
      )
      .eq('facilitator_id', id)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at')

    if (!data) {
      setNoProfile(true)
    }
    setTodos(data ?? [])
    setLoading(false)
  }, [facilitatorId, supabase])

  useEffect(() => {
    load()
  }, [load])

  const categorySuggestions = useMemo(
    () => Array.from(new Set(todos.map((t) => t.category).filter((c): c is string => !!c))),
    [todos]
  )

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
    if (filter === 'All') return todos
    if (filter === 'Active') return todos.filter((t) => t.status === 'To Do' || t.status === 'In Progress')
    return todos.filter((t) => t.status === filter)
  }, [todos, filter])

  function startAdd() {
    setFormTarget('new')
    setForm(emptyForm)
    setError(null)
  }

  function startEdit(t: TodoRow) {
    setFormTarget(t.id)
    setForm({
      category: t.category ?? '',
      task: t.task,
      assigned_by: t.assigned_by ?? '',
      due_date: t.due_date ?? '',
      recurring: t.recurring,
      frequency: t.frequency ?? '',
      urgency: t.urgency ?? '',
      importance: t.importance ?? '',
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
      category: form.category.trim() || null,
      task: form.task.trim(),
      assigned_by: form.assigned_by.trim() || null,
      due_date: form.due_date || null,
      recurring: form.recurring,
      frequency: form.recurring ? form.frequency.trim() || null : null,
      urgency: form.urgency || null,
      importance: form.importance || null,
      status: form.status,
      accountability_partner: form.accountability_partner.trim() || null,
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

  function renderForm() {
    return (
      <form onSubmit={saveForm} className="mb-4 space-y-3 rounded-xl border border-[#022269] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="w-56">
            <label className="mb-1 block text-xs font-medium text-gray-500">Category</label>
            <input
              type="text"
              list="todo-categories"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="e.g. Participants"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#022269] focus:outline-none"
            />
            <datalist id="todo-categories">
              {categorySuggestions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
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
          <div className="w-48">
            <label className="mb-1 block text-xs font-medium text-gray-500">Assigned by</label>
            <input
              type="text"
              value={form.assigned_by}
              onChange={(e) => setForm((f) => ({ ...f, assigned_by: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#022269] focus:outline-none"
            />
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
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
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
              <input
                type="text"
                value={form.frequency}
                onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}
                placeholder="e.g. Weekly"
                className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#022269] focus:outline-none"
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="w-56">
            <label className="mb-1 block text-xs font-medium text-gray-500">Accountability partner</label>
            <input
              type="text"
              value={form.accountability_partner}
              onChange={(e) => setForm((f) => ({ ...f, accountability_partner: e.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#022269] focus:outline-none"
            />
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
    <div>
      {/* Stats - same numbers the reference spreadsheet tracked at the top. */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <StatTile label="Total Tasks" value={String(stats.total)} />
        <StatTile label="Completed" value={String(stats.completed)} />
        <StatTile label="In Progress" value={String(stats.inProgress)} />
        <StatTile label="Cancelled" value={String(stats.cancelled)} />
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

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                filter === f
                  ? 'border-[#022269] bg-[#022269] text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        {!readOnly && formTarget !== 'new' && (
          <button
            onClick={startAdd}
            className="rounded-md bg-[#022269] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            + Add Task
          </button>
        )}
      </div>

      {formTarget === 'new' && renderForm()}

      {visibleTodos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
          Nothing here.
        </div>
      ) : (
        <div className="space-y-2">
          {visibleTodos.map((t) => {
            if (t.id === formTarget) return <div key={t.id}>{renderForm()}</div>

            const q = quadrant(t.urgency, t.importance)
            const dl = t.due_date ? daysLeft(t.due_date) : null
            const overdue = dl != null && dl < 0 && t.status !== 'Done' && t.status !== 'Cancelled'

            const meta = [
              t.due_date && `Due ${t.due_date}${dl != null ? ` (${overdue ? `${Math.abs(dl)}d overdue` : dl === 0 ? 'today' : `${dl}d left`})` : ''}`,
              t.assigned_by && `Assigned by ${t.assigned_by}`,
              t.recurring && `Recurring${t.frequency ? ` · ${t.frequency}` : ''}`,
              t.accountability_partner && `Accountability: ${t.accountability_partner}`,
              t.resources_needed && `Needs: ${t.resources_needed}`,
            ].filter(Boolean)

            return (
              <div
                key={t.id}
                className={`rounded-lg border bg-white p-3 shadow-sm ${overdue ? 'border-red-300' : 'border-gray-200'}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {t.category && (
                      <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                        {t.category}
                      </span>
                    )}
                    <span className={`text-sm font-medium ${t.status === 'Cancelled' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {t.task}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {q && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
                        style={{ backgroundColor: q.color }}
                      >
                        {q.label}
                      </span>
                    )}
                    {readOnly ? (
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusStyle[t.status] ?? ''}`}>
                        {t.status}
                      </span>
                    ) : (
                      <select
                        value={t.status}
                        onChange={(e) => quickSetStatus(t, e.target.value)}
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusStyle[t.status] ?? ''}`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
                {meta.length > 0 && (
                  <p className={`mt-1 text-xs ${overdue ? 'font-medium text-red-600' : 'text-gray-500'}`}>{meta.join(' · ')}</p>
                )}
                {!readOnly && (
                  <div className="mt-2 flex gap-3">
                    <button onClick={() => startEdit(t)} className="text-xs font-medium underline text-gray-500 hover:text-gray-800">
                      Edit
                    </button>
                    <button onClick={() => deleteTodo(t.id)} className="text-xs font-medium underline text-gray-500 hover:text-red-600">
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="mt-0.5 text-xl font-semibold text-[#022269]">{value}</p>
      {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
    </div>
  )
}
