'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

const CODES = [
  { value: '/', label: 'Present', color: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'A', label: 'Approved Absence', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'N', label: 'Not Authorised', color: 'bg-red-100 text-red-800 border-red-300' },
  { value: 'L', label: 'Late', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'HA', label: 'Half Day (Approved)', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  { value: 'HN', label: 'Half Day (Not Approved)', color: 'bg-orange-100 text-orange-800 border-orange-300' },
] as const

type Family = { id: string; name: string; display_color: string }
type Participant = { id: string; full_name: string; family_id: string | null }
type AttendanceMap = Record<string, string>

function isWeekend(isoDate: string): boolean {
  const day = new Date(isoDate + 'T00:00:00Z').getUTCDay()
  return day === 0 || day === 6
}

function defaultDate(): string {
  const d = new Date()
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() - 1)
  }
  return d.toISOString().slice(0, 10)
}

export default function AttendanceMarking({ canClearAll = true }: { canClearAll?: boolean }) {
  const supabase = createClient()
  const [date, setDate] = useState(defaultDate)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [families, setFamilies] = useState<Family[]>([])
  const [familyFilter, setFamilyFilter] = useState('all')
  const [attendance, setAttendance] = useState<AttendanceMap>({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [clearing, setClearing] = useState(false)
  const [highlightId, setHighlightId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)

    const [{ data: participantsData }, { data: familiesData }, { data: attendanceData }] = await Promise.all([
      supabase
        .from('participants')
        .select('id, full_name, family_id')
        .eq('status', 'Active')
        .order('full_name'),
      supabase.from('families').select('id, name, display_color').order('name'),
      supabase.from('attendance_records').select('participant_id, code').eq('date', date),
    ])

    setParticipants(participantsData ?? [])
    setFamilies(familiesData ?? [])

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

  function handleDateChange(newDate: string) {
    if (isWeekend(newDate)) {
      alert("That's a Saturday or Sunday - classes only run on weekdays, so attendance can't be marked for that day.")
      return
    }
    setDate(newDate)
  }

  async function markAttendance(participantId: string, code: string) {
    if (isWeekend(date)) return
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

  async function clearAllForDay() {
    if (isWeekend(date)) return
    const markedCount = Object.keys(attendance).length
    if (markedCount === 0) {
      alert('Nothing is marked for this day yet.')
      return
    }
    if (
      !confirm(
        `This will erase all ${markedCount} attendance marks for ${date}, for every participant. This can't be undone. Continue?`
      )
    ) {
      return
    }
    setClearing(true)
    await supabase.from('attendance_records').delete().eq('date', date)
    setAttendance({})
    setClearing(false)
  }

  function familyName(id: string | null) {
    return families.find((f) => f.id === id)?.name ?? '—'
  }
  function familyColor(id: string | null) {
    return families.find((f) => f.id === id)?.display_color ?? '#9ca3af'
  }

  const visible =
    familyFilter === 'all' ? participants : participants.filter((p) => p.family_id === familyFilter)

  const notMarked = participants.filter((p) => !attendance[p.id])

  function jumpToParticipant(id: string) {
    if (!id) return
    const p = participants.find((pp) => pp.id === id)
    if (!p) return
    if (familyFilter !== 'all' && p.family_id !== familyFilter) {
      setFamilyFilter('all')
    }
    setHighlightId(id)
    setTimeout(() => {
      document.getElementById(`attendance-row-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
    setTimeout(() => setHighlightId((h) => (h === id ? null : h)), 2500)
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">Attendance</h1>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-gray-600">Family:</label>
          <select
            value={familyFilter}
            onChange={(e) => setFamilyFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="all">All families</option>
            {families.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          <label className="text-sm text-gray-600">Date:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
          <label className="text-sm text-gray-600">Not marked yet ({notMarked.length}):</label>
          <select
            value=""
            onChange={(e) => jumpToParticipant(e.target.value)}
            disabled={loading}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
          >
            <option value="">{notMarked.length === 0 ? 'Everyone is marked ✓' : '-- Select to jump --'}</option>
            {notMarked.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
                {p.family_id ? ` (${familyName(p.family_id)})` : ''}
              </option>
            ))}
          </select>
          {canClearAll && (
            <button
              onClick={clearAllForDay}
              disabled={clearing || loading || isWeekend(date)}
              className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              {clearing ? 'Clearing...' : 'Clear All for This Day'}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500">
          {familyFilter === 'all' ? 'No active participants yet.' : 'No active participants in this family.'}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Participant</th>
                {familyFilter === 'all' && <th className="px-4 py-3">Family</th>}
                <th className="px-4 py-3">Mark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((p) => (
                <tr
                  key={p.id}
                  id={`attendance-row-${p.id}`}
                  className={highlightId === p.id ? 'bg-yellow-50 transition-colors' : 'transition-colors'}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{p.full_name}</td>
                  {familyFilter === 'all' && (
                    <td className="px-4 py-3">
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: `${familyColor(p.family_id)}1A`, color: familyColor(p.family_id) }}
                      >
                        {familyName(p.family_id)}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {CODES.map((c) => (
                        <button
                          key={c.value}
                          onClick={() => markAttendance(p.id, c.value)}
                          disabled={savingId === p.id || isWeekend(date)}
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
    </div>
  )
}
