'use client'

import { useState } from 'react'
import { Sidebar } from './sidebar'
import { BottomNav } from './bottom-nav'
import { Toaster } from '@/components/ui/sonner'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <main
        className={`md:pb-0 transition-[padding-left] duration-200 ${collapsed ? 'md:pl-14' : 'md:pl-56'}`}
        style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      >
        <div className="px-4 py-6">
          {children}
        </div>
      </main>
      <BottomNav />
      <Toaster richColors position="top-center" />
    </div>
  )
}
