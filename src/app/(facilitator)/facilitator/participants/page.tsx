import DashboardShell from '@/components/DashboardShell'
import ParticipantsTable from '@/components/ParticipantsTable'

const navItems = [
  { label: 'Dashboard', href: '/facilitator' },
  { label: 'My Participants', href: '/facilitator/participants' },
  { label: 'Attendance', href: '/facilitator/attendance' },
  { label: 'My Schedule', href: '/facilitator/schedule' },
  { label: 'My Blocked Time', href: '/facilitator/blocked-time' },
  { label: 'My To-Do List', href: '/facilitator/todo' },
  { label: 'Announcements', href: '/facilitator/announcements' },
  { label: 'Progress Notes', href: '/facilitator/progress' },
]

export default function FacilitatorParticipantsPage() {
  return (
    <DashboardShell roleLabel="Facilitator" navItems={navItems}>
      <ParticipantsTable canAdd={false} />
    </DashboardShell>
  )
}
