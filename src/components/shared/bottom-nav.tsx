'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, DoorOpen, Users, FileText, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Tổng quan', icon: Home },
  { href: '/rooms', label: 'Phòng', icon: DoorOpen },
  { href: '/tenants', label: 'Người thuê', icon: Users },
  { href: '/invoices', label: 'Hóa đơn', icon: FileText },
  { href: '/settings', label: 'Cài đặt', icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-lg transition-colors',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
