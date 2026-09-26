'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
  { label: 'Families', href: '/admin/groups' },
  { label: 'Settings', href: '/admin/settings' },
]

type Facilitator = {
  id: string
  full_name: string
  phone: string | null
  email: string | null
  role_title: string | null
  join_date: string | null
  status: string
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  notes: string | null
  sort_order: number
}

type LeaveEntry = {
  id: string
  facilitator_id: string
  leave_start_date: string
  leave_end_date: string
  leave_type: string
  reason: string | null
  created_at: string
}

type Announcement = {
  id: string
  title: string
  body: string
  urgent: boolean
  posted_at: string
}

const LEAVE_TYPES = [
  'Full day - sick leave',
  'Half day - sick',
  'Full day - casual',
  'Half day - casual',
  'Short leave',
]

const todayISO = () => new Date().toISOString().slice(0, 10)

export default function FacilitatorsPage() {
  const supabase = createClient()
  const [facilitators, setFacilitators] = useState<Facilitator[]>([])
  const [leave, setLeave] = useState<LeaveEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [savingField, setSavingField] = useState(false)

  const [showAddFacilitator, setShowAddFacilitator] = useState(false)
  const [newFacilitatorName, setNewFacilitatorName] = useState('')

  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [showAddAnnouncement, setShowAddAnnouncement] = useState(false)
  const [announcementTitle, setAnnouncementTitle] = useState('')
  const [announcementBody, setAnnouncementBody] = useState('')
  const [announcementUrgent, setAnnouncementUrgent] = useState(false)
  const [savingAnnouncement, setSavingAnnouncement] = useState(false)

  const [showAddLeave, setShowAddLeave] = useState(false)
  const [leaveStart, setLeaveStart] = useState(todayISO())
  const [leaveEnd, setLeaveEnd] = useState(todayISO())
  const [leaveType, setLeaveType] = useState(LEAVE_TYPES[0])
  const [leaveReason, setLeaveReason] = useState('')
  const [savingLeave, setSavingLeave] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: facilitatorData }, { data: leaveData }, { data: announcementData }] = await Promise.all([
      supabase.from('facilitators').select('*').order('sort_order').order('full_name'),
      supabase.from('facilitator_leave').select('*').order('leave_start_date', { ascending: false }),
      supabase
        .from('announcements')
        .select('id, title, body, urgent, posted_at')
        .eq('target_role', 'facilitator')
        .order('posted_at', { ascending: false }),
    ])
    setFacilitators(facilitatorData ?? [])
    setLeave(leaveData ?? [])
    setAnnouncements(announcementData ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!selectedId && facilitators.length > 0) {
      setSelectedId(facilitators[0].id)
    }
  }, [facilitators, selectedId])

  const today = todayISO()
  const onLeaveTodayIds = useMemo(() => {
    const ids = new Set<string>()
    for (const l of leave) {
      if (l.leave_start_date <= today && today <= l.leave_end_date) ids.add(l.facilitator_id)
    }
    return ids
  }, [leave, today])

  const selected = facilitators.find((f) => f.id === selectedId) ?? null
  const selectedLeave = leave.filter((l) => l.facilitator_id === selectedId)

  const activeFacilitators = facilitators.filter((f) => f.status === 'Active')
  const todayLeaveEntries = useMemo(
    () => leave.filter((l) => l.leave_start_date <= today && today <= l.leave_end_date),
    [leave, today]
  )
  const activeOnLeaveTodayCount = activeFacilitators.filter((f) => onLeaveTodayIds.has(f.id)).length
  const presentTodayCount = activeFacilitators.length - activeOnLeaveTodayCount
  const leaveTypeBreakdownToday = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const l of todayLeaveEntries) counts[l.leave_type] = (counts[l.leave_type] ?? 0) + 1
    return counts
  }, [todayLeaveEntries])

  async function updateField(id: string, field: keyof Facilitator, value: string) {
    setFacilitators((prev) => prev.map((f) => (f.id === id ? { ...f, [field]: value } : f)))
    setSavingField(true)
    await supabase.from('facilitators').update({ [field]: value }).eq('id', id)
    setSavingField(false)
  }

  async function addFacilitator(e: React.FormEvent) {
    e.preventDefault()
    if (!newFacilitatorName.trim()) return
    const { data } = await supabase
      .from('facilitators')
      .insert({ full_name: newFacilitatorName.trim(), sort_order: facilitators.length })
      .select()
      .single()
    setNewFacilitatorName('')
    setShowAddFacilitator(false)
    await load()
    if (data) setSelectedId(data.id)
  }

  async function postAnnouncement(e: React.FormEvent) {
    e.preventDefault()
    if (!announcementTitle.trim() || !announcementBody.trim()) return
    setSavingAnnouncement(true)
    const { data: userData } = await supabase.auth.getUser()
    await supabase.from('announcements').insert({
      title: announcementTitle.trim(),
      body: announcementBody.trim(),
      urgent: announcementUrgent,
      target_role: 'facilitator',
      posted_by: userData.user?.id,
    })
    setAnnouncementTitle('')
    setAnnouncementBody('')
    setAnnouncementUrgent(false)
    setShowAddAnnouncement(false)
    setSavingAnnouncement(false)
    load()
  }

  async function deleteAnnouncement(id: string) {
    if (!confirm('Remove this announcement?')) return
    await supabase.from('announcements').delete().eq('id', id)
    load()
  }

  async function deleteFacilitator(f: Facilitator) {
    if (!confirm(`Remove ${f.full_name} from the Facilitators list? This can't be undone.`)) return
    await supabase.from('facilitators').delete().eq('id', f.id)
    setSelectedId(null)
    load()
  }

  async function addLeave(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedId) return
    if (leaveEnd < leaveStart) {
      alert('The end date has to be on or after the start date.')
      return
    }
    setSavingLeave(true)
    const { data: userData } = await supabase.auth.getUser()
    await supabase.from('facilitator_leave').insert({
      facilitator_id: selectedId,
      leave_start_date: leaveStart,
      leave_end_date: leaveEnd,
      leave_type: leaveType,
      reason: leaveReason.trim() || null,
      logged_by: userData.user?.id,
    })
    setLeaveStart(todayISO())
    setLeaveEnd(todayISO())
    setLeaveType(LEAVE_TYPES[0])
    setLeaveReason('')
    setShowAddLeave(false)
    setSavingLeave(false)
    load()
  }

  async function deleteLeave(id: string) {
    if (!confirm('Remove this leave entry?')) return
    await supabase.from('facilitator_leave').delete().eq('id', id)
    load()
  }

  return (
    <DashboardShell roleLabel="Administration" navItems={navItems}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">Facilitators</h1>
        <button
          onClick={() => setShowAddFacilitator((v) => !v)}
          className="rounded-md bg-[#022269] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Add Facilitator
        </button>
      </div>

      {showAddFacilitator && (
        <form
          onSubmit={addFacilitator}
          className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Full name</label>
            <input
              type="text"
              required
              value={newFacilitatorName}
              onChange={(e) => setNewFacilitatorName(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-[#022269] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Save
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : facilitators.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
          No facilitators yet. Add one above.
        </div>
      ) : (
        <>
          {/* Today's dashboard */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500">Facilitators</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{facilitators.length}</p>
              <p className="text-xs text-gray-400">{activeFacilitators.length} active</p>
            </div>
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 shadow-sm">
              <p className="text-xs font-medium text-green-700">Present Today</p>
              <p className="mt-1 text-2xl font-semibold text-green-800">{presentTodayCount}</p>
              <p className="text-xs text-green-600">of {activeFacilitators.length} active</p>
            </div>
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 shadow-sm">
              <p className="text-xs font-medium text-yellow-700">On Leave Today</p>
              <p className="mt-1 text-2xl font-semibold text-yellow-800">{todayLeaveEntries.length}</p>
              <p className="text-xs text-yellow-600">{activeOnLeaveTodayCount} of them active</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500">Inactive</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {facilitators.length - activeFacilitators.length}
              </p>
              <p className="text-xs text-gray-400">not currently facilitating</p>
            </div>
          </div>

          {/* Announcements for facilitators */}
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Announcements for Facilitators</h2>
              <button
                onClick={() => setShowAddAnnouncement((v) => !v)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {showAddAnnouncement ? 'Cancel' : '+ New Announcement'}
              </button>
            </div>

            {showAddAnnouncement && (
              <form onSubmit={postAnnouncement} className="mb-4 space-y-3 border-b border-gray-100 pb-4">
                <input
                  type="text"
                  required
                  placeholder="Title"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                <textarea
                  required
                  placeholder="What do facilitators need to know?"
                  value={announcementBody}
                  onChange={(e) => setAnnouncementBody(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={announcementUrgent}
                      onChange={(e) => setAnnouncementUrgent(e.target.checked)}
                    />
                    Mark as urgent
                  </label>
                  <button
                    type="submit"
                    disabled={savingAnnouncement}
                    className="rounded-md bg-[#022269] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {savingAnnouncement ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </form>
            )}

            {announcements.length === 0 ? (
              <p className="text-sm text-gray-400">No announcements posted for facilitators yet.</p>
            ) : (
              <div className="space-y-2">
                {announcements.map((a) => (
                  <div
                    key={a.id}
                    className={`flex items-start justify-between gap-3 rounded-lg border p-3 text-sm ${
                      a.urgent ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {a.title}
                        {a.urgent && (
                          <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                            Urgent
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-gray-600">{a.body}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        {new Date(a.posted_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteAnnouncement(a.id)}
                      className="shrink-0 text-xs font-medium text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {Object.keys(leaveTypeBreakdownToday).length > 0 && (
            <div className="mb-6 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-medium text-gray-500">Today&apos;s leave breakdown:</span>
              {LEAVE_TYPES.filter((t) => leaveTypeBreakdownToday[t]).map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-yellow-200 bg-yellow-50 px-2.5 py-1 font-medium text-yellow-800"
                >
                  {t}: {leaveTypeBreakdownToday[t]}
                </span>
              ))}
            </div>
          )}

          {/* Tabs - one per facilitator */}
          <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-200 pb-3">
            {facilitators.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedId(f.id)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium ${
                  selectedId === f.id
                    ? 'border-[#022269] bg-[#022269] text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {f.full_name}
                {f.status === 'Inactive' && (
                  <span className={selectedId === f.id ? 'text-white/60' : 'text-gray-400'}>(inactive)</span>
                )}
                {onLeaveTodayIds.has(f.id) && (
                  <span
                    className="h-2 w-2 rounded-full bg-yellow-400"
                    title="On leave today"
                  />
                )}
              </button>
            ))}
          </div>

          {selected && (
            <div className="space-y-6">
              {/* Details */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-gray-900">
                    {selected.full_name}&apos;s details
                    {savingField && <span className="ml-2 text-xs font-normal text-gray-400">saving...</span>}
                  </h2>
                  <button
                    onClick={() => deleteFacilitator(selected)}
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    Remove facilitator
                  </button>
                </div>
                <div key={selected.id} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  <DetailField
                    label="Full name"
                    value={selected.full_name}
                    onSave={(v) => updateField(selected.id, 'full_name', v)}
                  />
                  <DetailField
                    label="Role / Subject"
                    value={selected.role_title}
                    placeholder="e.g. English Language"
                    onSave={(v) => updateField(selected.id, 'role_title', v)}
                  />
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">Status</label>
                    <select
                      value={selected.status}
                      onChange={(e) => updateField(selected.id, 'status', e.target.value)}
                      className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm focus:border-[#022269] focus:outline-none"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <DetailField
                    label="Join date"
                    type="date"
                    value={selected.join_date}
                    onSave={(v) => updateField(selected.id, 'join_date', v)}
                  />
                  <DetailField
                    label="Phone"
                    value={selected.phone}
                    onSave={(v) => updateField(selected.id, 'phone', v)}
                  />
                  <DetailField
                    label="Email"
                    value={selected.email}
                    onSave={(v) => updateField(selected.id, 'email', v)}
                  />
                  <DetailField
                    label="Emergency contact name"
                    value={selected.emergency_contact_name}
                    onSave={(v) => updateField(selected.id, 'emergency_contact_name', v)}
                  />
                  <DetailField
                    label="Emergency contact phone"
                    value={selected.emergency_contact_phone}
                    onSave={(v) => updateField(selected.id, 'emergency_contact_phone', v)}
                  />
                </div>
                <div key={selected.id + '-notes'} className="mt-3">
                  <label className="mb-1 block text-xs font-medium text-gray-500">Notes</label>
                  <textarea
                    defaultValue={selected.notes ?? ''}
                    onBlur={(e) => updateField(selected.id, 'notes', e.target.value)}
                    rows={2}
                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#022269] focus:outline-none"
                  />
                </div>
              </div>

              {/* Leave */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-gray-900">
                    {selected.full_name}&apos;s leave
                  </h2>
                  <button
                    onClick={() => setShowAddLeave((v) => !v)}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {showAddLeave ? 'Cancel' : '+ Log Leave'}
                  </button>
                </div>

                {showAddLeave && (
                  <form onSubmit={addLeave} className="mb-4 flex flex-wrap items-end gap-3 border-b border-gray-100 pb-4">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Start date</label>
                      <input
                        type="date"
                        value={leaveStart}
                        onChange={(e) => setLeaveStart(e.target.value)}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">End date</label>
                      <input
                        type="date"
                        value={leaveEnd}
                        onChange={(e) => setLeaveEnd(e.target.value)}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Leave type</label>
                      <select
                        value={leaveType}
                        onChange={(e) => setLeaveType(e.target.value)}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                      >
                        {LEAVE_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="mb-1 block text-xs font-medium text-gray-600">Notes (optional)</label>
                      <input
                        type="text"
                        value={leaveReason}
                        onChange={(e) => setLeaveReason(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={savingLeave}
                      className="rounded-md bg-[#022269] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {savingLeave ? 'Saving...' : 'Save'}
                    </button>
                  </form>
                )}

                {selectedLeave.length === 0 ? (
                  <p className="text-sm text-gray-400">No leave logged for {selected.full_name}.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedLeave.map((l) => {
                      const isCurrent = l.leave_start_date <= today && today <= l.leave_end_date
                      const isPast = l.leave_end_date < today
                      return (
                        <div
                          key={l.id}
                          className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm ${
                            isCurrent
                              ? 'border-yellow-300 bg-yellow-50'
                              : isPast
                              ? 'border-gray-200 bg-gray-50 text-gray-500'
                              : 'border-blue-200 bg-blue-50'
                          }`}
                        >
                          <div>
                            <span className="font-medium">
                              {l.leave_start_date === l.leave_end_date
                                ? l.leave_start_date
                                : `${l.leave_start_date} – ${l.leave_end_date}`}
                            </span>
                            <span className="ml-2 opacity-80">· {l.leave_type}</span>
                            {l.reason && <span className="ml-2 opacity-80">· {l.reason}</span>}
                            {isCurrent && (
                              <span className="ml-2 rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                                Current
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => deleteLeave(l.id)}
                            className="text-xs font-medium underline opacity-70 hover:opacity-100"
                          >
                            Remove
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </DashboardShell>
  )
}

function DetailField({
  label,
  value,
  onSave,
  type = 'text',
  placeholder,
}: {
  label: string
  value: string | null
  onSave: (value: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
      <input
        type={type}
        defaultValue={value ?? ''}
        placeholder={placeholder}
        onBlur={(e) => onSave(e.target.value)}
        className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm focus:border-[#022269] focus:outline-none"
      />
    </div>
  )
}
