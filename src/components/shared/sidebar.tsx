'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, DoorOpen, Users, FileText, BarChart2, History, Settings, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
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

interface SidebarProps {
  collapsed?: boolean
  onToggle?: () => void
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col min-h-screen bg-white border-r border-gray-200 fixed left-0 top-0 z-40 overflow-hidden transition-[width] duration-200',
        collapsed ? 'w-14' : 'w-56'
      )}
    >
      {/* Header */}
      <div className="flex items-center h-16 border-b border-gray-200 px-3 shrink-0">
        <span className="text-2xl shrink-0">🏠</span>
        {!collapsed && (
          <span className="font-semibold text-sm truncate flex-1 ml-2">Quản Lý Nhà Trọ</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 py-2 rounded-lg text-sm transition-colors',
                collapsed ? 'justify-center px-0' : 'px-3',
                active
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:bg-gray-100 hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom actions */}
      <div className="p-2 border-t border-gray-200 space-y-0.5">
        <button
          onClick={handleLogout}
          title={collapsed ? 'Đăng xuất' : undefined}
          className={cn(
            'flex items-center gap-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-gray-100 hover:text-foreground transition-colors w-full',
            collapsed ? 'justify-center px-0' : 'px-3'
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && 'Đăng xuất'}
        </button>
        <button
          onClick={onToggle}
          title={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          className={cn(
            'flex items-center gap-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-gray-100 hover:text-foreground transition-colors w-full',
            collapsed ? 'justify-center px-0' : 'px-3'
          )}
        >
          {collapsed
            ? <PanelLeftOpen className="h-4 w-4 shrink-0" />
            : <PanelLeftClose className="h-4 w-4 shrink-0" />}
          {!collapsed && 'Thu gọn'}
        </button>
      </div>
    </aside>
  )
}
