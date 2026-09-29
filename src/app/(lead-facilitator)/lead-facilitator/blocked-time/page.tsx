import DashboardShell from '@/components/DashboardShell'
import WeeklyBlockedTime from '@/components/WeeklyBlockedTime'

const navItems = [
  { label: 'Dashboard', href: '/lead-facilitator' },
  { label: 'Participants', href: '/lead-facilitator/participants' },
  { label: 'Facilitators', href: '/lead-facilitator/facilitators' },
  { label: 'Attendance', href: '/lead-facilitator/attendance' },
  { label: 'Masterplan Phase 3', href: '/lead-facilitator/timetable' },
  { label: 'My Blocked Time', href: '/lead-facilitator/blocked-time' },
  { label: 'My To-Do List', href: '/lead-facilitator/todo' },
  { label: 'Announcements', href: '/lead-facilitator/announcements' },
  { label: 'Assessments', href: '/lead-facilitator/assessments' },
  { label: 'Progress Tracking', href: '/lead-facilitator/progress' },
]

export default function LeadFacilitatorBlockedTimePage() {
  return (
    <DashboardShell roleLabel="Lead Facilitator" navItems={navItems}>
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">My Blocked Time</h1>
      <p className="mb-6 text-sm text-gray-500">
        Your own weekly plan - the same layout every week. Click any field to edit it.
      </p>
      <WeeklyBlockedTime />
    </DashboardShell>
  )
}
