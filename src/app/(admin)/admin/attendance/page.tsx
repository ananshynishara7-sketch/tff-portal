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
  { label: 'Families', href: '/admin/groups' },
  { label: 'Settings', href: '/admin/settings' },
]

// The exact codes from the existing paper/Sheets register.
const CODES = [
  { value: '/', label: 'Present', color: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'A', label: 'Approved Absence', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'N', label: 'Not Authorised', color: 'bg-red-100 text-red-800 border-red-300' },
  { value: 'L', label: 'Late', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'HA', label: 'Half Day (Approved)', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  { value: 'HN', label: 'Half Day (Not Approved)', color: 'bg-orange-100 text-orange-800 border-orange-300' },
] as const

type Participant = { id: string; full_name: string }
type AttendanceMap = Record<string, string> // participant_id -> code

export default function AdminAttendancePage() {
  const supabase = createClient()
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [participants, setParticipants] = useState<Participant[]>([])
  const [attendance, setAttendance] = useState<AttendanceMap>({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [addingParticipant, setAddingParticipant] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)

    const { data: participantsData } = await supabase
      .from('participants')
      .select('id, full_name')
      .eq('status', 'Active')
      .order('full_name')

    const { data: attendanceData } = await supabase
      .from('attendance_records')
      .select('participant_id, code')
      .eq('date', date)

    setParticipants(participantsData ?? [])

    const map: AttendanceMap = {}
    for (const row of attendanceData ?? []) {
      map[row.participant_id] = row.code
    }
    setAttendance(map)
    setLoading(false)
  }, [date, supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function markAttendance(participantId: string, code: string) {
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

    setAttendance((prev) => ({ ...prev, [participantId]: code }))
    setSavingId(null)
  }

  async function addParticipant(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setAddingParticipant(true)

    await supabase.from('participants').insert({ full_name: newName.trim() })
    setNewName('')
    setAddingParticipant(false)
    loadData()
  }

  return (
    <DashboardShell roleLabel="Administration" navItems={navItems}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">Attendance</h1>
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

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : participants.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6">
          <p className="mb-4 text-sm text-gray-600">
            No participants yet. Add one below to try out attendance marking
            (a full Participants page with all the details is coming next).
          </p>
          <form onSubmit={addParticipant} className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Participant's full name"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={addingParticipant}
              className="rounded-md bg-[#022269] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              Add
            </button>
          </form>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Participant</th>
                <th className="px-4 py-3">Mark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {participants.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.full_name}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {CODES.map((c) => (
                        <button
                          key={c.value}
                          onClick={() => markAttendance(p.id, c.value)}
                          disabled={savingId === p.id}
                          className={`rounded-md border px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${
                            attendance[p.id] === c.value
                              ? c.color
                              : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                          }`}
                          title={c.label}
                        >
                          {c.value}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  )
}
