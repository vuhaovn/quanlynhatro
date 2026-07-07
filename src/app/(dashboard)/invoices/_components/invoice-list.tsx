'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronUp, Printer, CheckSquare, Square, X } from 'lucide-react'
import { InvoiceWithRoom, sortInvoices } from '../_utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

type Filter = 'all' | 'unpaid' | 'paid'

function roomLabel(room: InvoiceWithRoom['room']) {
  if (!room) return '—'
  return room.floor ? `Khu ${room.floor} · ${room.name}` : room.name
}

function fmt(n: number) { return n.toLocaleString('vi-VN') }

interface MonthGroup {
  key: string
  month: number
  year: number
  invoices: InvoiceWithRoom[]
}

export function InvoiceList({ invoices: initial }: { invoices: InvoiceWithRoom[] }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll(ids: string[]) {
    const allSelected = ids.every((id) => selectedIds.has(id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) ids.forEach((id) => next.delete(id))
      else ids.forEach((id) => next.add(id))
      return next
    })
  }

  function exitSelectionMode() {
    setSelectionMode(false)
    setSelectedIds(new Set())
  }

  function printSelected() {
    const ids = Array.from(selectedIds).join(',')
    window.open(`/invoices/print?ids=${ids}`, '_blank')
  }

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
      {/* Filter tabs + select mode toggle */}
      <div className="flex items-center justify-between gap-2">
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
        {selectionMode ? (
          <button
            onClick={exitSelectionMode}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" />
            Hủy
          </button>
        ) : (
          <button
            onClick={() => setSelectionMode(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <CheckSquare className="h-3 w-3" />
            Chọn để in
          </button>
        )}
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
                <div className="flex items-center">
                  {selectionMode && (
                    <button
                      onClick={() => toggleSelectAll(group.invoices.map((i) => i.id))}
                      className="pl-3 pr-1 py-3 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {group.invoices.every((i) => selectedIds.has(i.id))
                        ? <CheckSquare className="h-4 w-4 text-primary" />
                        : <Square className="h-4 w-4" />}
                    </button>
                  )}
                  <button
                    onClick={() => toggleGroup(group.key)}
                    className="flex-1 flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
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
                </div>

                {/* Invoice rows */}
                {!isCollapsed && (
                  <div className="border-t">
                    {group.invoices.map((inv) => {
                      const isPaid = inv.is_paid
                      const isLoading = loadingIds.has(inv.id)

                      return (
                        <div
                          key={inv.id}
                          className={`flex items-center justify-between px-4 py-2.5 border-b last:border-0 hover:bg-muted/30 transition-colors ${
                            selectionMode && selectedIds.has(inv.id) ? 'bg-primary/5' : ''
                          }`}
                        >
                          {/* Checkbox in selection mode */}
                          {selectionMode && (
                            <button
                              onClick={() => toggleSelect(inv.id)}
                              className="mr-2 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {selectedIds.has(inv.id)
                                ? <CheckSquare className="h-4 w-4 text-primary" />
                                : <Square className="h-4 w-4" />}
                            </button>
                          )}
                          {/* Room label → links to detail (disabled in selection mode) */}
                          {selectionMode ? (
                            <button
                              onClick={() => toggleSelect(inv.id)}
                              className="flex-1 min-w-0 text-sm font-medium truncate text-left"
                            >
                              {roomLabel(inv.room)}
                            </button>
                          ) : (
                          <Link
                            href={`/invoices/${inv.id}`}
                            className="flex-1 min-w-0 text-sm font-medium truncate"
                          >
                            {roomLabel(inv.room)}
                          </Link>
                          )}

                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            <span className="text-sm font-semibold tabular-nums">
                              {fmt(inv.total_amount)}đ
                            </span>

                            {isPaid ? (
                              <button
                                onClick={() => togglePaid(inv.id, true)}
                                disabled={isLoading}
                                className="text-xs px-2 py-0.5 rounded-full border bg-green-100 text-green-700 border-green-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-colors min-w-[62px] text-center disabled:opacity-50"
                              >
                                {isLoading ? '...' : 'Đã thu'}
                              </button>
                            ) : (
                              <>
                                <span className="text-xs text-orange-600 font-medium">Chưa thu</span>
                                <button
                                  onClick={() => togglePaid(inv.id, false)}
                                  disabled={isLoading}
                                  className="text-xs px-2.5 py-0.5 rounded-full border bg-green-500 text-white border-green-600 hover:bg-green-600 transition-colors min-w-[62px] text-center disabled:opacity-50 font-medium"
                                >
                                  {isLoading ? '...' : '✓ Đã thu'}
                                </button>
                              </>
                            )}
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

      {/* Sticky bottom bar when invoices are selected */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-foreground text-background rounded-full shadow-lg px-4 py-2.5">
          <span className="text-sm font-medium">Đã chọn {selectedIds.size} hóa đơn</span>
          <button
            onClick={printSelected}
            className="flex items-center gap-1.5 bg-background text-foreground text-sm font-semibold px-3 py-1 rounded-full hover:bg-muted transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
            In ngay
          </button>
        </div>
      )}
    </div>
  )
}
