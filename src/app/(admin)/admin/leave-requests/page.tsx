'use client'

import { useCallback, useEffect, useState } from 'react'
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
  { label: 'Assessments', href: '/admin/assessments' },
  { label: 'Families', href: '/admin/groups' },
  { label: 'Settings', href: '/admin/settings' },
]

type LeaveRow = {
  id: string
  participant_id: string
  participant_name: string
  family_name: string
  request_type: string
  reason: string | null
  details: string | null
  leave_start_date: string
  leave_end_date: string
  status: string
  decided_by_name: string | null
  created_at: string
}

// What each request type writes into the attendance register when acted on.
// Approving a Full Day marks it an approved absence; declining marks it
// unauthorised. Half days work the same way but half-weighted. A Late
// request only has an "approve" side - it just confirms the /L already
// makes sense; declining one doesn't have a matching attendance code, so
// it's left for the admin to mark by hand on the Attendance page.
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

export default function AdminLeaveRequestsPage() {
  const supabase = createClient()
  const [statusFilter, setStatusFilter] = useState<'Pending' | 'Approved' | 'Declined' | 'all'>(
    'Pending'
  )
  const [rows, setRows] = useState<LeaveRow[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('leave_requests')
      .select(
        'id, participant_id, request_type, reason, details, leave_start_date, leave_end_date, status, created_at, participants(full_name, families(name)), decided_by:profiles(full_name)'
      )
      .order('created_at', { ascending: false })

    if (statusFilter !== 'all') query = query.eq('status', statusFilter)

    const { data } = await query

    type JoinRow = {
      id: string
      participant_id: string
      request_type: string
      reason: string | null
      details: string | null
      leave_start_date: string
      leave_end_date: string
      status: string
      created_at: string
      participants: { full_name: string; families: { name: string } | null } | null
      decided_by: { full_name: string } | null
    }

    const mapped: LeaveRow[] = ((data as unknown as JoinRow[]) ?? []).map((r) => ({
      id: r.id,
      participant_id: r.participant_id,
      participant_name: r.participants?.full_name ?? 'Unknown',
      family_name: r.participants?.families?.name ?? '—',
      request_type: r.request_type,
      reason: r.reason,
      details: r.details,
      leave_start_date: r.leave_start_date,
      leave_end_date: r.leave_end_date,
      status: r.status,
      decided_by_name: r.decided_by?.full_name ?? null,
      created_at: r.created_at,
    }))
    setRows(mapped)
    setLoading(false)
  }, [statusFilter, supabase])

  useEffect(() => {
    load()
  }, [load])

  async function decide(row: LeaveRow, decision: 'Approved' | 'Declined') {
    setActingId(row.id)
    const { data: userData } = await supabase.auth.getUser()

    const code = codeFor(row.request_type, decision)
    if (code) {
      const dates = datesBetween(row.leave_start_date, row.leave_end_date)
      const records = dates.map((date) => ({
        participant_id: row.participant_id,
        date,
        code,
        marked_by: userData.user?.id,
        updated_at: new Date().toISOString(),
      }))
      await supabase.from('attendance_records').upsert(records, { onConflict: 'participant_id,date' })
    }

    await supabase
      .from('leave_requests')
      .update({
        status: decision,
        decided_by: userData.user?.id,
        decision_date: new Date().toISOString(),
      })
      .eq('id', row.id)

    setActingId(null)
    load()
  }

  return (
    <DashboardShell roleLabel="Participants Attendance Dashboard" navItems={navItems}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">Leave Requests</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Declined">Declined</option>
          <option value="all">All</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Family</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Decided By</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                  Nothing here.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{r.participant_name}</td>
                  <td className="px-4 py-3">{r.family_name}</td>
                  <td className="px-4 py-3">{r.request_type}</td>
                  <td className="px-4 py-3">
                    {r.leave_start_date === r.leave_end_date
                      ? r.leave_start_date
                      : `${r.leave_start_date} – ${r.leave_end_date}`}
                  </td>
                  <td className="px-4 py-3">
                    {r.reason ?? '—'}
                    {r.details ? (
                      <span className="block text-xs text-gray-400">{r.details}</span>
                    ) : null}
                  </td>
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
                          onClick={() => decide(r, 'Approved')}
                          disabled={actingId === r.id}
                          className="rounded-md border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => decide(r, 'Declined')}
                          disabled={actingId === r.id}
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
        <p className="border-t border-gray-100 px-4 py-2 text-xs text-gray-400">
          Approving or declining a Full Day or Half Day request automatically marks attendance for
          those dates. Late requests only auto-mark on Approve — a decline needs a manual mark on
          the Attendance page.
        </p>
      </div>
    </DashboardShell>
  )
}
