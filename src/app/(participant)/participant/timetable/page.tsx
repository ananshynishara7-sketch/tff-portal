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

const GROUP_STYLE: Record<string, { badge: string; dot: string }> = {
  Spartans: { badge: 'bg-red-100 text-red-800 border-red-300', dot: 'bg-red-500' },
  Thebans: { badge: 'bg-blue-100 text-blue-800 border-blue-300', dot: 'bg-blue-500' },
  Athenians: { badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', dot: 'bg-emerald-500' },
}
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

export default function ParticipantTimetablePage() {
  const supabase = createClient()
  const [sessions, setSessions] = useState<SessionRow[]>([])
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

    const { data } = await supabase
      .from('sessions')
      .select('id, title, date, start_time, end_time, group_name, facilitator_name')
      .gte('date', todayISO())
      .order('date')
      .order('start_time')

    setSessions(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  const byDate = useMemo(() => {
    const groups: { date: string; rows: SessionRow[] }[] = []
    for (const s of sessions) {
      const last = groups[groups.length - 1]
      if (last && last.date === s.date) last.rows.push(s)
      else groups.push({ date: s.date, rows: [s] })
    }
    return groups
  }, [sessions])

  return (
    <DashboardShell roleLabel="Participant" navItems={navItems}>
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">My Timetable</h1>
      <p className="mb-6 text-sm text-gray-500">
        Look for your own group&apos;s colour in each time slot.
      </p>

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
                  const style = s.group_name ? GROUP_STYLE[s.group_name] ?? EVERYONE_STYLE : EVERYONE_STYLE
                  return (
                    <div
                      key={s.id}
                      className={`flex flex-wrap items-center gap-3 rounded-lg border p-3 shadow-sm ${style.badge}`}
                    >
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} />
                      <span className="w-24 shrink-0 text-xs font-medium opacity-80">
                        {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                      </span>
                      <div>
                        <p className="font-medium">{s.title}</p>
                        <p className="text-xs opacity-80">
                          {s.group_name ?? 'Everyone'}
                          {s.facilitator_name ? ` · ${s.facilitator_name}` : ''}
                        </p>
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
