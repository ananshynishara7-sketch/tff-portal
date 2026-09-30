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
  cohort_year: string
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
type FieldLabel = { field_key: string; label: string }

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

const DEFAULT_LABELS: Record<string, string> = {
  full_name: 'Name',
  family: 'Family',
  main_diploma: 'Diploma',
  nic: 'NIC',
  date_of_birth: 'Date of birth',
  gender: 'Gender',
  mobile: 'Mobile',
  whatsapp: 'WhatsApp',
  email: 'Email',
  address: 'Address',
  studying: 'Studying?',
  study_mode: 'Study mode',
  program_course: 'Program / course',
  institution: 'Institution',
  working: 'Working?',
  work_mode: 'Work mode',
  job_role: 'Job role',
  employer: 'Employer',
  areas_of_interest: 'Areas of interest',
  salary: 'Salary (optional)',
  notes: 'Notes',
  follow_up: 'Needs follow-up?',
  status: 'Status',
  follow_up_short: 'Follow-up',
}

export default function FlagCarriers({ canEdit = false }: { canEdit?: boolean }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [carriers, setCarriers] = useState<Carrier[]>([])
  const [updates, setUpdates] = useState<Record<string, CarrierUpdate>>({}) // `${carrierId}|${roundLabel}`
  const [families, setFamilies] = useState<Family[]>([])
  const [labels, setLabels] = useState<Record<string, string>>({})

  const [view, setView] = useState<'roster' | 'dashboard'>('roster')
  const [year, setYear] = useState<string>('')
  const [round, setRound] = useState<string>('')
  const [search, setSearch] = useState('')
  const [familyFilter, setFamilyFilter] = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showAddPerson, setShowAddPerson] = useState(false)
  const [showAddRound, setShowAddRound] = useState(false)
  const [showAddYear, setShowAddYear] = useState(false)
  const [showEditLabels, setShowEditLabels] = useState(false)

  const [editTarget, setEditTarget] = useState<{ carrierId: string; roundLabel: string } | null>(null)
  const [editForm, setEditForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const [newPerson, setNewPerson] = useState({ full_name: '', family_id: '', main_diploma: '' })
  const [newRound, setNewRound] = useState({ label: '', date: '' })
  const [newYear, setNewYear] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: carrierData }, { data: updateData }, { data: familyData }, { data: labelData }] = await Promise.all([
      supabase.from('flag_carriers').select('*').order('full_name'),
      supabase.from('flag_carrier_updates').select('*'),
      supabase.from('families').select('id, name, display_color').order('name'),
      supabase.from('flag_carrier_field_labels').select('*'),
    ])
    setCarriers(carrierData ?? [])
    setFamilies(familyData ?? [])
    const labelMap: Record<string, string> = {}
    for (const l of (labelData ?? []) as FieldLabel[]) {
      labelMap[l.field_key] = l.label
    }
    setLabels(labelMap)

    const map: Record<string, CarrierUpdate> = {}
    for (const u of updateData ?? []) {
      map[`${u.flag_carrier_id}|${u.round_label}`] = u
    }
    setUpdates(map)

    const years = Array.from(new Set((carrierData ?? []).map((c) => c.cohort_year))).sort()
    setYear((current) => (current && years.includes(current) ? current : years[years.length - 1] ?? ''))

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  function label(key: string) {
    return labels[key] ?? DEFAULT_LABELS[key] ?? key
  }

  async function saveLabel(key: string, value: string) {
    if (!value.trim()) return
    setLabels((p) => ({ ...p, [key]: value }))
    await supabase.from('flag_carrier_field_labels').upsert({ field_key: key, label: value.trim() }, { onConflict: 'field_key' })
  }

  const years = Array.from(new Set(carriers.map((c) => c.cohort_year))).sort()
  const yearCarriers = carriers.filter((c) => c.cohort_year === year)

  const rounds = Array.from(
    new Set(
      Object.values(updates)
        .filter((u) => yearCarriers.some((c) => c.id === u.flag_carrier_id))
        .map((u) => u.round_label)
    )
  ).sort((a, b) => {
    const da = Object.values(updates).find((u) => u.round_label === a)?.round_date ?? ''
    const db = Object.values(updates).find((u) => u.round_label === b)?.round_date ?? ''
    return da.localeCompare(db)
  })

  useEffect(() => {
    setRound((current) => (current && rounds.includes(current) ? current : rounds[rounds.length - 1] ?? ''))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, rounds.join(',')])

  function familyName(id: string | null) {
    return families.find((f) => f.id === id)?.name ?? '—'
  }
  function familyColor(id: string | null) {
    return families.find((f) => f.id === id)?.display_color ?? '#9ca3af'
  }

  const visible = yearCarriers.filter((c) => {
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
      cohort_year: year || new Date().getFullYear().toString(),
    })
    setNewPerson({ full_name: '', family_id: '', main_diploma: '' })
    setShowAddPerson(false)
    load()
  }

  async function deletePerson(id: string, name: string) {
    if (!confirm(`Remove "${name}" from The Flag Carriers roster? This deletes all their status-update history too.`)) return
    await supabase.from('flag_carriers').delete().eq('id', id)
    load()
  }

  async function addRound(e: React.FormEvent) {
    e.preventDefault()
    if (!newRound.label.trim()) return
    // Rounds aren't a separate table - they exist once at least one person has an
    // entry for that label. We just switch the view to it and the first save will
    // create it for real.
    setRound(newRound.label.trim())
    setShowAddRound(false)
    setNewRound({ label: '', date: '' })
  }

  function addYear(e: React.FormEvent) {
    e.preventDefault()
    if (!newYear.trim()) return
    // Like rounds, a new year isn't a separate table - it just appears once the
    // first person with that cohort_year is added.
    setYear(newYear.trim())
    setShowAddYear(false)
    setNewYear('')
  }

  // ---- Dashboard computations (mirrors the source spreadsheet's Dashboard tab) ----
  const roundUpdatesForYear = yearCarriers.map((c) => updates[`${c.id}|${round}`])
  const totalParticipants = yearCarriers.length
  const studyingCount = roundUpdatesForYear.filter((u) => u?.studying).length
  const workingCount = roundUpdatesForYear.filter((u) => u?.working).length
  const bothCount = roundUpdatesForYear.filter((u) => u?.studying && u?.working).length
  const studyingOnlyCount = roundUpdatesForYear.filter((u) => u?.studying && !u?.working).length
  const workingOnlyCount = roundUpdatesForYear.filter((u) => !u?.studying && u?.working).length
  const neitherCount = roundUpdatesForYear.filter((u) => u && u.studying === false && u.working === false).length
  const noResponseCount = roundUpdatesForYear.filter((u) => !u).length
  const followUpCount = roundUpdatesForYear.filter((u) => u?.follow_up).length

  const interestTally: Record<string, number> = {}
  for (const u of roundUpdatesForYear) {
    if (!u?.areas_of_interest) continue
    for (const raw of u.areas_of_interest.split(',')) {
      const area = raw.trim()
      if (!area) continue
      interestTally[area] = (interestTally[area] ?? 0) + 1
    }
  }
  const interestRows = Object.entries(interestTally).sort((a, b) => b[1] - a[1])

  const studyFullTime = roundUpdatesForYear.filter((u) => u?.studying && u?.study_mode?.toLowerCase().includes('full')).length
  const studyPartTime = roundUpdatesForYear.filter((u) => u?.studying && u?.study_mode?.toLowerCase().includes('part')).length
  const workFullTime = roundUpdatesForYear.filter((u) => u?.working && u?.work_mode?.toLowerCase().includes('full')).length
  const workPartTime = roundUpdatesForYear.filter((u) => u?.working && u?.work_mode?.toLowerCase().includes('part')).length

  const followUpList = yearCarriers
    .map((c) => ({ carrier: c, u: updates[`${c.id}|${round}`] }))
    .filter(({ u }) => u?.follow_up)

  if (loading) return <p className="text-sm text-gray-400">Loading...</p>

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">The Flag Carriers</h1>
          <p className="text-sm text-gray-500">Alumni tracker - what they&apos;re doing now, updated roughly every 6 months.</p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowEditLabels((v) => !v)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Edit Labels
            </button>
            <button
              onClick={() => setShowAddYear((v) => !v)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              + New Year
            </button>
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

      {showEditLabels && canEdit && (
        <div className="mb-6 rounded-xl border border-[#022269]/30 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-gray-900">Edit field labels</h2>
          <p className="mb-3 text-xs text-gray-500">
            Rename any header or field label to match how each year&apos;s sheet phrases it (e.g. &quot;Employer&quot; vs &quot;Employer / Location&quot;).
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {Object.keys(DEFAULT_LABELS)
              .filter((k) => k !== 'follow_up_short')
              .map((key) => (
                <div key={key}>
                  <label className="mb-1 block text-xs font-medium text-gray-400">{key}</label>
                  <input
                    type="text"
                    defaultValue={label(key)}
                    onBlur={(e) => saveLabel(key, e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                  />
                </div>
              ))}
          </div>
        </div>
      )}

      {showAddYear && canEdit && (
        <form onSubmit={addYear} className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Cohort year (e.g. 2026)</label>
            <input
              type="text"
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              className="w-40 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
          <button type="submit" className="rounded-md bg-[#022269] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">
            Switch to this year
          </button>
          <p className="w-full text-xs text-gray-400">This just switches you to that year - it appears in the Year dropdown once you add the first person to it.</p>
        </form>
      )}

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
          <p className="text-xs text-gray-400">Will be added to Class of {year || '...'}</p>
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
                <label className="mb-1 block text-xs font-medium text-gray-500">{label('studying')}</label>
                <select value={editForm.studying} onChange={(e) => setEditForm((p) => ({ ...p, studying: e.target.value }))} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm">
                  <option value="">Unknown</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">{label('study_mode')}</label>
                <input type="text" placeholder="Full-time / Part-time" value={editForm.study_mode} onChange={(e) => setEditForm((p) => ({ ...p, study_mode: e.target.value }))} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">{label('program_course')}</label>
                <input type="text" value={editForm.program_course} onChange={(e) => setEditForm((p) => ({ ...p, program_course: e.target.value }))} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">{label('institution')}</label>
                <input type="text" value={editForm.institution} onChange={(e) => setEditForm((p) => ({ ...p, institution: e.target.value }))} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">{label('working')}</label>
                <select value={editForm.working} onChange={(e) => setEditForm((p) => ({ ...p, working: e.target.value }))} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm">
                  <option value="">Unknown</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">{label('work_mode')}</label>
                <input type="text" placeholder="Full-time / Part-time" value={editForm.work_mode} onChange={(e) => setEditForm((p) => ({ ...p, work_mode: e.target.value }))} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">{label('job_role')}</label>
                <input type="text" value={editForm.job_role} onChange={(e) => setEditForm((p) => ({ ...p, job_role: e.target.value }))} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">{label('employer')}</label>
                <input type="text" value={editForm.employer} onChange={(e) => setEditForm((p) => ({ ...p, employer: e.target.value }))} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">{label('areas_of_interest')}</label>
                <input type="text" value={editForm.areas_of_interest} onChange={(e) => setEditForm((p) => ({ ...p, areas_of_interest: e.target.value }))} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">{label('salary')}</label>
                <input type="text" value={editForm.salary} onChange={(e) => setEditForm((p) => ({ ...p, salary: e.target.value }))} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">{label('follow_up')}</label>
                <select value={editForm.follow_up} onChange={(e) => setEditForm((p) => ({ ...p, follow_up: e.target.value }))} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm">
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-gray-500">{label('notes')}</label>
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
        <div className="flex rounded-md border border-gray-300 bg-white p-0.5 text-sm">
          <button
            onClick={() => setView('roster')}
            className={`rounded px-3 py-1 font-medium ${view === 'roster' ? 'bg-[#022269] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Roster
          </button>
          <button
            onClick={() => setView('dashboard')}
            className={`rounded px-3 py-1 font-medium ${view === 'dashboard' ? 'bg-[#022269] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Dashboard
          </button>
        </div>
        {years.length > 0 && (
          <select value={year} onChange={(e) => setYear(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium">
            {years.map((y) => (
              <option key={y} value={y}>Class of {y}</option>
            ))}
            {year && !years.includes(year) && <option value={year}>Class of {year} (new)</option>}
          </select>
        )}
        {rounds.length > 0 && (
          <select value={round} onChange={(e) => setRound(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            {rounds.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
            {round && !rounds.includes(round) && <option value={round}>{round} (new)</option>}
          </select>
        )}
        {view === 'roster' && (
          <>
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
          </>
        )}
      </div>

      {view === 'dashboard' ? (
        <div>
          <p className="mb-4 text-sm text-gray-500">
            Class of {year} — showing <span className="font-medium text-gray-700">{round || 'no round yet'}</span>
          </p>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: 'Total Participants', value: totalParticipants, color: '#022269' },
              { label: label('studying').replace('?', ''), value: studyingCount, color: '#2563eb' },
              { label: label('working').replace('?', ''), value: workingCount, color: '#7c3aed' },
              { label: 'Both Studying & Working', value: bothCount, color: '#16a34a' },
              { label: 'Not Studying or Working', value: neitherCount, color: '#dc2626' },
              { label: 'Needs Follow-up', value: followUpCount, color: '#ea580c' },
            ].map((tile) => (
              <div key={tile.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-2xl font-semibold" style={{ color: tile.color }}>{tile.value}</p>
                <p className="mt-1 text-xs font-medium text-gray-500">{tile.label}</p>
              </div>
            ))}
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">Status Breakdown</h3>
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-gray-100">
                  <tr><td className="py-1.5 text-gray-600">Both studying &amp; working</td><td className="py-1.5 text-right font-medium text-gray-900">{bothCount}</td></tr>
                  <tr><td className="py-1.5 text-gray-600">Studying only</td><td className="py-1.5 text-right font-medium text-gray-900">{studyingOnlyCount}</td></tr>
                  <tr><td className="py-1.5 text-gray-600">Working only</td><td className="py-1.5 text-right font-medium text-gray-900">{workingOnlyCount}</td></tr>
                  <tr><td className="py-1.5 text-gray-600">Neither</td><td className="py-1.5 text-right font-medium text-gray-900">{neitherCount}</td></tr>
                  <tr><td className="py-1.5 text-gray-600">No response yet</td><td className="py-1.5 text-right font-medium text-gray-900">{noResponseCount}</td></tr>
                </tbody>
              </table>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">Study vs Work Mode (Full-time / Part-time)</h3>
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-gray-400">
                  <tr>
                    <th className="py-1.5">Type</th>
                    <th className="py-1.5 text-right">Full-time</th>
                    <th className="py-1.5 text-right">Part-time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr><td className="py-1.5 text-gray-600">{label('studying').replace('?', '')}</td><td className="py-1.5 text-right font-medium text-gray-900">{studyFullTime}</td><td className="py-1.5 text-right font-medium text-gray-900">{studyPartTime}</td></tr>
                  <tr><td className="py-1.5 text-gray-600">{label('working').replace('?', '')}</td><td className="py-1.5 text-right font-medium text-gray-900">{workFullTime}</td><td className="py-1.5 text-right font-medium text-gray-900">{workPartTime}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">{label('areas_of_interest')}</h3>
            {interestRows.length === 0 ? (
              <p className="text-sm text-gray-400">No areas of interest recorded for this round yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
                {interestRows.map(([area, count]) => (
                  <div key={area} className="flex items-center justify-between border-b border-gray-100 py-1.5 text-sm">
                    <span className="text-gray-600">{area}</span>
                    <span className="font-medium text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">{label('follow_up')} — who needs it</h3>
            {followUpList.length === 0 ? (
              <p className="text-sm text-gray-400">No one flagged for follow-up this round.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-gray-400">
                  <tr>
                    <th className="py-1.5">{label('full_name')}</th>
                    <th className="py-1.5">Why</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {followUpList.map(({ carrier, u }) => (
                    <tr key={carrier.id}>
                      <td className="py-1.5 font-medium text-gray-900">{carrier.full_name}</td>
                      <td className="py-1.5 text-gray-600">{u?.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">{label('full_name')}</th>
                <th className="px-4 py-3">{label('family')}</th>
                <th className="px-4 py-3">{label('main_diploma')}</th>
                <th className="px-4 py-3">{round || 'Status'}</th>
                <th className="px-4 py-3">{label('follow_up_short')}</th>
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
                            <DetailField label={label('nic')} value={c.nic} onSave={(v) => updateCarrierField(c.id, 'nic', v)} readOnly={!canEdit} />
                            <DetailField label={label('date_of_birth')} value={c.date_of_birth} onSave={(v) => updateCarrierField(c.id, 'date_of_birth', v)} readOnly={!canEdit} />
                            <DetailField label={label('gender')} value={c.gender} onSave={(v) => updateCarrierField(c.id, 'gender', v)} readOnly={!canEdit} />
                            <DetailField label={label('mobile')} value={c.mobile} onSave={(v) => updateCarrierField(c.id, 'mobile', v)} readOnly={!canEdit} />
                            <DetailField label={label('whatsapp')} value={c.whatsapp} onSave={(v) => updateCarrierField(c.id, 'whatsapp', v)} readOnly={!canEdit} />
                            <DetailField label={label('email')} value={c.email} onSave={(v) => updateCarrierField(c.id, 'email', v)} readOnly={!canEdit} />
                            <DetailField label={label('address')} value={c.address} onSave={(v) => updateCarrierField(c.id, 'address', v)} readOnly={!canEdit} />
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
      )}
    </div>
  )
}
