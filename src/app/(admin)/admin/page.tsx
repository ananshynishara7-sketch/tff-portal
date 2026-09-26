import DashboardShell from '@/components/DashboardShell'

const navItems = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Participants', href: '/admin/participants' },
  { label: 'Facilitators', href: '/admin/facilitators' },
  { label: 'Attendance', href: '/admin/attendance' },
  { label: 'Timetable', href: '/admin/timetable' },
  { label: 'Announcements', href: '/admin/announcements' },
  { label: 'Groups', href: '/admin/groups' },
  { label: 'Settings', href: '/admin/settings' },
]

export default function AdminDashboard() {
  return (
    <DashboardShell roleLabel="Administration" navItems={navItems}>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Participants" value="—" />
        <StatCard label="Total Facilitators" value="—" />
        <StatCard label="Today's Attendance" value="—" />
        <StatCard label="Upcoming Sessions" value="—" />
      </div>
      <p className="mt-8 text-sm text-gray-500">
        Real numbers will appear here once participant and attendance data is connected.
      </p>
    </DashboardShell>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-[#022269]">{value}</p>
    </div>
  )
}
