'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'
import { Tenant, Room } from '@/types/database'

type TenantWithRoom = Tenant & { room: Pick<Room, 'name' | 'floor'> | null }

interface Props {
  active: TenantWithRoom[]
  inactive: TenantWithRoom[]
}

function roomLabel(room: TenantWithRoom['room']) {
  if (!room) return 'Chưa gán phòng'
  return room.floor ? `Khu ${room.floor} · ${room.name}` : room.name
}

function TenantRow({ tenant, dim = false }: { tenant: TenantWithRoom; dim?: boolean }) {
  return (
    <Link href={`/tenants/${tenant.id}`} className="block">
      <div className={`flex items-center justify-between px-1 py-2.5 border-b last:border-0 hover:bg-muted/40 transition-colors ${dim ? 'opacity-50' : ''}`}>
        <div className="min-w-0">
          <p className="font-medium text-sm leading-tight">{tenant.full_name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{tenant.phone}</p>
        </div>
        <span className={`text-xs shrink-0 ml-3 px-2 py-0.5 rounded-full ${
          tenant.is_active
            ? 'bg-green-100 text-green-700'
            : 'bg-muted text-muted-foreground'
        }`}>
          {roomLabel(tenant.room)}
        </span>
      </div>
    </Link>
  )
}

export function TenantsList({ active, inactive }: Props) {
  const [query, setQuery] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const q = query.toLowerCase().trim()

  const filteredActive = useMemo(() => {
    if (!q) return active
    return active.filter((t) =>
      t.full_name.toLowerCase().includes(q) ||
      t.phone.includes(q) ||
      roomLabel(t.room).toLowerCase().includes(q)
    )
  }, [active, q])

  const filteredInactive = useMemo(() => {
    if (!q) return inactive
    return inactive.filter((t) =>
      t.full_name.toLowerCase().includes(q) ||
      t.phone.includes(q)
    )
  }, [inactive, q])

  const showingInactive = showInactive || q.length > 0

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Tìm tên, SĐT, phòng..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats */}
      <div className="flex gap-3 text-xs text-muted-foreground">
        <span className="text-green-600 font-medium">{active.length} đang thuê</span>
        <span>·</span>
        <span>{inactive.length} đã rời</span>
      </div>

      {/* Active */}
      {filteredActive.length > 0 ? (
        <div className="rounded-xl border bg-card overflow-hidden">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 pt-3 pb-1.5 border-b">
            Đang thuê ({filteredActive.length})
          </p>
          <div className="px-3">
            {filteredActive.map((t) => (
              <TenantRow key={t.id} tenant={t} />
            ))}
          </div>
        </div>
      ) : q ? (
        <p className="text-sm text-muted-foreground text-center py-6">Không tìm thấy người đang thuê</p>
      ) : null}

      {/* Inactive */}
      {inactive.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          {!showingInactive ? (
            <button
              onClick={() => setShowInactive(true)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-muted-foreground hover:bg-muted/40 transition-colors"
            >
              <span>Hiện {inactive.length} người đã rời</span>
              <ChevronDown className="h-4 w-4" />
            </button>
          ) : (
            <>
              <div className="flex items-center justify-between px-1 pt-3 pb-1.5 border-b">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Đã rời {filteredInactive.length > 0 && q ? `(${filteredInactive.length})` : `(${inactive.length})`}
                </p>
                {!q && (
                  <button onClick={() => setShowInactive(false)} className="text-muted-foreground hover:text-foreground p-1">
                    <ChevronUp className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="px-3">
                {filteredInactive.length > 0
                  ? filteredInactive.map((t) => <TenantRow key={t.id} tenant={t} dim />)
                  : <p className="text-sm text-muted-foreground py-4 text-center">Không tìm thấy</p>
                }
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
