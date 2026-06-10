-- Phòng trọ
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  floor integer,
  price numeric(12,0) not null,
  description text,
  status text not null default 'empty' check (status in ('empty', 'rented')),
  created_at timestamptz not null default now()
);

-- Người thuê
create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  cccd text not null,
  room_id uuid references rooms(id) on delete set null,
  start_date date not null,
  end_date date,
  is_active boolean not null default true,
  deposit numeric(12,0) not null default 0,
  created_at timestamptz not null default now()
);

-- Hóa đơn tháng
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid not null references rooms(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  month integer not null check (month between 1 and 12),
  year integer not null,
  room_price numeric(12,0) not null,
  electric_start numeric(10,1) not null default 0,
  electric_end numeric(10,1) not null default 0,
  electric_price numeric(10,0) not null,
  electric_total numeric(12,0) not null generated always as (
    round((electric_end - electric_start) * electric_price)
  ) stored,
  water_start numeric(10,1) not null default 0,
  water_end numeric(10,1) not null default 0,
  water_price numeric(10,0) not null,
  water_total numeric(12,0) not null generated always as (
    round((water_end - water_start) * water_price)
  ) stored,
  garbage_fee numeric(12,0) not null default 0,
  internet_fee numeric(12,0) not null default 0,
  total_amount numeric(12,0) not null generated always as (
    room_price +
    round((electric_end - electric_start) * electric_price) +
    round((water_end - water_start) * water_price) +
    garbage_fee + internet_fee
  ) stored,
  is_paid boolean not null default false,
  paid_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  unique(room_id, month, year)
);

-- Lịch sử thuê phòng
create table if not exists rental_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid not null references rooms(id) on delete cascade,
  tenant_name text not null,
  tenant_phone text not null,
  tenant_cccd text not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now()
);

-- Cài đặt chung (mỗi user 1 row)
create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  electric_price numeric(10,0) not null default 3500,
  water_price numeric(10,0) not null default 15000,
  garbage_fee numeric(12,0) not null default 0,
  internet_fee numeric(12,0) not null default 0,
  bank_name text,
  bank_account text,
  bank_owner text,
  qr_image_url text,
  updated_at timestamptz not null default now()
);

-- RLS
alter table rooms enable row level security;
alter table tenants enable row level security;
alter table invoices enable row level security;
alter table rental_history enable row level security;
alter table settings enable row level security;

-- Policies: mỗi user chỉ thấy data của mình
create policy "owner_all" on rooms for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner_all" on tenants for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner_all" on invoices for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner_all" on rental_history for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner_all" on settings for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
