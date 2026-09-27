'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import DashboardShell from '@/components/DashboardShell'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Participants', href: '/admin/participants' },
  { label: 'Facilitators', href: '/admin/facilitators' },
  { label: 'Attendance', href: '/admin/attendance' },
  { label: 'Leave Requests', href: '/admin/leave-requests' },
  { label: 'Masterplan Phase 3', href: '/admin/timetable' },
  { label: 'Announcements', href: '/admin/announcements' },
  { label: 'Families', href: '/admin/groups' },
  { label: 'Settings', href: '/admin/settings' },
]

type Family = { id: string; name: string; display_color: string }

type ParticipantRow = {
  id: string
  full_name: string
  status: string
  selectedDayCode: string | null
  totalPresent: number
  authAbsence: number
  notAuth: number
  late: number
  attendancePct: number
  punctualityPct: number
}

type LeaveRow = {
  id: string
  participant_name: string
  request_type: string
  reason: string | null
  status: string
  decided_by_name: string | null
}

const todayISO = () => new Date().toISOString().slice(0, 10)

export default function FamilyAttendancePage() {
  const params = useParams()
  const familyId = params.id as string
  const supabase = createClient()

  const [date, setDate] = useState(todayISO())
  const [loading, setLoading] = useState(true)
  const [family, setFamily] = useState<Family | null>(null)
  const [rows, setRows] = useState<ParticipantRow[]>([])
  const [leaveRows, setLeaveRows] = useState<LeaveRow[]>([])
  const [onLeaveCount, setOnLeaveCount] = useState(0)

  const [dayTotals, setDayTotals] = useState({
    present: 0, late: 0, authAbsence: 0, notAuth: 0, ha: 0, hn: 0,
  })
  const [termTotals, setTermTotals] = useState({ attendancePct: 0, punctualityPct: 0 })

  const load = useCallback(async () => {
    if (!familyId) return
    setLoading(true)

    const [
      { data: familyData },
      { data: participants },
      { count: onLeaveActiveCount },
      { data: allAttendance },
      { data: leaveRequests },
    ] = await Promise.all([
      supabase.from('families').select('*').eq('id', familyId).single(),
      // Only Active participants show in this family's attendance record -
      // On Leave / Left / Deceased people are excluded from here entirely.
      supabase
        .from('participants')
        .select('id, full_name, status')
        .eq('family_id', familyId)
        .eq('status', 'Active')
        .order('full_name'),
      supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('family_id', familyId)
        .eq('status', 'On Leave'),
      supabase.from('attendance_records').select('participant_id, date, code'),
      supabase
        .from('leave_requests')
        .select('id, request_type, reason, status, participant_id, decided_by:profiles(full_name)')
        .lte('leave_start_date', date)
        .gte('leave_end_date', date),
    ])

    setFamily(familyData ?? null)

    const participantList = participants ?? []
    setOnLeaveCount(onLeaveActiveCount ?? 0)

    // Raw day counts per participant. Two different formulas are built from
    // these, matching the register's own two formulas exactly:
    //   - each participant's own row: a half-day approved (HA) still costs a
    //     full day in the "expected" total
    //   - the family-wide totals box: HA only costs half a day there instead
    // Punctuality never involves half days at all in either place - it's
    // always just present / (present + late).
    const byParticipant: Record<string, {
      present: number; late: number; authAbsence: number; notAuth: number; ha: number; hn: number
    }> = {}
    for (const p of participantList) {
      byParticipant[p.id] = { present: 0, late: 0, authAbsence: 0, notAuth: 0, ha: 0, hn: 0 }
    }
    const selectedDayCode: Record<string, string> = {}

    for (const rec of allAttendance ?? []) {
      const bucket = byParticipant[rec.participant_id]
      if (!bucket) continue
      if (rec.date === date) selectedDayCode[rec.participant_id] = rec.code

      switch (rec.code) {
        case '/': bucket.present++; break
        case 'L': bucket.late++; break
        case 'A': bucket.authAbsence++; break
        case 'N': bucket.notAuth++; break
        case 'HA': bucket.ha++; break
        case 'HN': bucket.hn++; break
      }
    }

    const rowsOut: ParticipantRow[] = participantList.map((p) => {
      const b = byParticipant[p.id]
      const attended = b.present + b.late + 0.5 * b.ha + 0.5 * b.hn
      const expectedRow = b.present + b.late + b.notAuth + b.ha + b.hn // HA full weight on a participant's own row
      return {
        id: p.id,
        full_name: p.full_name,
        status: p.status,
        selectedDayCode: selectedDayCode[p.id] ?? null,
        totalPresent: attended,
        authAbsence: b.authAbsence,
        notAuth: b.notAuth,
        late: b.late,
        attendancePct: expectedRow > 0 ? Math.round((attended / expectedRow) * 1000) / 10 : 0,
        punctualityPct: b.present + b.late > 0 ? Math.round((b.present / (b.present + b.late)) * 1000) / 10 : 0,
      }
    })
    setRows(rowsOut)

    // Family-wide term totals: add up attended/expected across all participants
    // (HA only costs half a day here, matching the family box's own formula)
    let sumAttended = 0, sumExpectedAgg = 0, sumPresent = 0, sumPresentLate = 0
    for (const b of Object.values(byParticipant)) {
      sumAttended += b.present + b.late + 0.5 * b.ha + 0.5 * b.hn
      sumExpectedAgg += b.present + b.late + b.notAuth + 0.5 * b.ha + b.hn
      sumPresent += b.present
      sumPresentLate += b.present + b.late
    }
    setTermTotals({
      attendancePct: sumExpectedAgg > 0 ? Math.round((sumAttended / sumExpectedAgg) * 1000) / 10 : 0,
      punctualityPct: sumPresentLate > 0 ? Math.round((sumPresent / sumPresentLate) * 1000) / 10 : 0,
    })

    // Selected-day totals for this family
    let present = 0, late = 0, authAbsence = 0, notAuth = 0, ha = 0, hn = 0
    for (const p of participantList) {
      switch (selectedDayCode[p.id]) {
        case '/': present++; break
        case 'L': late++; break
        case 'A': authAbsence++; break
        case 'N': notAuth++; break
        case 'HA': ha++; break
        case 'HN': hn++; break
      }
    }
    setDayTotals({ present, late, authAbsence, notAuth, ha, hn })

    // Leave requests for this family, this day
    type LeaveJoinRow = {
      id: string
      request_type: string
      reason: string | null
      status: string
      participant_id: string
      decided_by: { full_name: string } | null
    }
    const familyParticipantIds = new Set(participantList.map((p) => p.id))
    const leaves: LeaveRow[] = ((leaveRequests as unknown as LeaveJoinRow[]) ?? [])
      .filter((r) => familyParticipantIds.has(r.participant_id))
      .map((r) => ({
        id: r.id,
        participant_name: participantList.find((p) => p.id === r.participant_id)?.full_name ?? 'Unknown',
        request_type: r.request_type,
        reason: r.reason,
        status: r.status,
        decided_by_name: r.decided_by?.full_name ?? null,
      }))
    setLeaveRows(leaves)

    setLoading(false)
  }, [familyId, date, supabase])

  useEffect(() => {
    load()
  }, [load])

  return (
    <DashboardShell roleLabel="Administration" navItems={navItems}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold" style={{ color: family?.display_color ?? '#022269' }}>
          {loading ? 'Loading...' : family?.name ?? 'Family not found'}
        </h1>
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

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase text-gray-500">Since the Start of the Phase</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MiniStat label="Participants" value={rows.length} />
            <MiniStat label="On Leave" value={onLeaveCount} />
            <MiniStat label="Attendance %" value={`${termTotals.attendancePct}%`} />
            <MiniStat label="Punctuality %" value={`${termTotals.punctualityPct}%`} />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase text-gray-500">On the Selected Day</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            <MiniStat label="Present" value={dayTotals.present} small />
            <MiniStat label="Late" value={dayTotals.late} small />
            <MiniStat label="Auth Absence" value={dayTotals.authAbsence} small />
            <MiniStat label="Not Auth" value={dayTotals.notAuth} small />
            <MiniStat label="HA" value={dayTotals.ha} small />
            <MiniStat label="HN" value={dayTotals.hn} small />
          </div>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-semibold text-gray-900">
        {family?.name ?? 'Family'} Attendance Record
      </h2>
      <div className="mb-8 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">No</th>
              <th className="px-4 py-3">First Name</th>
              <th className="px-4 py-3">Selected Day</th>
              <th className="px-4 py-3">Total Present</th>
              <th className="px-4 py-3">Auth Absence</th>
              <th className="px-4 py-3">Not Auth</th>
              <th className="px-4 py-3">Late (L)</th>
              <th className="px-4 py-3">Attendance %</th>
              <th className="px-4 py-3">Punctuality %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                <td className="px-4 py-2 font-medium text-gray-900">{r.full_name}</td>
                <td className="px-4 py-2">{r.selectedDayCode ?? '—'}</td>
                <td className="px-4 py-2">{r.totalPresent}</td>
                <td className="px-4 py-2">{r.authAbsence}</td>
                <td className="px-4 py-2">{r.notAuth}</td>
                <td className="px-4 py-2">{r.late}</td>
                <td
                  className={`px-4 py-2 font-medium ${r.attendancePct < 90 ? 'bg-red-50 text-red-700' : ''}`}
                >
                  {r.attendancePct}%
                </td>
                <td
                  className={`px-4 py-2 font-medium ${r.punctualityPct < 90 ? 'bg-red-50 text-red-700' : ''}`}
                >
                  {r.punctualityPct}%
                </td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  No active participants in this family.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 text-lg font-semibold text-gray-900">Leave Requests for This Day</h2>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Decided By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leaveRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  No leave requests for this day.
                </td>
              </tr>
            ) : (
              leaveRows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{r.participant_name}</td>
                  <td className="px-4 py-3">{r.request_type}</td>
                  <td className="px-4 py-3">{r.reason ?? '—'}</td>
                  <td className="px-4 py-3">{r.status}</td>
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

function MiniStat({ label, value, small }: { label: string; value: number | string; small?: boolean }) {
  return (
    <div className="text-center">
      <p className={`font-semibold text-[#022269] ${small ? 'text-lg' : 'text-2xl'}`}>{value}</p>
      <p className="mt-0.5 text-xs text-gray-500">{label}</p>
    </div>
  )
}
