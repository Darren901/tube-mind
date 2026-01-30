'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, LogOut, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  {
    title: '儀表板',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    title: '使用者管理',
    href: '/admin/users',
    icon: Users,
  },
]

export function AdminNavbar() {
  const pathname = usePathname()

  return (
    <nav className="bg-bg-secondary border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-8">
            <Link href="/admin" className="flex items-center gap-2">
              <span className="text-xl font-bold font-rajdhani text-white">
                TubeMind <span className="text-brand-blue">Admin</span>
              </span>
            </Link>

            {/* Nav Links */}
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-text-secondary hover:text-white hover:bg-white/5'
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.title}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-4">
            <Link
              href="/channels"
              className="text-sm text-text-secondary hover:text-white transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              返回前台
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
