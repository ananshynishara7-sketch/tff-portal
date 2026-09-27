'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type SlotRow = {
  id: string
  day_of_week: number
  start_time: string
  priority: string | null
  task: string
}

type PriorityRow = { id: string; name: string; color: string; sort_order: number }

const DAYS = [
  { num: 1, label: 'Monday' },
  { num: 2, label: 'Tuesday' },
  { num: 3, label: 'Wednesday' },
  { num: 4, label: 'Thursday' },
  { num: 5, label: 'Friday' },
]

const DEFAULT_COLOR = '#9ca3af'

// Turns a picked hex colour into a light-background / coloured-border /
// coloured-text card style, same trick the Masterplan uses for its groups.
function colorStyle(hex: string) {
  return {
    backgroundColor: `${hex}1A`,
    borderColor: hex,
    color: hex,
  }
}

// Shared by the Facilitator and Lead Facilitator dashboards (each person
// edits only their own weekly plan), and read-only by admin on a specific
// facilitator's tab, via the `facilitatorId` + `readOnly` props.
export default function WeeklyBlockedTime({
  facilitatorId,
  readOnly = false,
}: {
  facilitatorId?: string
  readOnly?: boolean
}) {
  const supabase = createClient()
  const [ownId, setOwnId] = useState<string | null>(null)
  const [slots, setSlots] = useState<SlotRow[]>([])
  const [priorities, setPriorities] = useState<PriorityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [noProfile, setNoProfile] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showColours, setShowColours] = useState(false)
  const [newPriorityName, setNewPriorityName] = useState('')
  const [newPriorityColor, setNewPriorityColor] = useState('#6b7280')

  // formTarget identifies what the open form is editing: an existing slot's
  // id, or 'new' for the add-a-task form. formDay is which day column it
  // belongs to, so the form can sit right next to that day's list.
  const [formTarget, setFormTarget] = useState<string | 'new' | null>(null)
  const [formDay, setFormDay] = useState<number | null>(null)
  const emptyForm = { start_time: '09:00', priority: '', task: '' }
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

    const [{ data: slotData }, { data: priorityData }] = await Promise.all([
      supabase
        .from('weekly_blocked_time')
        .select('id, day_of_week, start_time, priority, task')
        .eq('facilitator_id', id)
        .order('day_of_week')
        .order('start_time'),
      supabase.from('blocked_time_priorities').select('id, name, color, sort_order').order('sort_order'),
    ])

    if (!slotData) {
      setNoProfile(true)
    }
    setSlots(slotData ?? [])
    setPriorities(priorityData ?? [])
    setLoading(false)
  }, [facilitatorId, supabase])

  useEffect(() => {
    load()
  }, [load])

  const byDay = useMemo(() => {
    const map: Record<number, SlotRow[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] }
    for (const s of slots) map[s.day_of_week]?.push(s)
    return map
  }, [slots])

  const colorByName: Record<string, string> = Object.fromEntries(priorities.map((p) => [p.name, p.color]))

  function startAdd(day: number) {
    setFormTarget('new')
    setFormDay(day)
    setForm(emptyForm)
    setError(null)
  }

  function startEdit(s: SlotRow) {
    setFormTarget(s.id)
    setFormDay(s.day_of_week)
    setForm({ start_time: s.start_time.slice(0, 5), priority: s.priority ?? '', task: s.task })
    setError(null)
  }

  function cancelForm() {
    setFormTarget(null)
    setFormDay(null)
    setError(null)
  }

  async function saveForm(e: React.FormEvent) {
    e.preventDefault()
    if (!targetId || formDay == null) return
    if (!form.task.trim()) {
      setError('Please describe the task.')
      return
    }
    setSaving(true)
    const payload = {
      day_of_week: formDay,
      start_time: form.start_time,
      priority: form.priority || null,
      task: form.task.trim(),
    }

    if (formTarget === 'new') {
      const { data } = await supabase
        .from('weekly_blocked_time')
        .insert({ facilitator_id: targetId, ...payload })
        .select()
        .single()
      if (data) setSlots((prev) => [...prev, data])
    } else if (formTarget) {
      await supabase
        .from('weekly_blocked_time')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', formTarget)
      setSlots((prev) => prev.map((s) => (s.id === formTarget ? { ...s, ...payload } : s)))
    }

    setSaving(false)
    setFormTarget(null)
    setFormDay(null)
  }

  async function deleteSlot(id: string) {
    setSlots((prev) => prev.filter((s) => s.id !== id))
    await supabase.from('weekly_blocked_time').delete().eq('id', id)
  }

  async function updatePriorityColor(id: string, color: string) {
    setPriorities((prev) => prev.map((p) => (p.id === id ? { ...p, color } : p)))
    await supabase.from('blocked_time_priorities').update({ color }).eq('id', id)
  }

  async function renamePriority(id: string, name: string) {
    if (!name.trim()) return
    setPriorities((prev) => prev.map((p) => (p.id === id ? { ...p, name: name.trim() } : p)))
    await supabase.from('blocked_time_priorities').update({ name: name.trim() }).eq('id', id)
  }

  async function addPriority(e: React.FormEvent) {
    e.preventDefault()
    if (!newPriorityName.trim()) return
    await supabase
      .from('blocked_time_priorities')
      .insert({ name: newPriorityName.trim(), color: newPriorityColor, sort_order: priorities.length })
    setNewPriorityName('')
    setNewPriorityColor('#6b7280')
    load()
  }

  async function deletePriority(id: string, name: string) {
    if (
      !confirm(
        `Remove "${name}" from the priority list? Tasks already using it will just show grey until you pick a new priority for them.`
      )
    )
      return
    await supabase.from('blocked_time_priorities').delete().eq('id', id)
    load()
  }

  // The Add/Edit task form - normal-sized, stacked fields, shown wherever
  // a day's "+ Add" or a task's "Edit" was clicked, instead of squeezing
  // tiny inputs into a narrow column.
  function renderTaskForm() {
    return (
      <form onSubmit={saveForm} className="space-y-2 rounded-lg border border-[#022269] bg-white p-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Time</label>
          <input
            type="time"
            value={form.start_time}
            onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#022269] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Priority</label>
          <select
            value={form.priority}
            onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#022269] focus:outline-none"
          >
            <option value="">No priority</option>
            {priorities.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Task</label>
          <input
            type="text"
            value={form.task}
            onChange={(e) => setForm((f) => ({ ...f, task: e.target.value }))}
            placeholder="What are you working on?"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#022269] focus:outline-none"
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-md bg-[#022269] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={cancelForm}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
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
      {!readOnly && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setShowColours((v) => !v)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {showColours ? 'Hide Colours' : 'Edit Colours'}
          </button>
        </div>
      )}

      {showColours && !readOnly && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Priority colours</h2>
          <div className="space-y-3">
            {priorities.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3">
                <input
                  type="color"
                  value={p.color}
                  onChange={(e) => updatePriorityColor(p.id, e.target.value)}
                  className="h-9 w-9 cursor-pointer rounded border border-gray-300"
                />
                <input
                  type="text"
                  defaultValue={p.name}
                  onBlur={(e) => renamePriority(p.id, e.target.value)}
                  className="w-40 rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
                <span className="rounded-full border px-2 py-1 text-xs font-medium" style={colorStyle(p.color)}>
                  Preview
                </span>
                <button
                  onClick={() => deletePriority(p.id, p.name)}
                  className="text-xs font-medium text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={addPriority} className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
            <input
              type="color"
              value={newPriorityColor}
              onChange={(e) => setNewPriorityColor(e.target.value)}
              className="h-9 w-9 cursor-pointer rounded border border-gray-300"
            />
            <input
              type="text"
              value={newPriorityName}
              onChange={(e) => setNewPriorityName(e.target.value)}
              placeholder="New priority name"
              className="w-40 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
            <button
              type="submit"
              className="rounded-md bg-[#022269] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
            >
              + Add Priority
            </button>
          </form>
        </div>
      )}

      {/* Each day gets a wider, fixed-width column with room to type in,
          scrolling horizontally on narrow screens instead of squeezing. */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {DAYS.map((day) => (
          <div key={day.num} className="w-72 shrink-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">{day.label}</h3>
            <div className="space-y-2">
              {byDay[day.num].length === 0 && formTarget !== 'new' && (
                <p className="text-xs text-gray-400">Nothing planned.</p>
              )}
              {byDay[day.num].map((s) => {
                if (s.id === formTarget) {
                  return <div key={s.id}>{renderTaskForm()}</div>
                }
                const hex = s.priority ? colorByName[s.priority] ?? DEFAULT_COLOR : DEFAULT_COLOR
                return (
                  <div key={s.id} className="rounded-lg border p-3" style={colorStyle(hex)}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{s.start_time.slice(0, 5)}</span>
                      {s.priority && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
                          style={{ backgroundColor: hex }}
                        >
                          {s.priority}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm leading-snug text-gray-700">{s.task}</p>
                    {!readOnly && (
                      <div className="mt-2 flex gap-3">
                        <button
                          onClick={() => startEdit(s)}
                          className="text-xs font-medium underline opacity-80 hover:opacity-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteSlot(s.id)}
                          className="text-xs font-medium underline opacity-80 hover:opacity-100"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
              {formTarget === 'new' && formDay === day.num && <div>{renderTaskForm()}</div>}
            </div>

            {!readOnly && !(formTarget === 'new' && formDay === day.num) && (
              <button
                onClick={() => startAdd(day.num)}
                className="mt-2 w-full rounded-lg border border-dashed border-gray-300 py-2 text-sm text-gray-500 hover:bg-gray-50"
              >
                + Add
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
