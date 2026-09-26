'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type NavItem = { label: string; href: string }

// Live date/time with the weekday name, shown at the top of every page
// (admin, facilitator, participant - wherever DashboardShell is used).
function LiveDateTime() {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  // Avoid a server/client mismatch on first render - render nothing until
  // the client has a real clock value.
  if (!now) return <div className="mb-4 h-5" />

  const dateLabel = now.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const timeLabel = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 text-sm font-medium text-gray-500">
      <span>{dateLabel}</span>
      <span className="text-gray-300">·</span>
      <span className="font-mono">{timeLabel}</span>
    </div>
  )
}

export default function DashboardShell({
  roleLabel,
  navItems,
  children,
}: {
  roleLabel: string
  navItems: NavItem[]
  children: React.ReactNode
}) {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Sidebar on desktop, top bar on mobile */}
      <aside className="w-full border-b border-gray-200 bg-[#022269] text-white md:h-screen md:w-56 md:border-b-0 md:border-r">
        <div className="p-4">
          <p className="text-sm font-semibold">The Flag Forum</p>
          <p className="text-xs text-white/70">{roleLabel}</p>
        </div>
        <nav className="flex flex-row overflow-x-auto px-2 md:flex-col md:overflow-visible">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-md px-3 py-2 text-sm text-white/90 hover:bg-white/10"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="m-2 rounded-md px-3 py-2 text-left text-sm text-white/70 hover:bg-white/10 md:mt-auto"
        >
          Log out
        </button>
      </aside>

      <main className="flex-1 bg-gray-50 p-4 md:p-8">
        <LiveDateTime />
        {children}
      </main>
    </div>
  )
}
