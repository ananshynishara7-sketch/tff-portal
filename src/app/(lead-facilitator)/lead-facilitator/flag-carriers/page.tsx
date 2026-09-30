import DashboardShell from '@/components/DashboardShell'
import FlagCarriers from '@/components/FlagCarriers'

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
  { label: 'The Flag Carriers', href: '/lead-facilitator/flag-carriers' },
  { label: 'Progress Tracking', href: '/lead-facilitator/progress' },
]

export default function LeadFacilitatorFlagCarriersPage() {
  return (
    <DashboardShell roleLabel="Lead Facilitator" navItems={navItems}>
      <FlagCarriers canEdit />
    </DashboardShell>
  )
}
