import DashboardShell from '@/components/DashboardShell'
import AttendanceMarking from '@/components/AttendanceMarking'

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

export default function FacilitatorAttendancePage() {
  return (
    <DashboardShell roleLabel="Facilitator" navItems={navItems}>
      <AttendanceMarking canClearAll={false} />
    </DashboardShell>
  )
}
