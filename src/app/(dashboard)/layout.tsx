import { Sidebar } from '@/components/shared/sidebar'
import { BottomNav } from '@/components/shared/bottom-nav'
import { Toaster } from '@/components/ui/sonner'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="md:pl-56 pb-20 md:pb-0">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {children}
        </div>
      </main>
      <BottomNav />
      <Toaster richColors position="top-center" />
    </div>
  )
}
