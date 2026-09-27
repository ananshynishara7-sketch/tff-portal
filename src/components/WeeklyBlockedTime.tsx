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

const DAYS = [
  { num: 1, label: 'Monday' },
  { num: 2, label: 'Tuesday' },
  { num: 3, label: 'Wednesday' },
  { num: 4, label: 'Thursday' },
  { num: 5, label: 'Friday' },
]

const PRIORITIES = ['Very High', 'High', 'Med', 'Low']

const priorityStyle: Record<string, string> = {
  'Very High': 'border-red-200 bg-red-50 text-red-700',
  High: 'border-orange-200 bg-orange-50 text-orange-700',
  Med: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  Low: 'border-gray-200 bg-gray-50 text-gray-500',
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
  const [loading, setLoading] = useState(true)
  const [noProfile, setNoProfile] = useState(false)
  const [addingDay, setAddingDay] = useState<number | null>(null)
  const [newTime, setNewTime] = useState('09:00')
  const [newPriority, setNewPriority] = useState('')
  const [newTask, setNewTask] = useState('')
  const [saving, setSaving] = useState(false)

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
      .from('weekly_blocked_time')
      .select('id, day_of_week, start_time, priority, task')
      .eq('facilitator_id', id)
      .order('day_of_week')
      .order('start_time')

    if (!data) {
      setNoProfile(true)
    }
    setSlots(data ?? [])
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

  async function updateField(id: string, field: 'start_time' | 'priority' | 'task', value: string) {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value || null } : s)))
    await supabase
      .from('weekly_blocked_time')
      .update({ [field]: value || null, updated_at: new Date().toISOString() })
      .eq('id', id)
  }

  async function deleteSlot(id: string) {
    setSlots((prev) => prev.filter((s) => s.id !== id))
    await supabase.from('weekly_blocked_time').delete().eq('id', id)
  }

  async function addSlot(day: number) {
    if (!targetId || !newTask.trim()) return
    setSaving(true)
    const { data } = await supabase
      .from('weekly_blocked_time')
      .insert({
        facilitator_id: targetId,
        day_of_week: day,
        start_time: newTime,
        priority: newPriority || null,
        task: newTask.trim(),
      })
      .select()
      .single()
    if (data) setSlots((prev) => [...prev, data])
    setNewTime('09:00')
    setNewPriority('')
    setNewTask('')
    setAddingDay(null)
    setSaving(false)
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
    <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
      {DAYS.map((day) => (
        <div key={day.num} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-gray-900">{day.label}</h3>
          <div className="space-y-2">
            {byDay[day.num].length === 0 && (
              <p className="text-xs text-gray-400">Nothing planned.</p>
            )}
            {byDay[day.num].map((s) => (
              <div key={s.id} className="rounded-lg border border-gray-100 bg-gray-50 p-2 text-xs">
                {readOnly ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">{s.start_time.slice(0, 5)}</span>
                      {s.priority && (
                        <span className={`rounded-full border px-1.5 py-0.5 ${priorityStyle[s.priority] ?? ''}`}>
                          {s.priority}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-gray-600">{s.task}</p>
                  </>
                ) : (
                  <>
                    <div className="mb-1 flex items-center gap-1">
                      <input
                        type="time"
                        defaultValue={s.start_time.slice(0, 5)}
                        onBlur={(e) => updateField(s.id, 'start_time', e.target.value)}
                        className="w-20 rounded border border-transparent bg-white px-1 py-0.5 text-[11px] hover:border-gray-200 focus:border-[#022269] focus:outline-none"
                      />
                      <select
                        value={s.priority ?? ''}
                        onChange={(e) => updateField(s.id, 'priority', e.target.value)}
                        className="flex-1 rounded border border-transparent bg-white px-1 py-0.5 text-[11px] hover:border-gray-200 focus:border-[#022269] focus:outline-none"
                      >
                        <option value="">—</option>
                        {PRIORITIES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => deleteSlot(s.id)}
                        className="text-gray-400 hover:text-red-600"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                    <input
                      type="text"
                      defaultValue={s.task}
                      onBlur={(e) => updateField(s.id, 'task', e.target.value)}
                      className="w-full rounded border border-transparent bg-white px-1 py-0.5 text-xs hover:border-gray-200 focus:border-[#022269] focus:outline-none"
                    />
                  </>
                )}
              </div>
            ))}
          </div>

          {!readOnly && (
            <>
              {addingDay === day.num ? (
                <div className="mt-2 space-y-1 rounded-lg border border-gray-200 p-2">
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full rounded border border-gray-300 px-1 py-1 text-xs"
                  />
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full rounded border border-gray-300 px-1 py-1 text-xs"
                  >
                    <option value="">No priority</option>
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    placeholder="Task"
                    className="w-full rounded border border-gray-300 px-1 py-1 text-xs"
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={() => addSlot(day.num)}
                      disabled={saving}
                      className="flex-1 rounded bg-[#022269] px-2 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setAddingDay(null)}
                      className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setAddingDay(day.num)
                    setNewTime('09:00')
                    setNewPriority('')
                    setNewTask('')
                  }}
                  className="mt-2 w-full rounded-lg border border-dashed border-gray-300 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
                >
                  + Add
                </button>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  )
}
