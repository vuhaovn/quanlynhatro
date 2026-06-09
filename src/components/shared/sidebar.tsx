'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, DoorOpen, Users, FileText, BarChart2, History, Settings, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/', label: 'Tổng quan', icon: Home },
  { href: '/rooms', label: 'Quản lý Phòng', icon: DoorOpen },
  { href: '/tenants', label: 'Người thuê', icon: Users },
  { href: '/invoices', label: 'Hóa đơn', icon: FileText },
  { href: '/statistics', label: 'Thống kê', icon: BarChart2 },
  { href: '/history', label: 'Lịch sử thuê', icon: History },
  { href: '/settings', label: 'Cài đặt', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen bg-white border-r border-gray-200 fixed left-0 top-0">
      <div className="flex items-center gap-2 px-4 h-16 border-b border-gray-200">
        <span className="text-2xl">🏠</span>
        <span className="font-semibold text-sm">Quản Lý Nhà Trọ</span>
      </div>
      <nav className="flex-1 py-4 px-2 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:bg-gray-100 hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="p-2 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-gray-100 hover:text-foreground transition-colors w-full"
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </button>
      </div>
    </aside>
  )
}
