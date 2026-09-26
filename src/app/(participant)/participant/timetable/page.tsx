'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import DashboardShell from '@/components/DashboardShell'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { label: 'Dashboard', href: '/participant' },
  { label: 'My Timetable', href: '/participant/timetable' },
  { label: 'My Attendance', href: '/participant/attendance' },
  { label: 'Leave Requests', href: '/participant/leave' },
  { label: 'Announcements', href: '/participant/announcements' },
  { label: 'My Profile', href: '/participant/profile' },
]

type TimetableGroup = { id: string; name: string; color: string; sort_order: number }

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
}

const todayISO = () => new Date().toISOString().slice(0, 10)
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function colorStyle(hex: string) {
  return {
    backgroundColor: `${hex}1A`,
    borderColor: hex,
    color: hex,
  }
}

export default function ParticipantTimetablePage() {
  const supabase = createClient()
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [groups, setGroups] = useState<TimetableGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [noParticipant, setNoParticipant] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setLoading(false)
      return
    }

    const { data: participant } = await supabase
      .from('participants')
      .select('id, family_id')
      .eq('profile_id', userData.user.id)
      .maybeSingle()

    if (!participant) {
      setNoParticipant(true)
      setLoading(false)
      return
    }

    const [{ data }, { data: groupData }] = await Promise.all([
      supabase
        .from('sessions')
        .select('id, title, date, start_time, end_time, group_name, facilitator_name, co_facilitator_name, color')
        .gte('date', todayISO())
        .order('date')
        .order('start_time'),
      supabase.from('timetable_groups').select('id, name, color, sort_order').order('sort_order'),
    ])

    setSessions(data ?? [])
    setGroups(groupData ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  const colorByName: Record<string, string> = Object.fromEntries(groups.map((g) => [g.name, g.color]))
  const everyoneColor = groups.find((g) => g.name === 'Everyone')?.color ?? '#6b7280'

  const byDate = useMemo(() => {
    const result: { date: string; rows: SessionRow[] }[] = []
    for (const s of sessions) {
      const last = result[result.length - 1]
      if (last && last.date === s.date) last.rows.push(s)
      else result.push({ date: s.date, rows: [s] })
    }
    return result
  }, [sessions])

  return (
    <DashboardShell roleLabel="Participant" navItems={navItems}>
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">My Timetable</h1>
      <p className="mb-6 text-sm text-gray-500">
        Look for your own group&apos;s colour in each time slot.
      </p>

      {!noParticipant && groups.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <span>Groups:</span>
          {groups.map((g) => (
            <span key={g.id} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g.color }} />
              {g.name}
            </span>
          ))}
        </div>
      )}

      {noParticipant ? (
        <p className="text-sm text-red-600">
          We couldn&apos;t find a participant record linked to your login. Please let your admin know.
        </p>
      ) : loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : byDate.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
          No upcoming sessions yet.
        </div>
      ) : (
        <div className="space-y-8">
          {byDate.map((day) => (
            <div key={day.date}>
              <h2 className="mb-3 text-base font-semibold text-gray-900">
                {dayNames[new Date(day.date + 'T00:00:00Z').getUTCDay()]}, {day.date}
              </h2>
              <div className="space-y-2">
                {day.rows.map((s) => {
                  const hex = s.color || (s.group_name ? colorByName[s.group_name] ?? everyoneColor : everyoneColor)
                  return (
                    <div
                      key={s.id}
                      className="flex flex-wrap items-center gap-3 rounded-lg border p-3 shadow-sm"
                      style={colorStyle(hex)}
                    >
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: hex }} />
                      <span className="w-24 shrink-0 text-xs font-medium opacity-80">
                        {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                      </span>
                      <div>
                        <p className="font-medium">{s.title}</p>
                        {(() => {
                          const parts = [
                            s.group_name,
                            s.facilitator_name,
                            s.co_facilitator_name ? `+ ${s.co_facilitator_name}` : null,
                          ].filter(Boolean)
                          return parts.length > 0 ? (
                            <p className="text-xs opacity-80">{parts.join(' · ')}</p>
                          ) : null
                        })()}
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
