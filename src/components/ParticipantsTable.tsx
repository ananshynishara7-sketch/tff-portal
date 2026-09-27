'use client'

import { Fragment, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type Family = { id: string; name: string; display_color: string }
type Participant = {
  id: string
  full_name: string
  surname: string | null
  family_id: string | null
  joining_date: string | null
  status: string
  contact_email: string | null
  contact_phone: string | null
  tff_id: string | null
  gender: string | null
  tff_email: string | null
  address: string | null
  religion: string | null
  date_of_birth: string | null
  nic: string | null
  school: string | null
  medium: string | null
  qualification: string | null
  emergency_contact_1_name: string | null
  emergency_contact_1_phone: string | null
  emergency_contact_1_relationship: string | null
  emergency_contact_2_name: string | null
  emergency_contact_2_phone: string | null
  emergency_contact_2_relationship: string | null
}

export default function ParticipantsTable({ canAdd = true }: { canAdd?: boolean }) {
  const supabase = createClient()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [families, setFamilies] = useState<Family[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [familyFilter, setFamilyFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('Active')
  const [expandedId, setExpandedId] = useState<string | null>(null)

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
      const expectedRow = r.present + r.late + r.notAuth + r.ha + r.hn
      const attendancePct = expectedRow > 0 ? Math.round((attended / expectedRow) * 1000) / 10 : 0
      const punctualityPct = r.present + r.late > 0 ? Math.round((r.present / (r.present + r.late)) * 1000) / 10 : 0

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

  function familyColor(id: string | null) {
    return families.find((f) => f.id === id)?.display_color ?? '#9CA3AF'
  }

  async function updateField(id: string, field: keyof Participant, value: string) {
    setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
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
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    return matchesSearch && matchesFamily && matchesStatus
  })

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">
          Participants{' '}
          <span className="text-base font-normal text-gray-400">
            ({filtered.length} of {participants.length} ever enrolled)
          </span>
        </h1>
        {canAdd && (
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="rounded-md bg-[#022269] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            + Add Participant
          </button>
        )}
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
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="Active">Active only</option>
          <option value="On Leave">On Leave only</option>
          <option value="Left">Left only</option>
          <option value="Deceased">Deceased only</option>
          <option value="all">All statuses (everyone ever enrolled)</option>
        </select>
      </div>

      {showAddForm && canAdd && (
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
                <th className="px-4 py-3">Surname</th>
                <th className="px-4 py-3">Family</th>
                <th className="px-4 py-3">Joining Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Phase 3 Attendance %</th>
                <th className="px-4 py-3">Phase 3 Punctuality %</th>
                <th className="px-4 py-3">Overall (P1-P3) Attendance %</th>
                <th className="px-4 py-3">Overall (P1-P3) Punctuality %</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p) => (
                <Fragment key={p.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <input
                        defaultValue={p.full_name}
                        onBlur={(e) => updateField(p.id, 'full_name', e.target.value)}
                        className="w-full rounded border border-transparent bg-transparent px-2 py-1 font-medium text-gray-900 hover:border-gray-200 focus:border-[#022269] focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      <input
                        defaultValue={p.surname ?? ''}
                        onBlur={(e) => updateField(p.id, 'surname', e.target.value)}
                        className="w-full rounded border border-transparent bg-transparent px-2 py-1 text-sm hover:border-gray-200 focus:border-[#022269] focus:outline-none"
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
                            : p.status === 'Deceased'
                            ? 'border-gray-400 bg-gray-100 text-gray-700'
                            : 'border-gray-200 bg-gray-50 text-gray-500'
                        }`}
                      >
                        <option value="Active">Active</option>
                        <option value="On Leave">On Leave</option>
                        <option value="Left">Left</option>
                        <option value="Deceased">Deceased</option>
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
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                        className="text-xs text-[#022269] hover:underline"
                      >
                        {expandedId === p.id ? 'Hide details' : 'Details'}
                      </button>
                    </td>
                  </tr>
                  {expandedId === p.id && (
                    <tr className="bg-gray-50">
                      <td colSpan={10} className="px-4 py-4">
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                          <DetailField label="TFF ID" value={p.tff_id} onSave={(v) => updateField(p.id, 'tff_id', v)} />
                          <DetailField label="Gender" value={p.gender} onSave={(v) => updateField(p.id, 'gender', v)} />
                          <DetailField
                            label="Date of Birth"
                            value={p.date_of_birth}
                            type="date"
                            onSave={(v) => updateField(p.id, 'date_of_birth', v)}
                          />
                          <DetailField label="Religion" value={p.religion} onSave={(v) => updateField(p.id, 'religion', v)} />
                          <DetailField label="NIC" value={p.nic} onSave={(v) => updateField(p.id, 'nic', v)} />
                          <DetailField
                            label="Mobile Number"
                            value={p.contact_phone}
                            onSave={(v) => updateField(p.id, 'contact_phone', v)}
                          />
                          <DetailField label="TFF Email" value={p.tff_email} onSave={(v) => updateField(p.id, 'tff_email', v)} />
                          <DetailField
                            label="Personal Email"
                            value={p.contact_email}
                            onSave={(v) => updateField(p.id, 'contact_email', v)}
                          />
                          <DetailField label="School" value={p.school} onSave={(v) => updateField(p.id, 'school', v)} />
                          <DetailField label="Medium" value={p.medium} onSave={(v) => updateField(p.id, 'medium', v)} />
                          <DetailField
                            label="Qualification"
                            value={p.qualification}
                            onSave={(v) => updateField(p.id, 'qualification', v)}
                          />
                          <DetailField label="Address" value={p.address} onSave={(v) => updateField(p.id, 'address', v)} />
                        </div>
                        <div className="mt-4 border-t border-gray-200 pt-4">
                          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Emergency Contacts
                          </h4>
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                            <DetailField
                              label="Contact 1 Name"
                              value={p.emergency_contact_1_name}
                              onSave={(v) => updateField(p.id, 'emergency_contact_1_name', v)}
                            />
                            <DetailField
                              label="Contact 1 Phone"
                              value={p.emergency_contact_1_phone}
                              onSave={(v) => updateField(p.id, 'emergency_contact_1_phone', v)}
                            />
                            <DetailField
                              label="Contact 1 Relationship"
                              value={p.emergency_contact_1_relationship}
                              onSave={(v) => updateField(p.id, 'emergency_contact_1_relationship', v)}
                            />
                            <DetailField
                              label="Contact 2 Name"
                              value={p.emergency_contact_2_name}
                              onSave={(v) => updateField(p.id, 'emergency_contact_2_name', v)}
                            />
                            <DetailField
                              label="Contact 2 Phone"
                              value={p.emergency_contact_2_phone}
                              onSave={(v) => updateField(p.id, 'emergency_contact_2_phone', v)}
                            />
                            <DetailField
                              label="Contact 2 Relationship"
                              value={p.emergency_contact_2_relationship}
                              onSave={(v) => updateField(p.id, 'emergency_contact_2_relationship', v)}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                    No participants match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-gray-400">
        Click any cell to edit it directly — changes save automatically. Click &quot;Details&quot; on
        a row to see and edit that participant&apos;s full information (date of birth, NIC, school,
        contact details, emergency contacts, etc). &quot;Phase 3&quot; columns only count this current
        phase (from 7 Sept 2026). &quot;Overall (P1-P3)&quot; columns add Phase 1 and Phase 2&apos;s
        final numbers on top, so they show each participant&apos;s whole time in the programme.
      </p>
    </div>
  )
}

function DetailField({
  label,
  value,
  onSave,
  type = 'text',
}: {
  label: string
  value: string | null
  onSave: (value: string) => void
  type?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
      <input
        type={type}
        defaultValue={value ?? ''}
        onBlur={(e) => onSave(e.target.value)}
        className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm focus:border-[#022269] focus:outline-none"
      />
    </div>
  )
}
