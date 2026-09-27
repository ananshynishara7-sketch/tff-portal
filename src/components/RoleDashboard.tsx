'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Announcements from '@/components/Announcements'
import FamilyAttendanceRecord from '@/components/FamilyAttendanceRecord'

type Family = { id: string; name: string; display_color: string }
type TodoRow = { id: string; task: string; due_date: string | null; status: string }

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

      if (familyData && !cancelled) setFamily(familyData)

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

  return (
    <div className="flex flex-col gap-8">
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

      {family && (
        <div>
          <FamilyAttendanceRecord familyId={family.id} />
        </div>
      )}
    </div>
  )
}
