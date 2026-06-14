'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Invoice, Room } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

type InvoiceWithRoom = Invoice & { room: Pick<Room, 'name' | 'floor'> | null }
type Filter = 'all' | 'unpaid' | 'paid'

function roomLabel(room: InvoiceWithRoom['room']) {
  if (!room) return '—'
  return room.floor ? `Khu ${room.floor} · ${room.name}` : room.name
}

function fmt(n: number) { return n.toLocaleString('vi-VN') }

function sortInvoices(list: InvoiceWithRoom[]): InvoiceWithRoom[] {
  return [...list].sort((a, b) => {
    const za = a.room?.floor ?? 0, zb = b.room?.floor ?? 0
    if (za !== zb) return za - zb
    return (a.room?.name ?? '').localeCompare(b.room?.name ?? '', 'vi', { numeric: true })
  })
}

interface MonthGroup {
  key: string
  month: number
  year: number
  invoices: InvoiceWithRoom[]
}

export function InvoiceList({ invoices: initial }: { invoices: InvoiceWithRoom[] }) {
  const [filter, setFilter] = useState<Filter>('all')

  // Local paid state for optimistic updates — keyed by invoice id
  const [paidMap, setPaidMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(initial.map((inv) => [inv.id, inv.is_paid]))
  )
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())

  // Merge server data with local overrides
  const invoices = useMemo(
    () => initial.map((inv) => ({ ...inv, is_paid: paidMap[inv.id] ?? inv.is_paid })),
    [initial, paidMap]
  )

  const groups = useMemo<MonthGroup[]>(() => {
    const map: Record<string, MonthGroup> = {}
    for (const inv of invoices) {
      const key = `${inv.year}-${String(inv.month).padStart(2, '0')}`
      if (!map[key]) map[key] = { key, month: inv.month, year: inv.year, invoices: [] }
      map[key].invoices.push(inv)
    }
    return Object.values(map)
      .sort((a, b) => b.year - a.year || b.month - a.month)
      .map((g) => ({ ...g, invoices: sortInvoices(g.invoices) }))
  }, [invoices])

  // Newest month expanded, rest collapsed
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    const keys = new Set<string>()
    let first: string | null = null
    for (const inv of initial) {
      const key = `${inv.year}-${String(inv.month).padStart(2, '0')}`
      if (!first) first = key
      if (key !== first) keys.add(key)
    }
    return keys
  })

  function toggleGroup(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function togglePaid(id: string, currentPaid: boolean) {
    setLoadingIds((prev) => new Set(prev).add(id))
    const supabase = createClient()
    const newPaid = !currentPaid
    const { error } = await supabase
      .from('invoices')
      .update({ is_paid: newPaid, paid_at: newPaid ? new Date().toISOString() : null })
      .eq('id', id)

    if (error) {
      toast.error('Cập nhật thất bại')
    } else {
      setPaidMap((prev) => ({ ...prev, [id]: newPaid }))
    }
    setLoadingIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const totalUnpaid = invoices.filter((i) => !i.is_paid).length
  const totalPaid = invoices.filter((i) => i.is_paid).length

  const filteredGroups = useMemo(() => {
    if (filter === 'all') return groups
    return groups
      .map((g) => ({
        ...g,
        invoices: g.invoices.filter((inv) => (filter === 'paid' ? inv.is_paid : !inv.is_paid)),
      }))
      .filter((g) => g.invoices.length > 0)
  }, [groups, filter])

  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      <div className="flex gap-1.5">
        {(
          [
            ['all', 'Tất cả'],
            ['unpaid', `Chưa thu${totalUnpaid ? ` (${totalUnpaid})` : ''}`],
            ['paid', `Đã thu${totalPaid ? ` (${totalPaid})` : ''}`],
          ] as [Filter, string][]
        ).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === v
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Month groups */}
      {filteredGroups.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Không có hóa đơn nào</p>
      ) : (
        <div className="space-y-2">
          {filteredGroups.map((group) => {
            const isCollapsed = collapsed.has(group.key)
            const unpaidCount = group.invoices.filter((i) => !i.is_paid).length
            const total = group.invoices.reduce((sum, i) => sum + i.total_amount, 0)

            return (
              <div key={group.key} className="rounded-xl border bg-card overflow-hidden">
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group.key)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-semibold text-sm">
                      Tháng {group.month}/{group.year}
                    </span>
                    <span className="text-xs text-muted-foreground">{group.invoices.length} phòng</span>
                    {unpaidCount > 0 && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 h-4 text-orange-600 border-orange-300 font-medium"
                      >
                        {unpaidCount} chưa thu
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-semibold text-green-700">{fmt(total)}đ</span>
                    {isCollapsed
                      ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>

                {/* Invoice rows */}
                {!isCollapsed && (
                  <div className="border-t">
                    {group.invoices.map((inv) => {
                      const isPaid = inv.is_paid
                      const isLoading = loadingIds.has(inv.id)

                      return (
                        <div
                          key={inv.id}
                          className="flex items-center justify-between px-4 py-2.5 border-b last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          {/* Room label → links to detail */}
                          <Link
                            href={`/invoices/${inv.id}`}
                            className="flex-1 min-w-0 text-sm font-medium truncate"
                          >
                            {roomLabel(inv.room)}
                          </Link>

                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            <span className="text-sm font-semibold tabular-nums">
                              {fmt(inv.total_amount)}đ
                            </span>

                            {/* Toggle paid button */}
                            <button
                              onClick={() => togglePaid(inv.id, isPaid)}
                              disabled={isLoading}
                              className={`text-xs px-2 py-0.5 rounded-full border transition-colors min-w-[62px] text-center disabled:opacity-50 disabled:cursor-not-allowed ${
                                isPaid
                                  ? 'bg-green-100 text-green-700 border-green-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200'
                                  : 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-green-100 hover:text-green-700 hover:border-green-200'
                              }`}
                            >
                              {isLoading ? '...' : isPaid ? 'Đã thu' : 'Chưa thu'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
