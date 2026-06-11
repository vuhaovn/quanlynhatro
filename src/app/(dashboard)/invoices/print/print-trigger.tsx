'use client'

import { useEffect } from 'react'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PrintTrigger({ count }: { count: number }) {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 600)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="print:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b shadow-sm px-4 py-3 flex items-center gap-3">
      <a href="/invoices" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← Quay lại
      </a>
      <p className="text-sm flex-1 text-muted-foreground">
        {count} hóa đơn · {Math.ceil(count / 2)} tờ A4
      </p>
      <Button size="sm" className="gap-1.5" onClick={() => window.print()}>
        <Printer className="h-4 w-4" />
        In ngay
      </Button>
    </div>
  )
}
