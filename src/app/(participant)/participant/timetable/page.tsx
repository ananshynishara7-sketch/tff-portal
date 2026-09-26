'use client'

import { useCallback, useEffect, useState } from 'react'
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

type SessionRow = {
  id: string
  title: string
  date: string
  start_time: string
  end_time: string
  facilitator_name: string | null
}

const todayISO = () => new Date().toISOString().slice(0, 10)

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

    // Sessions that apply to everyone (no family set) or to this
    // participant's own family, from today onward.
    const orFilter = participant.family_id
      ? `family_id.is.null,family_id.eq.${participant.family_id}`
      : 'family_id.is.null'

    const { data } = await supabase
      .from('sessions')
      .select('id, title, date, start_time, end_time, facilitator:profiles(full_name)')
      .gte('date', todayISO())
      .or(orFilter)
      .order('date')
      .order('start_time')

    type JoinRow = {
      id: string
      title: string
      date: string
      start_time: string
      end_time: string
      facilitator: { full_name: string } | null
    }
    const rows: SessionRow[] = ((data as unknown as JoinRow[]) ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      date: s.date,
      start_time: s.start_time,
      end_time: s.end_time,
      facilitator_name: s.facilitator?.full_name ?? null,
    }))
    setSessions(rows)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  return (
    <DashboardShell roleLabel="Participant" navItems={navItems}>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">My Timetable</h1>

      {noParticipant ? (
        <p className="text-sm text-red-600">
          We couldn&apos;t find a participant record linked to your login. Please let your admin know.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Session</th>
                <th className="px-4 py-3">Facilitator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                    No upcoming sessions yet.
                  </td>
                </tr>
              ) : (
                sessions.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3">{s.date}</td>
                    <td className="px-4 py-3">
                      {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{s.title}</td>
                    <td className="px-4 py-3">{s.facilitator_name ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  )
}
