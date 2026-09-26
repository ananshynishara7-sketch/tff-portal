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

type Family = { id: string; name: string; display_color: string }
type Participant = {
  id: string
  full_name: string
  family_id: string | null
  joining_date: string | null
  status: string
  contact_email: string | null
  contact_phone: string | null
}

export default function ParticipantsPage() {
  const supabase = createClient()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [families, setFamilies] = useState<Family[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [familyFilter, setFamilyFilter] = useState('all')

  // New-row form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newFamily, setNewFamily] = useState('')
  const [saving, setSaving] = useState(false)

  const [stats, setStats] = useState<Record<string, {
    attendancePct: number; punctualityPct: number; overallAttendancePct: number; overallPunctualityPct: number
  }>>({})

  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data: participantsData }, { data: familiesData }, { data: attendanceData }, { data: historyData }] =
      await Promise.all([
        supabase.from('participants').select('*').order('full_name'),
        supabase.from('families').select('*').order('name'),
        supabase.from('attendance_records').select('participant_id, code'),
        supabase.from('historical_phase_totals').select('*'),
      ])
    setParticipants(participantsData ?? [])
    setFamilies(familiesData ?? [])

    // Raw Phase 3 day counts per participant.
    const raw: Record<string, { present: number; late: number; notAuth: number; ha: number; hn: number }> = {}
    for (const rec of attendanceData ?? []) {
      const id = rec.participant_id
      raw[id] = raw[id] ?? { present: 0, late: 0, notAuth: 0, ha: 0, hn: 0 }
      switch (rec.code) {
        case '/': raw[id].present++; break
        case 'L': raw[id].late++; break
        case 'N': raw[id].notAuth++; break
        case 'HA': raw[id].ha++; break
        case 'HN': raw[id].hn++; break
        // 'A' excluded entirely
      }
    }

    const history: Record<string, {
      p1_attended: number; p1_expected: number; p1_present: number; p1_present_late: number
      p2_attended: number; p2_expected: number; p2_present: number; p2_present_late: number
    }> = {}
    for (const h of historyData ?? []) history[h.participant_id] = h

    const computed: Record<string, {
      attendancePct: number; punctualityPct: number; overallAttendancePct: number; overallPunctualityPct: number
    }> = {}
    for (const p of participantsData ?? []) {
      const r = raw[p.id] ?? { present: 0, late: 0, notAuth: 0, ha: 0, hn: 0 }
      const attended = r.present + r.late + 0.5 * r.ha + 0.5 * r.hn
      // A participant's own Phase 3 figures: a half-day approved (HA) still
      // costs a full day of "expected" here (matches the register's own
      // per-participant row formula).
      const expectedRow = r.present + r.late + r.notAuth + r.ha + r.hn
      const attendancePct = expectedRow > 0 ? Math.round((attended / expectedRow) * 1000) / 10 : 0
      const punctualityPct = r.present + r.late > 0 ? Math.round((r.present / (r.present + r.late)) * 1000) / 10 : 0

      // Combined Phase 1 + 2 + 3: Phase 1/2 are frozen totals from the old
      // registers; Phase 3 here weights HA at only half a day of "expected"
      // (matches the register's own "Overall (P1-P3)" formula exactly).
      const h = history[p.id]
      const expectedOverall = r.present + r.late + r.notAuth + 0.5 * r.ha + r.hn
      const overallAttended = (h?.p1_attended ?? 0) + (h?.p2_attended ?? 0) + attended
      const overallExpected = (h?.p1_expected ?? 0) + (h?.p2_expected ?? 0) + expectedOverall
      const overallPresent = (h?.p1_present ?? 0) + (h?.p2_present ?? 0) + r.present
      const overallPresentLate = (h?.p1_present_late ?? 0) + (h?.p2_present_late ?? 0) + r.present + r.late

      computed[p.id] = {
        attendancePct,
        punctualityPct,
        overallAttendancePct: overallExpected > 0 ? Math.round((overallAttended / overallExpected) * 1000) / 10 : 0,
        overallPunctualityPct: overallPresentLate > 0 ? Math.round((overallPresent / overallPresentLate) * 1000) / 10 : 0,
      }
    }
    setStats(computed)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  function familyName(id: string | null) {
    return families.find((f) => f.id === id)?.name ?? '—'
  }

  function familyColor(id: string | null) {
    return families.find((f) => f.id === id)?.display_color ?? '#9CA3AF'
  }

  async function updateField(id: string, field: keyof Participant, value: string) {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    )
    await supabase.from('participants').update({ [field]: value }).eq('id', id)
  }

  async function addParticipant(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setSaving(true)
    await supabase.from('participants').insert({
      full_name: newName.trim(),
      family_id: newFamily || null,
      status: 'Active',
    })
    setNewName('')
    setNewFamily('')
    setShowAddForm(false)
    setSaving(false)
    loadData()
  }

  const filtered = participants.filter((p) => {
    const matchesSearch = p.full_name.toLowerCase().includes(search.toLowerCase())
    const matchesFamily = familyFilter === 'all' || p.family_id === familyFilter
    return matchesSearch && matchesFamily
  })

  return (
    <DashboardShell roleLabel="Administration" navItems={navItems}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">
          Participants <span className="text-base font-normal text-gray-400">({participants.length})</span>
        </h1>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="rounded-md bg-[#022269] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Add Participant
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <select
          value={familyFilter}
          onChange={(e) => setFamilyFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="all">All families</option>
          {families.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      {showAddForm && (
        <form
          onSubmit={addParticipant}
          className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Full name</label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Family</label>
            <select
              value={newFamily}
              onChange={(e) => setNewFamily(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">No family</option>
              {families.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-[#022269] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            Save
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Family</th>
                <th className="px-4 py-3">Joining Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Phase 3 Attendance %</th>
                <th className="px-4 py-3">Phase 3 Punctuality %</th>
                <th className="px-4 py-3">Overall (P1-P3) Attendance %</th>
                <th className="px-4 py-3">Overall (P1-P3) Punctuality %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <input
                      defaultValue={p.full_name}
                      onBlur={(e) => updateField(p.id, 'full_name', e.target.value)}
                      className="w-full rounded border border-transparent bg-transparent px-2 py-1 font-medium text-gray-900 hover:border-gray-200 focus:border-[#022269] focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={p.family_id ?? ''}
                      onChange={(e) => updateField(p.id, 'family_id', e.target.value)}
                      className="rounded border border-transparent bg-transparent px-2 py-1 text-sm hover:border-gray-200 focus:border-[#022269] focus:outline-none"
                      style={{ color: familyColor(p.family_id) }}
                    >
                      <option value="">—</option>
                      {families.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    <input
                      type="date"
                      defaultValue={p.joining_date ?? ''}
                      onBlur={(e) => updateField(p.id, 'joining_date', e.target.value)}
                      className="rounded border border-transparent bg-transparent px-2 py-1 text-sm hover:border-gray-200 focus:border-[#022269] focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={p.status}
                      onChange={(e) => updateField(p.id, 'status', e.target.value)}
                      className={`rounded-full border px-2 py-1 text-xs font-medium ${
                        p.status === 'Active'
                          ? 'border-green-200 bg-green-50 text-green-700'
                          : p.status === 'On Leave'
                          ? 'border-yellow-200 bg-yellow-50 text-yellow-700'
                          : 'border-gray-200 bg-gray-50 text-gray-500'
                      }`}
                    >
                      <option value="Active">Active</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Left">Left</option>
                    </select>
                  </td>
                  <td className="px-4 py-2 font-medium text-gray-900">
                    {stats[p.id]?.attendancePct ?? 0}%
                  </td>
                  <td className="px-4 py-2 font-medium text-gray-900">
                    {stats[p.id]?.punctualityPct ?? 0}%
                  </td>
                  <td className="px-4 py-2 font-medium text-gray-900">
                    {stats[p.id]?.overallAttendancePct ?? 0}%
                  </td>
                  <td className="px-4 py-2 font-medium text-gray-900">
                    {stats[p.id]?.overallPunctualityPct ?? 0}%
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    No participants match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-gray-400">
        Click any cell to edit it directly — changes save automatically. &quot;Phase 3&quot; columns
        only count this current phase (from 7 Sept 2026). &quot;Overall (P1-P3)&quot; columns add
        Phase 1 and Phase 2&apos;s final numbers on top, so they show each participant&apos;s whole
        time in the programme.
      </p>
    </DashboardShell>
  )
}
