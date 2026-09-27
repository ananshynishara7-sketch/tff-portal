'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
  participant_id: string
  participant_name: string
  request_type: string
  reason: string | null
  status: string
  decided_by_name: string | null
}

const CODES = [
  { value: '/', label: 'Present' },
  { value: 'A', label: 'Auth Absence' },
  { value: 'N', label: 'Not Auth' },
  { value: 'L', label: 'Late' },
  { value: 'HA', label: 'Half Day (Approved)' },
  { value: 'HN', label: 'Half Day (Not Approved)' },
]

const todayISO = () => new Date().toISOString().slice(0, 10)

// What each leave request writes into the attendance register when acted on
// - same mapping used on the admin Leave Requests page.
function codeFor(requestType: string, decision: 'Approved' | 'Declined'): string | null {
  if (requestType === 'Full Day') return decision === 'Approved' ? 'A' : 'N'
  if (requestType === 'Half Day AM' || requestType === 'Half Day PM') {
    return decision === 'Approved' ? 'HA' : 'HN'
  }
  if (requestType === 'Late') return decision === 'Approved' ? 'L' : null
  return null
}

function datesBetween(start: string, end: string): string[] {
  const dates: string[] = []
  const cur = new Date(start + 'T00:00:00Z')
  const last = new Date(end + 'T00:00:00Z')
  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return dates
}

export default function FamilyAttendanceRecord({ familyId }: { familyId: string }) {
  const supabase = createClient()
  const [date, setDate] = useState(todayISO())
  const [loading, setLoading] = useState(true)
  const [family, setFamily] = useState<Family | null>(null)
  const [rows, setRows] = useState<ParticipantRow[]>([])
  const [leaveRows, setLeaveRows] = useState<LeaveRow[]>([])
  const [onLeaveCount, setOnLeaveCount] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [actingLeaveId, setActingLeaveId] = useState<string | null>(null)

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
      const expectedRow = b.present + b.late + b.notAuth + b.ha + b.hn
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
        participant_id: r.participant_id,
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

  async function setCode(participantId: string, code: string) {
    setSavingId(participantId)
    const { data: userData } = await supabase.auth.getUser()
    await supabase.from('attendance_records').upsert(
      {
        participant_id: participantId,
        date,
        code,
        marked_by: userData.user?.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'participant_id,date' }
    )
    setSavingId(null)
    setEditingId(null)
    load()
  }

  async function decideLeave(row: LeaveRow, decision: 'Approved' | 'Declined') {
    setActingLeaveId(row.id)
    const { data: userData } = await supabase.auth.getUser()

    // Look up the full request to get its date range (not carried on LeaveRow).
    const { data: fullRequest } = await supabase
      .from('leave_requests')
      .select('leave_start_date, leave_end_date, request_type')
      .eq('id', row.id)
      .single()

    if (fullRequest) {
      const code = codeFor(fullRequest.request_type, decision)
      if (code) {
        const dates = datesBetween(fullRequest.leave_start_date, fullRequest.leave_end_date)
        const records = dates.map((d) => ({
          participant_id: row.participant_id,
          date: d,
          code,
          marked_by: userData.user?.id,
          updated_at: new Date().toISOString(),
        }))
        await supabase.from('attendance_records').upsert(records, { onConflict: 'participant_id,date' })
      }
    }

    await supabase
      .from('leave_requests')
      .update({ status: decision, decided_by: userData.user?.id, decision_date: new Date().toISOString() })
      .eq('id', row.id)

    setActingLeaveId(null)
    load()
  }

  return (
    <div>
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
      <p className="mb-2 text-xs text-gray-400">
        Click a code in &quot;Selected Day&quot; to mark or change that participant&apos;s attendance for the date above - for example, authorise an absence.
      </p>
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
                <td className="px-4 py-2">
                  {editingId === r.id ? (
                    <select
                      autoFocus
                      value={r.selectedDayCode ?? ''}
                      disabled={savingId === r.id}
                      onChange={(e) => setCode(r.id, e.target.value)}
                      onBlur={() => setEditingId(null)}
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                    >
                      <option value="" disabled>Pick...</option>
                      {CODES.map((c) => (
                        <option key={c.value} value={c.value}>{c.value} - {c.label}</option>
                      ))}
                    </select>
                  ) : (
                    <button
                      onClick={() => setEditingId(r.id)}
                      className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:border-[#022269] hover:text-[#022269]"
                      title="Click to mark or authorise attendance"
                    >
                      {r.selectedDayCode ?? '— set'}
                    </button>
                  )}
                </td>
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
              <th className="px-4 py-3">Action</th>
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
                  <td className="px-4 py-3">
                    {r.status === 'Pending' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => decideLeave(r, 'Approved')}
                          disabled={actingLeaveId === r.id}
                          className="rounded-md border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => decideLeave(r, 'Declined')}
                          disabled={actingLeaveId === r.id}
                          className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                        >
                          Decline
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
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
