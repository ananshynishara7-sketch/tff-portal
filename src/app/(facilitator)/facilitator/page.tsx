import DashboardShell from '@/components/DashboardShell'
import RoleDashboard from '@/components/RoleDashboard'

const navItems = [
  { label: 'Dashboard', href: '/facilitator' },
  { label: 'My Participants', href: '/facilitator/participants' },
  { label: 'Attendance', href: '/facilitator/attendance' },
  { label: 'My Schedule', href: '/facilitator/schedule' },
  { label: 'My Blocked Time', href: '/facilitator/blocked-time' },
  { label: 'My To-Do List', href: '/facilitator/todo' },
  { label: 'Announcements', href: '/facilitator/announcements' },
  { label: 'Assessments', href: '/facilitator/assessments' },
  { label: 'Progress Notes', href: '/facilitator/progress' },
]

export default function FacilitatorDashboard() {
  return (
    <DashboardShell roleLabel="Facilitator" navItems={navItems}>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Dashboard</h1>
      <RoleDashboard todoHref="/facilitator/todo" />
    </DashboardShell>
  )
}
