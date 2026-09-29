'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Phase = { id: string; name: string; is_baseline: boolean; sort_order: number; color: string }
type Component = { id: string; phase_id: string; name: string; min_score: number; max_score: number; weight: number; sort_order: number }
type Participant = { id: string; full_name: string; family_id: string | null; status: string }
type Family = { id: string; name: string; display_color: string }
type ScoreEntry = { scoreId: string; notes: string | null; values: Record<string, number> } // componentId -> raw_value
type Band = { id: string; name: string; color: string; min_pgi: number; sort_order: number }
type Trajectory = { id: string; name: string; color: string; min_growth: number; sort_order: number }

function colorStyle(hex: string) {
  return { backgroundColor: `${hex}1A`, borderColor: hex, color: hex }
}

export default function Assessments({ canManagePhases = false }: { canManagePhases?: boolean }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [phases, setPhases] = useState<Phase[]>([])
  const [components, setComponents] = useState<Component[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [families, setFamilies] = useState<Family[]>([])
  const [scores, setScores] = useState<Record<string, ScoreEntry>>({}) // `${phaseId}|${participantId}`
  const [bands, setBands] = useState<Band[]>([])
  const [trajectories, setTrajectories] = useState<Trajectory[]>([])

  const [view, setView] = useState<'participants' | 'leaderboard' | 'family'>('participants')
  const [familyFilter, setFamilyFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('Active')
  const [search, setSearch] = useState('')
  const [showManage, setShowManage] = useState(false)
  const [showColours, setShowColours] = useState(false)

  const [newBand, setNewBand] = useState({ name: '', color: '#0891b2', min: '' })
  const [newTrajectory, setNewTrajectory] = useState({ name: '', color: '#0891b2', min: '' })

  const [editTarget, setEditTarget] = useState<{ phaseId: string; participantId: string } | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [editNotes, setEditNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const [newPhaseName, setNewPhaseName] = useState('')
  const [newComponentByPhase, setNewComponentByPhase] = useState<Record<string, { name: string; min: string; max: string; weight: string }>>({})

  const load = useCallback(async () => {
    setLoading(true)
    const [
      { data: phaseData },
      { data: componentData },
      { data: participantData },
      { data: familyData },
      { data: scoreData },
      { data: componentScoreData },
      { data: bandData },
      { data: trajectoryData },
    ] = await Promise.all([
      supabase.from('assessment_phases').select('id, name, is_baseline, sort_order, color').order('sort_order'),
      supabase.from('assessment_components').select('id, phase_id, name, min_score, max_score, weight, sort_order').order('sort_order'),
      supabase.from('participants').select('id, full_name, family_id, status').order('full_name'),
      supabase.from('families').select('id, name, display_color').order('name'),
      supabase.from('assessment_scores').select('id, phase_id, participant_id, notes'),
      supabase.from('assessment_component_scores').select('assessment_score_id, component_id, raw_value'),
      supabase.from('assessment_bands').select('id, name, color, min_pgi, sort_order').order('min_pgi', { ascending: false }),
      supabase.from('assessment_trajectories').select('id, name, color, min_growth, sort_order').order('min_growth', { ascending: false }),
    ])

    setPhases(phaseData ?? [])
    setComponents(componentData ?? [])
    setParticipants(participantData ?? [])
    setFamilies(familyData ?? [])
    setBands(bandData ?? [])
    setTrajectories(trajectoryData ?? [])

    const byScoreId: Record<string, Record<string, number>> = {}
    for (const cs of componentScoreData ?? []) {
      byScoreId[cs.assessment_score_id] = byScoreId[cs.assessment_score_id] ?? {}
      byScoreId[cs.assessment_score_id][cs.component_id] = Number(cs.raw_value)
    }
    const map: Record<string, ScoreEntry> = {}
    for (const s of scoreData ?? []) {
      map[`${s.phase_id}|${s.participant_id}`] = {
        scoreId: s.id,
        notes: s.notes,
        values: byScoreId[s.id] ?? {},
      }
    }
    setScores(map)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  const componentsByPhase = useMemo(() => {
    const m: Record<string, Component[]> = {}
    for (const c of components) {
      m[c.phase_id] = m[c.phase_id] ?? []
      m[c.phase_id].push(c)
    }
    return m
  }, [components])

  const baselinePhase = phases.find((p) => p.is_baseline) ?? null

  function pgiFor(phaseId: string, participantId: string): number | null {
    const comps = componentsByPhase[phaseId] ?? []
    if (comps.length === 0) return null
    const entry = scores[`${phaseId}|${participantId}`]
    if (!entry) return null
    let weighted = 0
    let totalWeight = 0
    for (const c of comps) {
      const raw = entry.values[c.id]
      if (raw == null) return null
      const range = c.max_score - c.min_score
      const pct = range > 0 ? ((raw - c.min_score) / range) * 100 : 0
      weighted += pct * c.weight
      totalWeight += c.weight
    }
    return totalWeight > 0 ? Math.round((weighted / totalWeight) * 10) / 10 : null
  }

  function bandOf(pgi: number | null): Band | null {
    if (pgi == null) return null
    return bands.find((b) => pgi >= b.min_pgi) ?? null
  }

  function trajectoryOf(growth: number | null): Trajectory | null {
    if (growth == null) return null
    return trajectories.find((t) => growth >= t.min_growth) ?? null
  }

  function growthFor(phaseId: string, participantId: string): number | null {
    if (!baselinePhase) return null
    const base = pgiFor(baselinePhase.id, participantId)
    const phase = pgiFor(phaseId, participantId)
    if (base == null || phase == null || base === 0) return null
    return Math.round(((phase - base) / base) * 1000) / 10
  }

  function latestScored(participantId: string): Phase | null {
    for (let i = phases.length - 1; i >= 0; i--) {
      if (pgiFor(phases[i].id, participantId) != null) return phases[i]
    }
    return null
  }

  function familyName(id: string | null) {
    return families.find((f) => f.id === id)?.name ?? '—'
  }
  function familyColor(id: string | null) {
    return families.find((f) => f.id === id)?.display_color ?? '#9ca3af'
  }

  const statusFilteredParticipants = participants.filter((p) => statusFilter === 'all' || p.status === statusFilter)

  const visibleParticipants = statusFilteredParticipants.filter((p) => {
    const matchesFamily = familyFilter === 'all' || p.family_id === familyFilter
    const matchesSearch = p.full_name.toLowerCase().includes(search.toLowerCase())
    return matchesFamily && matchesSearch
  })

  // ---------- Score entry ----------

  function openEntry(phaseId: string, participantId: string) {
    const entry = scores[`${phaseId}|${participantId}`]
    const comps = componentsByPhase[phaseId] ?? []
    const values: Record<string, string> = {}
    for (const c of comps) {
      values[c.id] = entry?.values[c.id] != null ? String(entry.values[c.id]) : ''
    }
    setEditValues(values)
    setEditNotes(entry?.notes ?? '')
    setEditTarget({ phaseId, participantId })
  }

  async function saveEntry() {
    if (!editTarget) return
    setSaving(true)
    const { phaseId, participantId } = editTarget
    const { data: userData } = await supabase.auth.getUser()

    const { data: scoreRow } = await supabase
      .from('assessment_scores')
      .upsert(
        { phase_id: phaseId, participant_id: participantId, notes: editNotes || null, entered_by: userData.user?.id, updated_at: new Date().toISOString() },
        { onConflict: 'phase_id,participant_id' }
      )
      .select('id')
      .single()

    if (scoreRow) {
      const comps = componentsByPhase[phaseId] ?? []
      const rows = comps
        .filter((c) => editValues[c.id] !== '' && editValues[c.id] != null)
        .map((c) => ({ assessment_score_id: scoreRow.id, component_id: c.id, raw_value: Number(editValues[c.id]) }))
      if (rows.length > 0) {
        await supabase.from('assessment_component_scores').upsert(rows, { onConflict: 'assessment_score_id,component_id' })
      }
    }

    setSaving(false)
    setEditTarget(null)
    load()
  }

  async function deleteEntry() {
    if (!editTarget) return
    const entry = scores[`${editTarget.phaseId}|${editTarget.participantId}`]
    if (!entry) {
      setEditTarget(null)
      return
    }
    if (!confirm('Clear this score entry?')) return
    await supabase.from('assessment_scores').delete().eq('id', entry.scoreId)
    setEditTarget(null)
    load()
  }

  // ---------- Phase / rubric management ----------

  async function addPhase(e: React.FormEvent) {
    e.preventDefault()
    if (!newPhaseName.trim()) return
    await supabase.from('assessment_phases').insert({ name: newPhaseName.trim(), sort_order: phases.length })
    setNewPhaseName('')
    load()
  }

  async function renamePhase(id: string, name: string) {
    if (!name.trim()) return
    await supabase.from('assessment_phases').update({ name: name.trim() }).eq('id', id)
    load()
  }

  async function updatePhaseColor(id: string, color: string) {
    await supabase.from('assessment_phases').update({ color }).eq('id', id)
    load()
  }

  async function renameBand(id: string, name: string) {
    if (!name.trim()) return
    await supabase.from('assessment_bands').update({ name: name.trim() }).eq('id', id)
    load()
  }

  async function updateBandColor(id: string, color: string) {
    await supabase.from('assessment_bands').update({ color }).eq('id', id)
    load()
  }

  async function updateBandThreshold(id: string, minPgi: string) {
    await supabase.from('assessment_bands').update({ min_pgi: Number(minPgi) || 0 }).eq('id', id)
    load()
  }

  async function deleteBand(id: string, name: string) {
    if (!confirm(`Remove the "${name}" band?`)) return
    await supabase.from('assessment_bands').delete().eq('id', id)
    load()
  }

  async function addBand(e: React.FormEvent) {
    e.preventDefault()
    if (!newBand.name.trim() || newBand.min === '') return
    await supabase.from('assessment_bands').insert({
      name: newBand.name.trim(),
      color: newBand.color,
      min_pgi: Number(newBand.min) || 0,
      sort_order: bands.length,
    })
    setNewBand({ name: '', color: '#0891b2', min: '' })
    load()
  }

  async function renameTrajectory(id: string, name: string) {
    if (!name.trim()) return
    await supabase.from('assessment_trajectories').update({ name: name.trim() }).eq('id', id)
    load()
  }

  async function updateTrajectoryColor(id: string, color: string) {
    await supabase.from('assessment_trajectories').update({ color }).eq('id', id)
    load()
  }

  async function updateTrajectoryThreshold(id: string, minGrowth: string) {
    await supabase.from('assessment_trajectories').update({ min_growth: Number(minGrowth) || 0 }).eq('id', id)
    load()
  }

  async function deleteTrajectory(id: string, name: string) {
    if (!confirm(`Remove the "${name}" trajectory?`)) return
    await supabase.from('assessment_trajectories').delete().eq('id', id)
    load()
  }

  async function addTrajectory(e: React.FormEvent) {
    e.preventDefault()
    if (!newTrajectory.name.trim() || newTrajectory.min === '') return
    await supabase.from('assessment_trajectories').insert({
      name: newTrajectory.name.trim(),
      color: newTrajectory.color,
      min_growth: Number(newTrajectory.min) || 0,
      sort_order: trajectories.length,
    })
    setNewTrajectory({ name: '', color: '#0891b2', min: '' })
    load()
  }

  async function setBaseline(id: string) {
    await Promise.all(phases.map((p) => supabase.from('assessment_phases').update({ is_baseline: p.id === id }).eq('id', p.id)))
    load()
  }

  async function deletePhase(id: string, name: string) {
    if (!confirm(`Delete phase "${name}" and every score entered for it? This can't be undone.`)) return
    await supabase.from('assessment_phases').delete().eq('id', id)
    load()
  }

  async function updateComponent(id: string, field: 'name' | 'min_score' | 'max_score' | 'weight', value: string) {
    const payload = field === 'name' ? { name: value } : { [field]: Number(value) || 0 }
    await supabase.from('assessment_components').update(payload).eq('id', id)
    load()
  }

  async function deleteComponent(id: string) {
    if (!confirm('Remove this scoring component? Any scores entered for it will be lost.')) return
    await supabase.from('assessment_components').delete().eq('id', id)
    load()
  }

  async function addComponent(phaseId: string, e: React.FormEvent) {
    e.preventDefault()
    const draft = newComponentByPhase[phaseId]
    if (!draft?.name.trim()) return
    await supabase.from('assessment_components').insert({
      phase_id: phaseId,
      name: draft.name.trim(),
      min_score: Number(draft.min) || 0,
      max_score: Number(draft.max) || 100,
      weight: Number(draft.weight) || 1,
      sort_order: (componentsByPhase[phaseId] ?? []).length,
    })
    setNewComponentByPhase((prev) => ({ ...prev, [phaseId]: { name: '', min: '', max: '', weight: '' } }))
    load()
  }

  if (loading) return <p className="text-sm text-gray-400">Loading...</p>

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">Assessments</h1>
        {canManagePhases && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowColours((v) => !v)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {showColours ? 'Hide Colours' : 'Edit Colours'}
            </button>
            <button
              onClick={() => setShowManage((v) => !v)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {showManage ? 'Hide Phase Setup' : 'Manage Phases'}
            </button>
          </div>
        )}
      </div>

      {showColours && canManagePhases && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Phase colours</h2>
          <div className="mb-6 space-y-3">
            {phases.map((phase) => (
              <div key={phase.id} className="flex flex-wrap items-center gap-3">
                <input
                  type="color"
                  value={phase.color}
                  onChange={(e) => updatePhaseColor(phase.id, e.target.value)}
                  className="h-9 w-9 cursor-pointer rounded border border-gray-300"
                />
                <input
                  type="text"
                  defaultValue={phase.name}
                  onBlur={(e) => renamePhase(phase.id, e.target.value)}
                  className="w-56 rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
                <span className="rounded-full border px-2 py-1 text-xs font-medium" style={colorStyle(phase.color)}>
                  Preview
                </span>
              </div>
            ))}
          </div>

          <h2 className="mb-1 text-base font-semibold text-gray-900">PGI band colours</h2>
          <p className="mb-3 text-xs text-gray-500">A score qualifies for a band once it reaches that band&apos;s threshold (the highest one it clears).</p>
          <div className="mb-4 space-y-3">
            {bands.map((band) => (
              <div key={band.id} className="flex flex-wrap items-center gap-3">
                <input
                  type="color"
                  value={band.color}
                  onChange={(e) => updateBandColor(band.id, e.target.value)}
                  className="h-9 w-9 cursor-pointer rounded border border-gray-300"
                />
                <input
                  type="text"
                  defaultValue={band.name}
                  onBlur={(e) => renameBand(band.id, e.target.value)}
                  className="w-40 rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
                <span className="text-xs text-gray-400">at least</span>
                <input
                  type="number"
                  defaultValue={band.min_pgi}
                  onBlur={(e) => updateBandThreshold(band.id, e.target.value)}
                  className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
                <span className="rounded-full border px-2 py-1 text-xs font-medium" style={colorStyle(band.color)}>
                  Preview
                </span>
                <button onClick={() => deleteBand(band.id, band.name)} className="text-xs font-medium text-red-600 hover:underline">
                  Remove
                </button>
              </div>
            ))}
          </div>
          <form onSubmit={addBand} className="mb-6 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
            <input type="color" value={newBand.color} onChange={(e) => setNewBand((p) => ({ ...p, color: e.target.value }))} className="h-9 w-9 cursor-pointer rounded border border-gray-300" />
            <input
              type="text"
              placeholder="Band name"
              value={newBand.name}
              onChange={(e) => setNewBand((p) => ({ ...p, name: e.target.value }))}
              className="w-40 rounded-md border border-gray-300 px-2 py-1 text-sm"
            />
            <span className="text-xs text-gray-400">at least</span>
            <input
              type="number"
              placeholder="threshold"
              value={newBand.min}
              onChange={(e) => setNewBand((p) => ({ ...p, min: e.target.value }))}
              className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm"
            />
            <button type="submit" className="rounded-md bg-[#022269] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">
              + Add band
            </button>
          </form>

          <h2 className="mb-1 text-base font-semibold text-gray-900">Growth trajectory colours</h2>
          <p className="mb-3 text-xs text-gray-500">A growth % qualifies for a trajectory once it reaches that trajectory&apos;s threshold (the highest one it clears).</p>
          <div className="space-y-3">
            {trajectories.map((traj) => (
              <div key={traj.id} className="flex flex-wrap items-center gap-3">
                <input
                  type="color"
                  value={traj.color}
                  onChange={(e) => updateTrajectoryColor(traj.id, e.target.value)}
                  className="h-9 w-9 cursor-pointer rounded border border-gray-300"
                />
                <input
                  type="text"
                  defaultValue={traj.name}
                  onBlur={(e) => renameTrajectory(traj.id, e.target.value)}
                  className="w-40 rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
                <span className="text-xs text-gray-400">at least</span>
                <input
                  type="number"
                  defaultValue={traj.min_growth}
                  onBlur={(e) => updateTrajectoryThreshold(traj.id, e.target.value)}
                  className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
                <span className="text-xs text-gray-400">% growth</span>
                <span className="rounded-full border px-2 py-1 text-xs font-medium" style={colorStyle(traj.color)}>
                  Preview
                </span>
                <button onClick={() => deleteTrajectory(traj.id, traj.name)} className="text-xs font-medium text-red-600 hover:underline">
                  Remove
                </button>
              </div>
            ))}
          </div>
          <form onSubmit={addTrajectory} className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
            <input type="color" value={newTrajectory.color} onChange={(e) => setNewTrajectory((p) => ({ ...p, color: e.target.value }))} className="h-9 w-9 cursor-pointer rounded border border-gray-300" />
            <input
              type="text"
              placeholder="Trajectory name"
              value={newTrajectory.name}
              onChange={(e) => setNewTrajectory((p) => ({ ...p, name: e.target.value }))}
              className="w-40 rounded-md border border-gray-300 px-2 py-1 text-sm"
            />
            <span className="text-xs text-gray-400">at least</span>
            <input
              type="number"
              placeholder="threshold"
              value={newTrajectory.min}
              onChange={(e) => setNewTrajectory((p) => ({ ...p, min: e.target.value }))}
              className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm"
            />
            <span className="text-xs text-gray-400">% growth</span>
            <button type="submit" className="rounded-md bg-[#022269] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">
              + Add trajectory
            </button>
          </form>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span className="font-medium text-gray-600">Key:</span>
        {bands.map((b) => (
          <span key={b.id} className="rounded-full border px-2 py-0.5" style={colorStyle(b.color)}>{b.name}</span>
        ))}
        <span className="mx-1 text-gray-300">|</span>
        {trajectories.map((t) => (
          <span key={t.id} className="rounded-full border px-2 py-0.5" style={colorStyle(t.color)}>{t.name}</span>
        ))}
      </div>

      {showManage && canManagePhases && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-base font-semibold text-gray-900">Assessment phases</h2>
          <p className="mb-4 text-xs text-gray-500">
            Each phase can measure something different. Give it a name, mark which one is the baseline
            (growth % is measured from that one), and list what gets scored - each part&apos;s
            &quot;out of&quot; and its share of the phase&apos;s overall score.
          </p>
          <div className="space-y-5">
            {phases.map((phase) => (
              <div key={phase.id} className="rounded-lg border border-gray-200 p-4">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    defaultValue={phase.name}
                    onBlur={(e) => renamePhase(phase.id, e.target.value)}
                    className="w-56 rounded-md border border-gray-300 px-2 py-1.5 text-sm font-medium"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-gray-600">
                    <input type="radio" checked={phase.is_baseline} onChange={() => setBaseline(phase.id)} />
                    Baseline (growth measured from this one)
                  </label>
                  <button onClick={() => deletePhase(phase.id, phase.name)} className="ml-auto text-xs font-medium text-red-600 hover:underline">
                    Delete phase
                  </button>
                </div>
                <div className="space-y-2">
                  {(componentsByPhase[phase.id] ?? []).map((c) => (
                    <div key={c.id} className="flex flex-wrap items-center gap-2 text-sm">
                      <input
                        type="text"
                        defaultValue={c.name}
                        onBlur={(e) => updateComponent(c.id, 'name', e.target.value)}
                        className="w-40 rounded-md border border-gray-300 px-2 py-1"
                      />
                      <span className="text-xs text-gray-400">lowest possible</span>
                      <input
                        type="number"
                        defaultValue={c.min_score}
                        onBlur={(e) => updateComponent(c.id, 'min_score', e.target.value)}
                        className="w-16 rounded-md border border-gray-300 px-2 py-1"
                      />
                      <span className="text-xs text-gray-400">highest possible</span>
                      <input
                        type="number"
                        defaultValue={c.max_score}
                        onBlur={(e) => updateComponent(c.id, 'max_score', e.target.value)}
                        className="w-20 rounded-md border border-gray-300 px-2 py-1"
                      />
                      <span className="text-xs text-gray-400">weight</span>
                      <input
                        type="number"
                        step="0.1"
                        defaultValue={c.weight}
                        onBlur={(e) => updateComponent(c.id, 'weight', e.target.value)}
                        className="w-20 rounded-md border border-gray-300 px-2 py-1"
                      />
                      <button onClick={() => deleteComponent(c.id)} className="text-xs text-red-600 hover:underline">
                        Remove
                      </button>
                    </div>
                  ))}
                  <form onSubmit={(e) => addComponent(phase.id, e)} className="flex flex-wrap items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="New component name"
                      value={newComponentByPhase[phase.id]?.name ?? ''}
                      onChange={(e) =>
                        setNewComponentByPhase((prev) => ({
                          ...prev,
                          [phase.id]: { ...(prev[phase.id] ?? { min: '', max: '', weight: '' }), name: e.target.value },
                        }))
                      }
                      className="w-40 rounded-md border border-gray-300 px-2 py-1 text-sm"
                    />
                    <input
                      type="number"
                      placeholder="lowest (usually 0)"
                      value={newComponentByPhase[phase.id]?.min ?? ''}
                      onChange={(e) =>
                        setNewComponentByPhase((prev) => ({
                          ...prev,
                          [phase.id]: { ...(prev[phase.id] ?? { name: '', max: '', weight: '' }), min: e.target.value },
                        }))
                      }
                      className="w-28 rounded-md border border-gray-300 px-2 py-1 text-sm"
                    />
                    <input
                      type="number"
                      placeholder="highest"
                      value={newComponentByPhase[phase.id]?.max ?? ''}
                      onChange={(e) =>
                        setNewComponentByPhase((prev) => ({
                          ...prev,
                          [phase.id]: { ...(prev[phase.id] ?? { name: '', min: '', weight: '' }), max: e.target.value },
                        }))
                      }
                      className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
                    />
                    <input
                      type="number"
                      step="0.1"
                      placeholder="weight"
                      value={newComponentByPhase[phase.id]?.weight ?? ''}
                      onChange={(e) =>
                        setNewComponentByPhase((prev) => ({
                          ...prev,
                          [phase.id]: { ...(prev[phase.id] ?? { name: '', min: '', max: '' }), weight: e.target.value },
                        }))
                      }
                      className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
                    />
                    <button type="submit" className="rounded-md bg-[#022269] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">
                      + Add part
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={addPhase} className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
            <input
              type="text"
              value={newPhaseName}
              onChange={(e) => setNewPhaseName(e.target.value)}
              placeholder="New phase name, e.g. ⑤ Phase 3"
              className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded-md bg-[#022269] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">
              + Add Phase
            </button>
          </form>
        </div>
      )}

      {editTarget && (() => {
        const phase = phases.find((p) => p.id === editTarget.phaseId)
        const participant = participants.find((p) => p.id === editTarget.participantId)
        const comps = componentsByPhase[editTarget.phaseId] ?? []
        return (
          <div className="mb-6 rounded-xl border border-[#022269]/30 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-gray-900">
              {participant?.full_name} — {phase?.name}
            </h2>
            <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {comps.map((c) => (
                <div key={c.id}>
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    {c.name} ({c.min_score > 0 ? `${c.min_score}–${c.max_score} scale` : `out of ${c.max_score}`})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editValues[c.id] ?? ''}
                    onChange={(e) => setEditValues((prev) => ({ ...prev, [c.id]: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
              ))}
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-gray-500">Notes (optional)</label>
              <input
                type="text"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveEntry}
                disabled={saving}
                className="rounded-md bg-[#022269] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setEditTarget(null)} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              {scores[`${editTarget.phaseId}|${editTarget.participantId}`] && (
                <button onClick={deleteEntry} className="ml-auto text-sm font-medium text-red-600 hover:underline">
                  Clear entry
                </button>
              )}
            </div>
          </div>
        )
      })()}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(['participants', 'leaderboard', 'family'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                view === v ? 'bg-[#022269] text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {v === 'participants' ? 'By Participant' : v === 'leaderboard' ? 'Growth Leaderboard' : 'Family Growth'}
            </button>
          ))}
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="Active">Active only</option>
          <option value="On Leave">On Leave only</option>
          <option value="Left">Left only</option>
          <option value="Deceased">Deceased only</option>
          <option value="all">All statuses (everyone ever enrolled)</option>
        </select>
      </div>

      {phases.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500">
          No assessment phases set up yet.{canManagePhases ? ' Click "Manage Phases" above to add one.' : ''}
        </p>
      ) : view === 'participants' ? (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
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
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Family</th>
                  {phases.map((p) => (
                    <th key={p.id} className="px-4 py-3" style={{ color: p.color }}>{p.name}</th>
                  ))}
                  <th className="px-4 py-3">Latest PGI</th>
                  <th className="px-4 py-3">Trajectory</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleParticipants.map((participant) => {
                  const latest = latestScored(participant.id)
                  const latestPgi = latest ? pgiFor(latest.id, participant.id) : null
                  const latestGrowth = latest ? growthFor(latest.id, participant.id) : null
                  const traj = trajectoryOf(latestGrowth)
                  return (
                    <tr key={participant.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-900">{participant.full_name}</td>
                      <td className="px-4 py-2">
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: `${familyColor(participant.family_id)}1A`, color: familyColor(participant.family_id) }}
                        >
                          {familyName(participant.family_id)}
                        </span>
                      </td>
                      {phases.map((phase) => {
                        const pgi = pgiFor(phase.id, participant.id)
                        const band = bandOf(pgi)
                        return (
                          <td key={phase.id} className="px-4 py-2">
                            <button
                              onClick={() => openEntry(phase.id, participant.id)}
                              className="rounded-md border px-2 py-1 text-xs font-medium hover:opacity-80"
                              style={band ? colorStyle(band.color) : { borderColor: '#e5e7eb', color: '#9ca3af' }}
                            >
                              {pgi != null ? pgi : '+ Enter'}
                            </button>
                          </td>
                        )
                      })}
                      <td className="px-4 py-2 font-semibold text-gray-900">{latestPgi ?? '—'}</td>
                      <td className="px-4 py-2">
                        {traj ? (
                          <span className="text-xs font-medium" style={{ color: traj.color }}>{traj.name}</span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {visibleParticipants.length === 0 && (
                  <tr>
                    <td colSpan={phases.length + 4} className="px-4 py-8 text-center text-gray-400">
                      No participants match.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : view === 'leaderboard' ? (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Family</th>
                <th className="px-4 py-3">{baselinePhase?.name ?? 'Baseline'}</th>
                <th className="px-4 py-3">Latest Phase</th>
                <th className="px-4 py-3">Latest PGI</th>
                <th className="px-4 py-3">Growth</th>
                <th className="px-4 py-3">Trajectory</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(() => {
                const rows = statusFilteredParticipants
                  .map((p) => {
                    const latest = latestScored(p.id)
                    if (!latest || !baselinePhase) return null
                    const growth = growthFor(latest.id, p.id)
                    if (growth == null) return null
                    return {
                      participant: p,
                      baselinePgi: pgiFor(baselinePhase.id, p.id),
                      latest,
                      latestPgi: pgiFor(latest.id, p.id),
                      growth,
                    }
                  })
                  .filter((r): r is NonNullable<typeof r> => r != null)
                  .sort((a, b) => b.growth - a.growth)

                if (rows.length === 0) {
                  return (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                        Nobody has both a baseline and a later phase scored yet.
                      </td>
                    </tr>
                  )
                }
                return rows.map((r, i) => {
                  const traj = trajectoryOf(r.growth)
                  return (
                    <tr key={r.participant.id}>
                      <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-2 font-medium text-gray-900">{r.participant.full_name}</td>
                      <td className="px-4 py-2">{familyName(r.participant.family_id)}</td>
                      <td className="px-4 py-2">{r.baselinePgi ?? '—'}</td>
                      <td className="px-4 py-2">{r.latest.name}</td>
                      <td className="px-4 py-2 font-semibold text-gray-900">{r.latestPgi ?? '—'}</td>
                      <td className={`px-4 py-2 font-medium ${r.growth >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {r.growth >= 0 ? '+' : ''}{r.growth}%
                      </td>
                      <td className="px-4 py-2 text-xs font-medium" style={{ color: traj?.color }}>{traj?.name}</td>
                    </tr>
                  )
                })
              })()}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Family</th>
                <th className="px-4 py-3">Participants</th>
                {phases.map((p) => (
                  <th key={p.id} className="px-4 py-3" style={{ color: p.color }}>{p.name} mean</th>
                ))}
                <th className="px-4 py-3">Avg Growth</th>
                <th className="px-4 py-3">
                  {trajectories.map((t, i) => (
                    <span key={t.id}>
                      {i > 0 && ' / '}
                      <span style={{ color: t.color }}>{t.name}</span>
                    </span>
                  ))}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {families.map((family) => {
                const members = statusFilteredParticipants.filter((p) => p.family_id === family.id)
                const phaseMeans = phases.map((phase) => {
                  const vals = members.map((m) => pgiFor(phase.id, m.id)).filter((v): v is number => v != null)
                  return vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null
                })
                const growths = members
                  .map((m) => {
                    const latest = latestScored(m.id)
                    return latest ? growthFor(latest.id, m.id) : null
                  })
                  .filter((g): g is number => g != null)
                const avgGrowth = growths.length > 0 ? Math.round((growths.reduce((a, b) => a + b, 0) / growths.length) * 10) / 10 : null
                const trajectoryCounts = trajectories.map((t) => growths.filter((g) => trajectoryOf(g)?.id === t.id).length)
                return (
                  <tr key={family.id}>
                    <td className="px-4 py-2 font-medium" style={{ color: family.display_color }}>{family.name}</td>
                    <td className="px-4 py-2">{members.length}</td>
                    {phaseMeans.map((mean, i) => (
                      <td key={phases[i].id} className="px-4 py-2">{mean ?? '—'}</td>
                    ))}
                    <td className={`px-4 py-2 font-medium ${avgGrowth != null && avgGrowth >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {avgGrowth != null ? `${avgGrowth >= 0 ? '+' : ''}${avgGrowth}%` : '—'}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">{trajectoryCounts.join(' / ')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
