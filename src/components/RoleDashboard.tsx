'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Announcements from '@/components/Announcements'

type Family = { id: string; name: string; display_color: string }
type Participant = { id: string; full_name: string }
type TodoRow = { id: string; task: string; due_date: string | null; status: string }

const CODE_LABELS: Record<string, { label: string; color: string }> = {
  '/': { label: 'Present', color: '#16a34a' },
  A: { label: 'Approved Absence', color: '#2563eb' },
  N: { label: 'Not Authorised', color: '#dc2626' },
  L: { label: 'Late', color: '#ca8a04' },
  HA: { label: 'Half Day (Approved)', color: '#9333ea' },
  HN: { label: 'Half Day (Not Approved)', color: '#ea580c' },
}

function defaultAttendanceDate() {
  const d = new Date()
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function daysLeftLabel(dueDate: string) {
  const diff = Math.round((new Date(dueDate + 'T00:00:00').getTime() - new Date(todayISO() + 'T00:00:00').getTime()) / 86400000)
  if (diff < 0) return { text: `${Math.abs(diff)}d overdue`, color: '#dc2626' }
  if (diff === 0) return { text: 'Due today', color: '#dc2626' }
  if (diff === 1) return { text: 'Due tomorrow', color: '#ea580c' }
  return { text: `Due in ${diff}d`, color: '#6b7280' }
}

export default function RoleDashboard({ todoHref }: { todoHref: string }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [family, setFamily] = useState<Family | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [attendanceCounts, setAttendanceCounts] = useState<Record<string, number>>({})
  const [attendanceDate, setAttendanceDate] = useState('')
  const [urgentTodos, setUrgentTodos] = useState<TodoRow[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user?.id
      if (!uid) {
        setLoading(false)
        return
      }

      const { data: familyData } = await supabase
        .from('families')
        .select('id, name, display_color')
        .eq('lead_facilitator_id', uid)
        .maybeSingle()

      if (familyData && !cancelled) {
        setFamily(familyData)
        const { data: participantsData } = await supabase
          .from('participants')
          .select('id, full_name')
          .eq('family_id', familyData.id)
          .eq('status', 'Active')
          .order('full_name')
        const list = participantsData ?? []
        setParticipants(list)

        const date = defaultAttendanceDate()
        setAttendanceDate(date)
        if (list.length > 0) {
          const { data: attendanceData } = await supabase
            .from('attendance_records')
            .select('code')
            .eq('date', date)
            .in('participant_id', list.map((p) => p.id))
          const counts: Record<string, number> = {}
          for (const row of attendanceData ?? []) {
            counts[row.code] = (counts[row.code] ?? 0) + 1
          }
          if (!cancelled) setAttendanceCounts(counts)
        }
      }

      const { data: todosData } = await supabase
        .from('facilitator_todos')
        .select('id, task, due_date, status')
        .eq('facilitator_id', uid)
        .eq('urgency', 'Urgent')
        .not('status', 'in', '("Done","Cancelled")')
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true })
        .limit(5)

      if (!cancelled) {
        setUrgentTodos(todosData ?? [])
        setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [supabase])

  if (loading) return <p className="text-sm text-gray-400">Loading...</p>

  const markedCount = Object.values(attendanceCounts).reduce((a, b) => a + b, 0)

  return (
    <div className="flex flex-col gap-6">
      {family && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">
              <span
                className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
                style={{ backgroundColor: family.display_color }}
              />
              {family.name} — Attendance
            </h2>
            <span className="text-xs text-gray-400">
              {new Date(attendanceDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
              {' · '}
              {markedCount}/{participants.length} marked
            </span>
          </div>
          {participants.length === 0 ? (
            <p className="text-sm text-gray-400">No participants in this family yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {Object.entries(CODE_LABELS).map(([code, meta]) => (
                <span
                  key={code}
                  className="rounded-full border px-2.5 py-1 text-xs font-medium"
                  style={{ borderColor: meta.color, color: meta.color, backgroundColor: `${meta.color}0D` }}
                >
                  {meta.label}: {attendanceCounts[code] ?? 0}
                </span>
              ))}
              {markedCount < participants.length && (
                <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-500">
                  Not yet marked: {participants.length - markedCount}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Urgent tasks approaching deadline</h2>
            <Link href={todoHref} className="text-xs font-medium text-[#022269] hover:underline">
              View all
            </Link>
          </div>
          {urgentTodos.length === 0 ? (
            <p className="text-sm text-gray-400">Nothing urgent on your list right now.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {urgentTodos.map((t) => {
                const d = daysLeftLabel(t.due_date as string)
                return (
                  <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2">
                    <span className="truncate text-sm text-gray-800">{t.task}</span>
                    <span className="shrink-0 text-xs font-semibold" style={{ color: d.color }}>
                      {d.text}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Latest announcements</h2>
          <Announcements limit={4} />
        </div>
      </div>
    </div>
  )
}
