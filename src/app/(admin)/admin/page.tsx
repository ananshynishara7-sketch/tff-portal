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

type DayFamilyRow = {
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

type TermFamilyRow = {
  id: string
  name: string
  display_color: string
  participants: number
  present: number
  late: number
  authAbsence: number
  notAuth: number
  ha: number
  hn: number
  attendancePct: number
  punctualityPct: number
}

type LeaveRow = {
  id: string
  participant_name: string
  family_name: string
  request_type: string
  reason: string | null
  status: string
  decided_by_name: string | null
}

const todayISO = () => new Date().toISOString().slice(0, 10)

export default function AdminDashboard() {
  const supabase = createClient()
  const [date, setDate] = useState(todayISO())
  const [loading, setLoading] = useState(true)
  const [totalParticipants, setTotalParticipants] = useState(0)
  const [totalFacilitators, setTotalFacilitators] = useState(0)
  const [dayCounts, setDayCounts] = useState({
    present: 0, late: 0, authAbsence: 0, notAuth: 0, ha: 0, hn: 0, notMarked: 0,
  })
  const [dayFamilyRows, setDayFamilyRows] = useState<DayFamilyRow[]>([])
  const [termFamilyRows, setTermFamilyRows] = useState<TermFamilyRow[]>([])
  const [leaveRows, setLeaveRows] = useState<LeaveRow[]>([])

  const load = useCallback(async () => {
    setLoading(true)

    const [
      { count: participantCount },
      { count: facilitatorCount },
      { data: families },
      { data: participants },
      { data: dayAttendance },
      { data: allAttendance },
      { data: leaveRequests },
    ] = await Promise.all([
      supabase.from('participants').select('*', { count: 'exact', head: true }).eq('status', 'Active'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).in('role', ['facilitator', 'facilitator_support', 'lead_facilitator']),
      supabase.from('families').select('id, name, display_color').order('name'),
      supabase.from('participants').select('id, family_id').eq('status', 'Active'),
      supabase.from('attendance_records').select('participant_id, code').eq('date', date),
      supabase.from('attendance_records').select('participant_id, code'),
      supabase
        .from('leave_requests')
        .select('id, request_type, reason, status, participants(full_name, family_id, families(name)), decided_by:profiles(full_name)')
        .lte('leave_start_date', date)
        .gte('leave_end_date', date),
    ])

    setTotalParticipants(participantCount ?? 0)
    setTotalFacilitators(facilitatorCount ?? 0)

    const familyIdByParticipant: Record<string, string | null> = {}
    for (const p of participants ?? []) familyIdByParticipant[p.id] = p.family_id

    // ---- Selected day ----
    const dayCodeByParticipant: Record<string, string> = {}
    for (const row of dayAttendance ?? []) dayCodeByParticipant[row.participant_id] = row.code

    let present = 0, late = 0, authAbsence = 0, notAuth = 0, ha = 0, hn = 0, notMarked = 0
    const dayRows: DayFamilyRow[] = (families ?? []).map((f) => ({
      id: f.id, name: f.name, display_color: f.display_color,
      total: 0, present: 0, late: 0, authAbsence: 0, notAuth: 0, ha: 0, hn: 0,
    }))
    const dayRowByFamily: Record<string, DayFamilyRow> = Object.fromEntries(dayRows.map((r) => [r.id, r]))

    for (const p of participants ?? []) {
      const code = dayCodeByParticipant[p.id]
      const row = p.family_id ? dayRowByFamily[p.family_id] : undefined
      if (row) row.total += 1
      switch (code) {
        case '/': present++; if (row) row.present++; break
        case 'L': late++; if (row) row.late++; break
        case 'A': authAbsence++; if (row) row.authAbsence++; break
        case 'N': notAuth++; if (row) row.notAuth++; break
        case 'HA': ha++; if (row) row.ha++; break
        case 'HN': hn++; if (row) row.hn++; break
        default: notMarked++
      }
    }
    setDayCounts({ present, late, authAbsence, notAuth, ha, hn, notMarked })
    setDayFamilyRows(dayRows)

    // ---- Whole term to date, per family ----
    const termRows: TermFamilyRow[] = (families ?? []).map((f) => ({
      id: f.id, name: f.name, display_color: f.display_color,
      participants: 0, present: 0, late: 0, authAbsence: 0, notAuth: 0, ha: 0, hn: 0,
      attendancePct: 0, punctualityPct: 0,
    }))
    const termRowByFamily: Record<string, TermFamilyRow> = Object.fromEntries(termRows.map((r) => [r.id, r]))
    for (const row of termRows) {
      row.participants = (participants ?? []).filter((p) => p.family_id === row.id).length
    }

    // attended-equivalent and expected-days counters per family, for %s
    const attendedByFamily: Record<string, number> = {}
    const expectedByFamily: Record<string, number> = {}
    for (const row of termRows) { attendedByFamily[row.id] = 0; expectedByFamily[row.id] = 0 }
    const onTimeByFamily: Record<string, number> = {}
    const presentDaysByFamily: Record<string, number> = {}
    for (const row of termRows) { onTimeByFamily[row.id] = 0; presentDaysByFamily[row.id] = 0 }

    for (const rec of allAttendance ?? []) {
      const familyId = familyIdByParticipant[rec.participant_id]
      const row = familyId ? termRowByFamily[familyId] : undefined
      if (!row) continue

      switch (rec.code) {
        case '/':
          row.present++
          attendedByFamily[row.id] += 1
          expectedByFamily[row.id] += 1
          presentDaysByFamily[row.id] += 1
          onTimeByFamily[row.id] += 1
          break
        case 'L':
          row.late++
          attendedByFamily[row.id] += 1
          expectedByFamily[row.id] += 1
          presentDaysByFamily[row.id] += 1
          break
        case 'A':
          row.authAbsence++
          // approved absence excluded from the expected-days denominator
          break
        case 'N':
          row.notAuth++
          expectedByFamily[row.id] += 1
          break
        case 'HA':
          row.ha++
          attendedByFamily[row.id] += 1
          // approved half-day excluded from denominator, like A
          presentDaysByFamily[row.id] += 1
          onTimeByFamily[row.id] += 1
          break
        case 'HN':
          row.hn++
          attendedByFamily[row.id] += 0.5
          expectedByFamily[row.id] += 1
          presentDaysByFamily[row.id] += 0.5
          break
      }
    }

    for (const row of termRows) {
      const expected = expectedByFamily[row.id]
      const attended = attendedByFamily[row.id]
      row.attendancePct = expected > 0 ? Math.round((attended / expected) * 1000) / 10 : 0
      const presentDays = presentDaysByFamily[row.id]
      row.punctualityPct = presentDays > 0 ? Math.round((onTimeByFamily[row.id] / presentDays) * 1000) / 10 : 0
    }
    setTermFamilyRows(termRows)

    // ---- Leave requests for this day ----
    type LeaveJoinRow = {
      id: string
      request_type: string
      reason: string | null
      status: string
      participants: { full_name: string; families: { name: string } | null } | null
      decided_by: { full_name: string } | null
    }
    const leaves: LeaveRow[] = ((leaveRequests as unknown as LeaveJoinRow[]) ?? []).map((r) => ({
      id: r.id,
      participant_name: r.participants?.full_name ?? 'Unknown',
      family_name: r.participants?.families?.name ?? '—',
      request_type: r.request_type,
      reason: r.reason,
      status: r.status,
      decided_by_name: r.decided_by?.full_name ?? null,
    }))
    setLeaveRows(leaves)

    setLoading(false)
  }, [date, supabase])

  useEffect(() => {
    load()
  }, [load])

  return (
    <DashboardShell roleLabel="Administration" navItems={navItems}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">Attendance Dashboard</h1>
        <div>
          <label className="mr-2 text-sm text-gray-600">Date:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Participants" value={loading ? '—' : String(totalParticipants)} />
        <StatCard label="Total Facilitators" value={loading ? '—' : String(totalFacilitators)} />
        <StatCard label="Present (Selected Day)" value={loading ? '—' : String(dayCounts.present)} />
        <StatCard label="Not Marked Yet" value={loading ? '—' : String(dayCounts.notMarked)} />
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <MiniStat label="Present" value={dayCounts.present} color="text-green-700" />
        <MiniStat label="Late" value={dayCounts.late} color="text-yellow-700" />
        <MiniStat label="Auth. Absence" value={dayCounts.authAbsence} color="text-blue-700" />
        <MiniStat label="Not Auth." value={dayCounts.notAuth} color="text-red-700" />
        <MiniStat label="Half Day (App.)" value={dayCounts.ha} color="text-purple-700" />
        <MiniStat label="Half Day (Not App.)" value={dayCounts.hn} color="text-orange-700" />
      </div>

      <h2 className="mb-3 text-lg font-semibold text-gray-900">By Group — Selected Day</h2>
      <div className="mb-8 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
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
            {dayFamilyRows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 font-medium" style={{ color: row.display_color }}>{row.name}</td>
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

      <h2 className="mb-3 text-lg font-semibold text-gray-900">Whole Term to Date</h2>
      <div className="mb-8 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
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
              <th className="px-4 py-3">Attendance %</th>
              <th className="px-4 py-3">Punctuality %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {termFamilyRows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 font-medium" style={{ color: row.display_color }}>{row.name}</td>
                <td className="px-4 py-3">{row.participants}</td>
                <td className="px-4 py-3">{row.present}</td>
                <td className="px-4 py-3">{row.late}</td>
                <td className="px-4 py-3">{row.authAbsence}</td>
                <td className="px-4 py-3">{row.notAuth}</td>
                <td className="px-4 py-3">{row.ha}</td>
                <td className="px-4 py-3">{row.hn}</td>
                <td className="px-4 py-3 font-medium">{row.attendancePct}%</td>
                <td className="px-4 py-3 font-medium">{row.punctualityPct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-gray-100 px-4 py-2 text-xs text-gray-400">
          First-pass formula (present + late + half-day-not-approved count toward attendance; approved
          absence/half-day excluded from the total). Let me know if a number looks off against the Sheet
          and I&apos;ll adjust the exact rule.
        </p>
      </div>

      <h2 className="mb-3 text-lg font-semibold text-gray-900">Leave Requests — Selected Day</h2>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Group</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Decided By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leaveRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  No leave requests for this day.
                </td>
              </tr>
            ) : (
              leaveRows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{r.participant_name}</td>
                  <td className="px-4 py-3">{r.family_name}</td>
                  <td className="px-4 py-3">{r.request_type}</td>
                  <td className="px-4 py-3">{r.reason ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        r.status === 'Approved'
                          ? 'bg-green-50 text-green-700'
                          : r.status === 'Declined'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-yellow-50 text-yellow-700'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{r.decided_by_name ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
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
