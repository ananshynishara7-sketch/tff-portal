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

  const [stats, setStats] = useState<Record<string, { attendancePct: number; punctualityPct: number }>>({})

  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data: participantsData }, { data: familiesData }, { data: attendanceData }] = await Promise.all([
      supabase.from('participants').select('*').order('full_name'),
      supabase.from('families').select('*').order('name'),
      supabase.from('attendance_records').select('participant_id, code'),
    ])
    setParticipants(participantsData ?? [])
    setFamilies(familiesData ?? [])

    // Same formula as the Dashboard: present/late count fully, HA/HN count
    // as half, approved absences are excluded from the expected-days total,
    // and punctuality is that same attended total minus late days.
    const attended: Record<string, number> = {}
    const expected: Record<string, number> = {}
    const late: Record<string, number> = {}
    for (const rec of attendanceData ?? []) {
      const id = rec.participant_id
      attended[id] = attended[id] ?? 0
      expected[id] = expected[id] ?? 0
      late[id] = late[id] ?? 0
      switch (rec.code) {
        case '/':
          attended[id] += 1; expected[id] += 1; break
        case 'L':
          attended[id] += 1; expected[id] += 1; late[id] += 1; break
        case 'N':
          expected[id] += 1; break
        case 'HA':
        case 'HN':
          attended[id] += 0.5; expected[id] += 1; break
        // 'A' excluded entirely
      }
    }
    const computed: Record<string, { attendancePct: number; punctualityPct: number }> = {}
    for (const p of participantsData ?? []) {
      const a = attended[p.id] ?? 0
      const e = expected[p.id] ?? 0
      const l = late[p.id] ?? 0
      computed[p.id] = {
        attendancePct: e > 0 ? Math.round((a / e) * 1000) / 10 : 0,
        punctualityPct: a > 0 ? Math.round(((a - l) / a) * 1000) / 10 : 0,
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
          <option value="all">All groups</option>
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
            <label className="mb-1 block text-xs font-medium text-gray-600">Group</label>
            <select
              value={newFamily}
              onChange={(e) => setNewFamily(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">No group</option>
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
                <th className="px-4 py-3">Group</th>
                <th className="px-4 py-3">Joining Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Attendance %</th>
                <th className="px-4 py-3">Punctuality %</th>
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
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    No participants match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-gray-400">
        Click any cell to edit it directly — changes save automatically.
      </p>
    </DashboardShell>
  )
}
