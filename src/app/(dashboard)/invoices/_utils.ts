import { Invoice, Room } from '@/types/database'

export type InvoiceWithRoom = Invoice & { room: Pick<Room, 'name' | 'floor'> | null }

export function sortInvoices<T extends InvoiceWithRoom>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const za = a.room?.floor ?? 0, zb = b.room?.floor ?? 0
    if (za !== zb) return za - zb
    return (a.room?.name ?? '').localeCompare(b.room?.name ?? '', 'vi', { numeric: true })
  })
}
