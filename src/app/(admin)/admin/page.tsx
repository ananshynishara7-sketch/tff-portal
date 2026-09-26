'use client'

import { useEffect, useState, useCallback } from 'react'
import DashboardShell from '@/components/DashboardShell'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Participants', href: '/admin/participants' },
  { label: 'Facilitators', href: '/admin/facilitators' },
  { label: 'Attendance', href: '/admin/attendance' },
  { label: 'Timetable', href: '/admin/timetable' },
  { label: 'Announcements', href: '/admin/announcements' },
  { label: 'Groups', href: '/admin/groups' },
  { label: 'Settings', href: '/admin/settings' },
]

type FamilyRow = {
  id: string
  name: string
  display_color: string
  total: number
  present: number
  late: number
  authAbsence: number
  notAuth: number
  ha: number
  hn: number
}

const todayISO = () => new Date().toISOString().slice(0, 10)

export default function AdminDashboard() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [totalParticipants, setTotalParticipants] = useState(0)
  const [totalFacilitators, setTotalFacilitators] = useState(0)
  const [todayCounts, setTodayCounts] = useState({
    present: 0,
    late: 0,
    authAbsence: 0,
    notAuth: 0,
    ha: 0,
    hn: 0,
    notMarked: 0,
  })
  const [familyRows, setFamilyRows] = useState<FamilyRow[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    const today = todayISO()

    const [{ count: participantCount }, { count: facilitatorCount }, { data: families }, { data: participants }, { data: todayAttendance }] =
      await Promise.all([
        supabase.from('participants').select('*', { count: 'exact', head: true }).eq('status', 'Active'),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .in('role', ['facilitator', 'facilitator_support', 'lead_facilitator']),
        supabase.from('families').select('id, name, display_color').order('name'),
        supabase.from('participants').select('id, family_id').eq('status', 'Active'),
        supabase.from('attendance_records').select('participant_id, code').eq('date', today),
      ])

    setTotalParticipants(participantCount ?? 0)
    setTotalFacilitators(facilitatorCount ?? 0)

    const codeByParticipant: Record<string, string> = {}
    for (const row of todayAttendance ?? []) {
      codeByParticipant[row.participant_id] = row.code
    }

    let present = 0, late = 0, authAbsence = 0, notAuth = 0, ha = 0, hn = 0, notMarked = 0

    const rows: FamilyRow[] = (families ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      display_color: f.display_color,
      total: 0,
      present: 0,
      late: 0,
      authAbsence: 0,
      notAuth: 0,
      ha: 0,
      hn: 0,
    }))
    const rowByFamily: Record<string, FamilyRow> = Object.fromEntries(rows.map((r) => [r.id, r]))

    for (const p of participants ?? []) {
      const code = codeByParticipant[p.id]
      const row = p.family_id ? rowByFamily[p.family_id] : undefined
      if (row) row.total += 1

      switch (code) {
        case '/':
          present++
          if (row) row.present++
          break
        case 'L':
          late++
          if (row) row.late++
          break
        case 'A':
          authAbsence++
          if (row) row.authAbsence++
          break
        case 'N':
          notAuth++
          if (row) row.notAuth++
          break
        case 'HA':
          ha++
          if (row) row.ha++
          break
        case 'HN':
          hn++
          if (row) row.hn++
          break
        default:
          notMarked++
      }
    }

    setTodayCounts({ present, late, authAbsence, notAuth, ha, hn, notMarked })
    setFamilyRows(rows)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  return (
    <DashboardShell roleLabel="Administration" navItems={navItems}>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Dashboard</h1>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Participants" value={loading ? '—' : String(totalParticipants)} />
        <StatCard label="Total Facilitators" value={loading ? '—' : String(totalFacilitators)} />
        <StatCard
          label="Present Today"
          value={loading ? '—' : String(todayCounts.present)}
        />
        <StatCard
          label="Not Marked Yet"
          value={loading ? '—' : String(todayCounts.notMarked)}
        />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <MiniStat label="Present" value={todayCounts.present} color="text-green-700" />
        <MiniStat label="Late" value={todayCounts.late} color="text-yellow-700" />
        <MiniStat label="Auth. Absence" value={todayCounts.authAbsence} color="text-blue-700" />
        <MiniStat label="Not Auth." value={todayCounts.notAuth} color="text-red-700" />
        <MiniStat label="Half Day (App.)" value={todayCounts.ha} color="text-purple-700" />
        <MiniStat label="Half Day (Not App.)" value={todayCounts.hn} color="text-orange-700" />
      </div>

      <h2 className="mb-3 text-lg font-semibold text-gray-900">By Group — Today</h2>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Group</th>
              <th className="px-4 py-3">Participants</th>
              <th className="px-4 py-3">Present</th>
              <th className="px-4 py-3">Late</th>
              <th className="px-4 py-3">Auth. Absence</th>
              <th className="px-4 py-3">Not Auth.</th>
              <th className="px-4 py-3">HA</th>
              <th className="px-4 py-3">HN</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {familyRows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 font-medium" style={{ color: row.display_color }}>
                  {row.name}
                </td>
                <td className="px-4 py-3">{row.total}</td>
                <td className="px-4 py-3">{row.present}</td>
                <td className="px-4 py-3">{row.late}</td>
                <td className="px-4 py-3">{row.authAbsence}</td>
                <td className="px-4 py-3">{row.notAuth}</td>
                <td className="px-4 py-3">{row.ha}</td>
                <td className="px-4 py-3">{row.hn}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Showing today ({todayISO()}). Numbers update as attendance is marked on the Attendance page.
      </p>
    </DashboardShell>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-[#022269]">{value}</p>
    </div>
  )
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 text-center shadow-sm">
      <p className={`text-xl font-semibold ${color}`}>{value}</p>
      <p className="mt-0.5 text-xs text-gray-500">{label}</p>
    </div>
  )
}
