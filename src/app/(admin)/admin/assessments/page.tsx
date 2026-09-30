import DashboardShell from '@/components/DashboardShell'
import Assessments from '@/components/Assessments'

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

export default function AdminAssessmentsPage() {
  return (
    <DashboardShell roleLabel="Admin" navItems={navItems}>
      <Assessments canManagePhases />
    </DashboardShell>
  )
}
