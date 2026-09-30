import DashboardShell from '@/components/DashboardShell'
import Announcements from '@/components/Announcements'

const navItems = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Participants', href: '/admin/participants' },
  { label: 'Facilitators', href: '/admin/facilitators' },
  { label: 'Attendance', href: '/admin/attendance' },
  { label: 'Leave Requests', href: '/admin/leave-requests' },
  { label: 'Masterplan Phase 3', href: '/admin/timetable' },
  { label: 'Announcements', href: '/admin/announcements' },
  { label: 'Assessments', href: '/admin/assessments' },
  { label: 'Flag Carriers', href: '/admin/flag-carriers' },
  { label: 'Families', href: '/admin/groups' },
  { label: 'Settings', href: '/admin/settings' },
]

export default function AdminAnnouncementsPage() {
  return (
    <DashboardShell roleLabel="Admin" navItems={navItems}>
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">Announcements</h1>
      <p className="mb-6 text-sm text-gray-500">
        Post something for everyone, a specific role, or a specific family to see.
      </p>
      <Announcements canPost />
    </DashboardShell>
  )
}
