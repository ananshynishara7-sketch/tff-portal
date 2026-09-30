import DashboardShell from '@/components/DashboardShell'
import Announcements from '@/components/Announcements'

const navItems = [
  { label: 'Dashboard', href: '/facilitator' },
  { label: 'My Participants', href: '/facilitator/participants' },
  { label: 'Attendance', href: '/facilitator/attendance' },
  { label: 'My Schedule', href: '/facilitator/schedule' },
  { label: 'My Blocked Time', href: '/facilitator/blocked-time' },
  { label: 'My To-Do List', href: '/facilitator/todo' },
  { label: 'Announcements', href: '/facilitator/announcements' },
  { label: 'Assessments', href: '/facilitator/assessments' },
  { label: 'The Flag Carriers', href: '/facilitator/flag-carriers' },
  { label: 'Progress Notes', href: '/facilitator/progress' },
]

export default function FacilitatorAnnouncementsPage() {
  return (
    <DashboardShell roleLabel="Facilitator" navItems={navItems}>
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">Announcements</h1>
      <p className="mb-6 text-sm text-gray-500">Updates from Admin and Lead Facilitators.</p>
      <Announcements />
    </DashboardShell>
  )
}
