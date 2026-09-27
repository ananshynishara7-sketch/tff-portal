import DashboardShell from '@/components/DashboardShell'
import TodoList from '@/components/TodoList'

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

export default function FacilitatorTodoPage() {
  return (
    <DashboardShell roleLabel="Facilitator" navItems={navItems}>
      <h1 className="mb-2 text-2xl font-semibold text-gray-900">My To-Do List</h1>
      <p className="mb-6 text-sm text-gray-500">Your own task list - add, edit, or mark things done as you go.</p>
      <TodoList />
    </DashboardShell>
  )
}
