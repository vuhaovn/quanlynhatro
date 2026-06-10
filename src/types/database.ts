export type RoomStatus = 'empty' | 'rented'

export interface Room {
  id: string
  user_id: string
  name: string
  floor: number | null
  price: number
  description: string | null
  status: RoomStatus
  created_at: string
}

export interface Tenant {
  id: string
  user_id: string
  full_name: string
  phone: string
  cccd: string
  room_id: string | null
  start_date: string
  end_date: string | null
  is_active: boolean
  deposit: number
  created_at: string
  room?: Room
}

export interface Invoice {
  id: string
  user_id: string
  room_id: string
  tenant_id: string
  month: number
  year: number
  room_price: number
  electric_start: number
  electric_end: number
  electric_price: number
  electric_total: number
  water_start: number
  water_end: number
  water_price: number
  water_total: number
  garbage_fee: number
  internet_fee: number
  total_amount: number
  is_paid: boolean
  paid_at: string | null
  note: string | null
  created_at: string
  room?: Room
  tenant?: Tenant
}

export interface RentalHistory {
  id: string
  user_id: string
  room_id: string
  tenant_name: string
  tenant_phone: string
  tenant_cccd: string
  start_date: string
  end_date: string
  created_at: string
  room?: Room
}

export interface Settings {
  id: string
  user_id: string
  electric_price: number
  water_price: number
  garbage_fee: number
  internet_fee: number
  bank_name: string | null
  bank_account: string | null
  bank_owner: string | null
  qr_image_url: string | null
  updated_at: string
}

type InvoiceInsert = Omit<Invoice, 'id' | 'created_at' | 'room' | 'tenant' | 'electric_total' | 'water_total' | 'total_amount'>
type InvoiceUpdate = Partial<InvoiceInsert>

export type Database = {
  public: {
    Tables: {
      rooms: { Row: Room; Insert: Omit<Room, 'id' | 'created_at'>; Update: Partial<Omit<Room, 'id' | 'created_at'>> }
      tenants: { Row: Tenant; Insert: Omit<Tenant, 'id' | 'created_at' | 'room'>; Update: Partial<Omit<Tenant, 'id' | 'created_at' | 'room'>> }
      invoices: { Row: Invoice; Insert: InvoiceInsert; Update: InvoiceUpdate }
      rental_history: { Row: RentalHistory; Insert: Omit<RentalHistory, 'id' | 'created_at' | 'room'>; Update: Partial<Omit<RentalHistory, 'id' | 'created_at' | 'room'>> }
      settings: { Row: Settings; Insert: Omit<Settings, 'id' | 'updated_at'>; Update: Partial<Omit<Settings, 'id' | 'updated_at'>> }
    }
  }
}
