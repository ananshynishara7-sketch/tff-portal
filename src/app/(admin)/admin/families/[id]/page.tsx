'use client'

import { useParams } from 'next/navigation'
import DashboardShell from '@/components/DashboardShell'
import FamilyAttendanceRecord from '@/components/FamilyAttendanceRecord'

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

export default function FamilyAttendancePage() {
  const params = useParams()
  const familyId = params.id as string

  return (
    <DashboardShell roleLabel="Administration" navItems={navItems}>
      <FamilyAttendanceRecord familyId={familyId} />
    </DashboardShell>
  )
}
