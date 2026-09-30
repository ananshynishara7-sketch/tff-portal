'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
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
  { label: 'The Flag Carriers', href: '/admin/flag-carriers' },
  { label: 'Families', href: '/admin/groups' },
  { label: 'Settings', href: '/admin/settings' },
]

type Family = {
  id: string
  name: string
  display_color: string
}

export default function GroupsPage() {
  const supabase = createClient()
  const [families, setFamilies] = useState<Family[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#022269')
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data: familiesData }, { data: participantsData }] = await Promise.all([
      supabase.from('families').select('*').order('name'),
      supabase.from('participants').select('family_id').eq('status', 'Active'),
    ])
    setFamilies(familiesData ?? [])

    const countMap: Record<string, number> = {}
    for (const p of participantsData ?? []) {
      if (!p.family_id) continue
      countMap[p.family_id] = (countMap[p.family_id] ?? 0) + 1
    }
    setCounts(countMap)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function updateField(id: string, field: keyof Family, value: string) {
    setFamilies((prev) => prev.map((f) => (f.id === id ? { ...f, [field]: value } : f)))
    await supabase.from('families').update({ [field]: value }).eq('id', id)
  }

  async function addFamily(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setSaving(true)
    await supabase.from('families').insert({ name: newName.trim(), display_color: newColor })
    setNewName('')
    setNewColor('#022269')
    setSaving(false)
    loadData()
  }

  async function deleteFamily(id: string, name: string) {
    const memberCount = counts[id] ?? 0
    if (memberCount > 0) {
      alert(
        `"${name}" still has ${memberCount} active participant(s) in it. Move them to another family first (from the Participants page) before deleting this family.`
      )
      return
    }
    if (!confirm(`Delete the family "${name}"? This can't be undone.`)) return
    await supabase.from('families').delete().eq('id', id)
    loadData()
  }

  return (
    <DashboardShell roleLabel="Administration" navItems={navItems}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">Families</h1>
      </div>
      <p className="mb-4 max-w-2xl text-sm text-gray-600">
        These are your program&apos;s families (currently Arising Brilliance, Believers, Benevolent,
        Loving). Rename, recolor, or add a new one any time — this never needs code changes, so
        it&apos;s safe to update next year too. Click a family&apos;s name below to see its full
        attendance record.
      </p>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Color</th>
                <th className="px-4 py-3">Active Participants</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {families.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <input
                      defaultValue={f.name}
                      onBlur={(e) => updateField(f.id, 'name', e.target.value)}
                      className="w-full rounded border border-transparent bg-transparent px-2 py-1 font-medium hover:border-gray-200 focus:border-[#022269] focus:outline-none"
                      style={{ color: f.display_color }}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="color"
                      defaultValue={f.display_color}
                      onChange={(e) => updateField(f.id, 'display_color', e.target.value)}
                      className="h-8 w-14 cursor-pointer rounded border border-gray-200"
                    />
                  </td>
                  <td className="px-4 py-2 text-gray-600">{counts[f.id] ?? 0}</td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/admin/families/${f.id}`}
                      className="mr-4 text-xs text-[#022269] hover:underline"
                    >
                      View attendance →
                    </Link>
                    <button
                      onClick={() => deleteFamily(f.id, f.name)}
                      className="text-xs text-red-500 hover:text-red-700 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form
        onSubmit={addFamily}
        className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">New family name</label>
          <input
            type="text"
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Radiant"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Color</label>
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="h-9 w-14 cursor-pointer rounded border border-gray-300"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-[#022269] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          + Add Family
        </button>
      </form>
    </DashboardShell>
  )
}
