import DashboardShell from '@/components/DashboardShell'

const navItems = [
  { label: 'Dashboard', href: '/lead-facilitator' },
  { label: 'Participants', href: '/lead-facilitator/participants' },
  { label: 'Facilitators', href: '/lead-facilitator/facilitators' },
  { label: 'Attendance', href: '/lead-facilitator/attendance' },
  { label: 'Timetable', href: '/lead-facilitator/timetable' },
  { label: 'Announcements', href: '/lead-facilitator/announcements' },
  { label: 'Progress Tracking', href: '/lead-facilitator/progress' },
]

export default function LeadFacilitatorDashboard() {
  return (
    <DashboardShell roleLabel="Lead Facilitator" navItems={navItems}>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Attendance Trend" value="—" />
        <StatCard label="Facilitator Activity" value="—" />
        <StatCard label="Follow-ups Needed" value="—" />
      </div>
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
