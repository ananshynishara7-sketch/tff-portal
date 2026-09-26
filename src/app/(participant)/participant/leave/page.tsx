'use client'

import { useCallback, useEffect, useState } from 'react'
import DashboardShell from '@/components/DashboardShell'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { label: 'Dashboard', href: '/participant' },
  { label: 'My Masterplan Phase 3', href: '/participant/timetable' },
  { label: 'My Attendance', href: '/participant/attendance' },
  { label: 'Leave Requests', href: '/participant/leave' },
  { label: 'Announcements', href: '/participant/announcements' },
  { label: 'My Profile', href: '/participant/profile' },
]

const REQUEST_TYPES = ['Half Day AM', 'Half Day PM', 'Full Day', 'Late'] as const

type LeaveRequest = {
  id: string
  request_type: string
  reason: string | null
  details: string | null
  leave_start_date: string
  leave_end_date: string
  status: string
  created_at: string
}

export default function ParticipantLeavePage() {
  const supabase = createClient()
  const [participantId, setParticipantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [requestType, setRequestType] = useState<(typeof REQUEST_TYPES)[number]>('Full Day')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setLoading(false)
      return
    }

    const { data: participant } = await supabase
      .from('participants')
      .select('id')
      .eq('profile_id', userData.user.id)
      .maybeSingle()

    if (!participant) {
      setLoading(false)
      return
    }
    setParticipantId(participant.id)

    const { data: reqs } = await supabase
      .from('leave_requests')
      .select('id, request_type, reason, details, leave_start_date, leave_end_date, status, created_at')
      .eq('participant_id', participant.id)
      .order('created_at', { ascending: false })

    setRequests(reqs ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!participantId) {
      setError(
        "We couldn't find your participant record linked to this login. Please tell your admin."
      )
      return
    }
    if (endDate < startDate) {
      setError('The end date has to be on or after the start date.')
      return
    }

    setSubmitting(true)
    const { error: insertError } = await supabase.from('leave_requests').insert({
      participant_id: participantId,
      request_type: requestType,
      reason: reason.trim() || null,
      details: details.trim() || null,
      leave_start_date: startDate,
      leave_end_date: endDate,
      status: 'Pending',
    })

    if (insertError) {
      setError('Something went wrong sending your request. Please try again.')
      setSubmitting(false)
      return
    }

    setReason('')
    setDetails('')
    setSuccess(true)
    setSubmitting(false)
    load()
  }

  return (
    <DashboardShell roleLabel="Participant" navItems={navItems}>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Leave Requests</h1>

      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Submit a new request</h2>

        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : !participantId ? (
          <p className="text-sm text-red-600">
            We couldn&apos;t find a participant record linked to your login. Please let your admin know.
          </p>
        ) : (
          <form onSubmit={submitRequest} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Type of leave</label>
              <select
                value={requestType}
                onChange={(e) => setRequestType(e.target.value as (typeof REQUEST_TYPES)[number])}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#022269] focus:outline-none sm:w-64"
              >
                {REQUEST_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">From</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#022269] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">To</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#022269] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Reason</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Not feeling well"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#022269] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                More details (optional)
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#022269] focus:outline-none"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-green-600">Your request has been sent.</p>}

            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-[#022269] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? 'Sending...' : 'Send Request'}
            </button>
          </form>
        )}
      </div>

      <h2 className="mb-3 text-lg font-semibold text-gray-900">Your requests</h2>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {requests.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  You haven&apos;t sent any leave requests yet.
                </td>
              </tr>
            ) : (
              requests.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{r.request_type}</td>
                  <td className="px-4 py-3">
                    {r.leave_start_date === r.leave_end_date
                      ? r.leave_start_date
                      : `${r.leave_start_date} – ${r.leave_end_date}`}
                  </td>
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  )
}
