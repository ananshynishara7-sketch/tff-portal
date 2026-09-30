'use client'

import { Fragment, useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Carrier = {
  id: string
  full_name: string
  family_id: string | null
  main_diploma: string | null
  nic: string | null
  date_of_birth: string | null
  gender: string | null
  mobile: string | null
  whatsapp: string | null
  email: string | null
  address: string | null
  notes: string | null
}
type CarrierUpdate = {
  id: string
  flag_carrier_id: string
  round_label: string
  round_date: string | null
  studying: boolean | null
  study_mode: string | null
  program_course: string | null
  institution: string | null
  working: boolean | null
  work_mode: string | null
  job_role: string | null
  employer: string | null
  areas_of_interest: string | null
  salary: string | null
  notes: string | null
  follow_up: boolean
}
type Family = { id: string; name: string; display_color: string }

function DetailField({
  label,
  value,
  onSave,
  readOnly,
}: {
  label: string
  value: string | null
  onSave: (v: string) => void
  readOnly?: boolean
}) {
  if (readOnly) {
    return (
      <div>
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="text-sm text-gray-900">{value || '—'}</p>
      </div>
    )
  }
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
      <input
        type="text"
        defaultValue={value ?? ''}
        onBlur={(e) => onSave(e.target.value)}
        className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
      />
    </div>
  )
}

function statusChip(u: CarrierUpdate | undefined): { label: string; color: string } {
  if (!u) return { label: 'No data', color: '#9ca3af' }
  const studying = !!u.studying
  const working = !!u.working
  if (studying && working) return { label: 'Studying + Working', color: '#16a34a' }
  if (studying) return { label: 'Studying', color: '#2563eb' }
  if (working) return { label: 'Working', color: '#7c3aed' }
  return { label: 'Neither', color: '#dc2626' }
}

function colorStyle(hex: string) {
  return { backgroundColor: `${hex}1A`, borderColor: hex, color: hex }
}

export default function FlagCarriers({ canEdit = false }: { canEdit?: boolean }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [carriers, setCarriers] = useState<Carrier[]>([])
  const [updates, setUpdates] = useState<Record<string, CarrierUpdate>>({}) // `${carrierId}|${roundLabel}`
  const [families, setFamilies] = useState<Family[]>([])

  const [round, setRound] = useState<string>('')
  const [search, setSearch] = useState('')
  const [familyFilter, setFamilyFilter] = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showAddPerson, setShowAddPerson] = useState(false)
  const [showAddRound, setShowAddRound] = useState(false)

  const [editTarget, setEditTarget] = useState<{ carrierId: string; roundLabel: string } | null>(null)
  const [editForm, setEditForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const [newPerson, setNewPerson] = useState({ full_name: '', family_id: '', main_diploma: '' })
  const [newRound, setNewRound] = useState({ label: '', date: '' })

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: carrierData }, { data: updateData }, { data: familyData }] = await Promise.all([
      supabase.from('flag_carriers').select('*').order('full_name'),
      supabase.from('flag_carrier_updates').select('*'),
      supabase.from('families').select('id, name, display_color').order('name'),
    ])
    setCarriers(carrierData ?? [])
    setFamilies(familyData ?? [])
    const map: Record<string, CarrierUpdate> = {}
    for (const u of updateData ?? []) {
      map[`${u.flag_carrier_id}|${u.round_label}`] = u
    }
    setUpdates(map)

    const rounds = Array.from(new Set((updateData ?? []).map((u) => u.round_label))).sort((a, b) => {
      const da = (updateData ?? []).find((u) => u.round_label === a)?.round_date ?? ''
      const db = (updateData ?? []).find((u) => u.round_label === b)?.round_date ?? ''
      return da.localeCompare(db)
    })
    setRound((current) => (current && rounds.includes(current) ? current : rounds[rounds.length - 1] ?? ''))

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  const rounds = Array.from(new Set(Object.values(updates).map((u) => u.round_label))).sort((a, b) => {
    const da = Object.values(updates).find((u) => u.round_label === a)?.round_date ?? ''
    const db = Object.values(updates).find((u) => u.round_label === b)?.round_date ?? ''
    return da.localeCompare(db)
  })

  function familyName(id: string | null) {
    return families.find((f) => f.id === id)?.name ?? '—'
  }
  function familyColor(id: string | null) {
    return families.find((f) => f.id === id)?.display_color ?? '#9ca3af'
  }

  const visible = carriers.filter((c) => {
    const matchesFamily = familyFilter === 'all' || c.family_id === familyFilter
    const matchesSearch = c.full_name.toLowerCase().includes(search.toLowerCase())
    return matchesFamily && matchesSearch
  })

  function openEntry(carrierId: string, roundLabel: string) {
    const u = updates[`${carrierId}|${roundLabel}`]
    setEditForm({
      studying: u?.studying ? 'yes' : u?.studying === false ? 'no' : '',
      study_mode: u?.study_mode ?? '',
      program_course: u?.program_course ?? '',
      institution: u?.institution ?? '',
      working: u?.working ? 'yes' : u?.working === false ? 'no' : '',
      work_mode: u?.work_mode ?? '',
      job_role: u?.job_role ?? '',
      employer: u?.employer ?? '',
      areas_of_interest: u?.areas_of_interest ?? '',
      salary: u?.salary ?? '',
      notes: u?.notes ?? '',
      follow_up: u?.follow_up ? 'yes' : 'no',
    })
    setEditTarget({ carrierId, roundLabel })
  }

  async function saveEntry() {
    if (!editTarget) return
    setSaving(true)
    const { data: userData } = await supabase.auth.getUser()
    await supabase.from('flag_carrier_updates').upsert(
      {
        flag_carrier_id: editTarget.carrierId,
        round_label: editTarget.roundLabel,
        studying: editForm.studying === '' ? null : editForm.studying === 'yes',
        study_mode: editForm.study_mode || null,
        program_course: editForm.program_course || null,
        institution: editForm.institution || null,
        working: editForm.working === '' ? null : editForm.working === 'yes',
        work_mode: editForm.work_mode || null,
        job_role: editForm.job_role || null,
        employer: editForm.employer || null,
        areas_of_interest: editForm.areas_of_interest || null,
        salary: editForm.salary || null,
        notes: editForm.notes || null,
        follow_up: editForm.follow_up === 'yes',
        entered_by: userData.user?.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'flag_carrier_id,round_label' }
    )
    setSaving(false)
    setEditTarget(null)
    load()
  }

  async function updateCarrierField(id: string, field: string, value: string) {
    await supabase.from('flag_carriers').update({ [field]: value || null }).eq('id', id)
    load()
  }

  async function addPerson(e: React.FormEvent) {
    e.preventDefault()
    if (!newPerson.full_name.trim()) return
    await supabase.from('flag_carriers').insert({
      full_name: newPerson.full_name.trim(),
      family_id: newPerson.family_id || null,
      main_diploma: newPerson.main_diploma || null,
    })
    setNewPerson({ full_name: '', family_id: '', main_diploma: '' })
    setShowAddPerson(false)
    load()
  }

  async function deletePerson(id: string, name: string) {
    if (!confirm(`Remove "${name}" from the Flag Carriers roster? This deletes all their status-update history too.`)) return
    await supabase.from('flag_carriers').delete().eq('id', id)
    load()
  }

  async function addRound(e: React.FormEvent) {
    e.preventDefault()
    if (!newRound.label.trim()) return
    // Rounds aren't a separate table - they exist once at least one person has an
    // entry for that label. Seed one placeholder-free row isn't needed; we just
    // switch the view to it and the first save will create it for real.
    setRound(newRound.label.trim())
    setShowAddRound(false)
    setNewRound({ label: '', date: '' })
  }

  if (loading) return <p className="text-sm text-gray-400">Loading...</p>

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Flag Carriers</h1>
          <p className="text-sm text-gray-500">Class of 2024 alumni - what they're doing now, updated roughly every 6 months.</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddRound((v) => !v)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              + New Round
            </button>
            <button
              onClick={() => setShowAddPerson((v) => !v)}
              className="rounded-md bg-[#022269] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
            >
              + Add Flag Carrier
            </button>
          </div>
        )}
      </div>

      {showAddRound && canEdit && (
        <form onSubmit={addRound} className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Round name (e.g. December 2026)</label>
            <input
              type="text"
              value={newRound.label}
              onChange={(e) => setNewRound((p) => ({ ...p, label: e.target.value }))}
              className="w-56 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
          <button type="submit" className="rounded-md bg-[#022269] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">
            Start this round
          </button>
          <p className="w-full text-xs text-gray-400">This just switches you to entering data for the new round - it appears in the round list once you save the first person&apos;s update.</p>
        </form>
      )}

      {showAddPerson && canEdit && (
        <form onSubmit={addPerson} className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Full name</label>
            <input
              type="text"
              value={newPerson.full_name}
              onChange={(e) => setNewPerson((p) => ({ ...p, full_name: e.target.value }))}
              className="w-48 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Family</label>
            <select
              value={newPerson.family_id}
              onChange={(e) => setNewPerson((p) => ({ ...p, family_id: e.target.value }))}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="">—</option>
              {families.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Diploma</label>
            <input
              type="text"
              placeholder="Participation / Completion / Achievement"
              value={newPerson.main_diploma}
              onChange={(e) => setNewPerson((p) => ({ ...p, main_diploma: e.target.value }))}
              className="w-64 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
          <button type="submit" className="rounded-md bg-[#022269] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">
            Add
          </button>
        </form>
      )}

      {editTarget && canEdit && (() => {
        const carrier = carriers.find((c) => c.id === editTarget.carrierId)
        return (
          <div className="mb-6 rounded-xl border border-[#022269]/30 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-gray-900">
              {carrier?.full_name} — {editTarget.roundLabel}
            </h2>
            <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Studying?</label>
                <select value={editForm.studying} onChange={(e) => setEditForm((p) => ({ ...p, studying: e.target.value }))} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm">
                  <option value="">Unknown</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Study mode</label>
                <input type="text" placeholder="Full-time / Part-time" value={editForm.study_mode} onChange={(e) => setEditForm((p) => ({ ...p, study_mode: e.target.value }))} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Program / course</label>
                <input type="text" value={editForm.program_course} onChange={(e) => setEditForm((p) => ({ ...p, program_course: e.target.value }))} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Institution</label>
                <input type="text" value={editForm.institution} onChange={(e) => setEditForm((p) => ({ ...p, institution: e.target.value }))} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Working?</label>
                <select value={editForm.working} onChange={(e) => setEditForm((p) => ({ ...p, working: e.target.value }))} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm">
                  <option value="">Unknown</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Work mode</label>
                <input type="text" placeholder="Full-time / Part-time" value={editForm.work_mode} onChange={(e) => setEditForm((p) => ({ ...p, work_mode: e.target.value }))} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Job role</label>
                <input type="text" value={editForm.job_role} onChange={(e) => setEditForm((p) => ({ ...p, job_role: e.target.value }))} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Employer</label>
                <input type="text" value={editForm.employer} onChange={(e) => setEditForm((p) => ({ ...p, employer: e.target.value }))} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Areas of interest</label>
                <input type="text" value={editForm.areas_of_interest} onChange={(e) => setEditForm((p) => ({ ...p, areas_of_interest: e.target.value }))} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Salary (optional)</label>
                <input type="text" value={editForm.salary} onChange={(e) => setEditForm((p) => ({ ...p, salary: e.target.value }))} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Needs follow-up?</label>
                <select value={editForm.follow_up} onChange={(e) => setEditForm((p) => ({ ...p, follow_up: e.target.value }))} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm">
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-gray-500">Notes</label>
              <textarea value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} rows={2} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
            </div>
            <div className="flex gap-2">
              <button onClick={saveEntry} disabled={saving} className="rounded-md bg-[#022269] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setEditTarget(null)} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        )
      })()}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <select value={familyFilter} onChange={(e) => setFamilyFilter(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="all">All families</option>
          {families.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        {rounds.length > 0 && (
          <select value={round} onChange={(e) => setRound(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            {rounds.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
            {round && !rounds.includes(round) && <option value={round}>{round} (new)</option>}
          </select>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Family</th>
              <th className="px-4 py-3">Diploma</th>
              <th className="px-4 py-3">{round || 'Status'}</th>
              <th className="px-4 py-3">Follow-up</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visible.map((c) => {
              const u = updates[`${c.id}|${round}`]
              const chip = statusChip(u)
              const isExpanded = expanded === c.id
              return (
                <Fragment key={c.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-900">{c.full_name}</td>
                    <td className="px-4 py-2">
                      <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: `${familyColor(c.family_id)}1A`, color: familyColor(c.family_id) }}>
                        {familyName(c.family_id)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-600">{c.main_diploma ?? '—'}</td>
                    <td className="px-4 py-2">
                      {canEdit ? (
                        <button
                          onClick={() => openEntry(c.id, round)}
                          className="rounded-md border px-2 py-1 text-xs font-medium hover:opacity-80"
                          style={colorStyle(chip.color)}
                        >
                          {chip.label}
                        </button>
                      ) : (
                        <span className="rounded-md border px-2 py-1 text-xs font-medium" style={colorStyle(chip.color)}>
                          {chip.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {u?.follow_up ? <span className="text-xs font-medium text-red-600">Needs follow-up</span> : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => setExpanded(isExpanded ? null : c.id)} className="text-xs font-medium text-[#022269] hover:underline">
                        {isExpanded ? 'Hide' : 'Details'}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${c.id}-detail`}>
                      <td colSpan={6} className="bg-gray-50 px-4 py-4">
                        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <DetailField label="NIC" value={c.nic} onSave={(v) => updateCarrierField(c.id, 'nic', v)} readOnly={!canEdit} />
                          <DetailField label="Date of birth" value={c.date_of_birth} onSave={(v) => updateCarrierField(c.id, 'date_of_birth', v)} readOnly={!canEdit} />
                          <DetailField label="Gender" value={c.gender} onSave={(v) => updateCarrierField(c.id, 'gender', v)} readOnly={!canEdit} />
                          <DetailField label="Mobile" value={c.mobile} onSave={(v) => updateCarrierField(c.id, 'mobile', v)} readOnly={!canEdit} />
                          <DetailField label="WhatsApp" value={c.whatsapp} onSave={(v) => updateCarrierField(c.id, 'whatsapp', v)} readOnly={!canEdit} />
                          <DetailField label="Email" value={c.email} onSave={(v) => updateCarrierField(c.id, 'email', v)} readOnly={!canEdit} />
                          <DetailField label="Address" value={c.address} onSave={(v) => updateCarrierField(c.id, 'address', v)} readOnly={!canEdit} />
                        </div>
                        <p className="mb-2 text-xs font-semibold uppercase text-gray-500">History across rounds</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="text-gray-400">
                              <tr>
                                <th className="pr-4 py-1">Round</th>
                                <th className="pr-4 py-1">Status</th>
                                <th className="pr-4 py-1">Program / Job</th>
                                <th className="pr-4 py-1">Notes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rounds.map((r) => {
                                const ru = updates[`${c.id}|${r}`]
                                const rchip = statusChip(ru)
                                return (
                                  <tr key={r} className="border-t border-gray-200">
                                    <td className="pr-4 py-1.5 font-medium text-gray-700">{r}</td>
                                    <td className="pr-4 py-1.5">
                                      <span className="rounded-full border px-2 py-0.5" style={colorStyle(rchip.color)}>{rchip.label}</span>
                                    </td>
                                    <td className="pr-4 py-1.5 text-gray-600">{ru?.program_course || ru?.job_role || '—'}</td>
                                    <td className="pr-4 py-1.5 text-gray-500">{ru?.notes || '—'}</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                        {canEdit && (
                          <button onClick={() => deletePerson(c.id, c.full_name)} className="mt-3 text-xs font-medium text-red-600 hover:underline">
                            Remove from roster
                          </button>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No Flag Carriers match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
