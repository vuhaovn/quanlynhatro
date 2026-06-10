# CLAUDE.md — Phần Mềm Quản Lý Nhà Trọ

> Tài liệu định hướng dự án. Cập nhật liên tục trong quá trình phát triển.

---

## 1. TỔNG QUAN

Ứng dụng web SaaS giúp **chủ nhà trọ quản lý** hoạt động cho thuê phòng.
**Multi-tenant** — mỗi chủ trọ đăng ký tài khoản riêng, data hoàn toàn tách biệt qua RLS.

**Tech stack:**
- Frontend: Next.js 15 (App Router) + React 19 + TypeScript + Tailwind v4 + shadcn/ui (Base UI)
- Backend & DB: Supabase (PostgreSQL + Auth + Storage)
- Mobile first (bottom nav mobile, sidebar desktop)
- `nextjs-toploader` cho navigation loading indicator

---

## 2. NGƯỜI DÙNG

| Vai trò | Mô tả |
|---|---|
| **Chủ trọ** | Đăng ký tài khoản bằng username. Toàn quyền quản lý data của mình. |

- Đăng nhập bằng **username** (không dùng email trực tiếp)
- Username được map thành `username@quanlynhatro.local` trước khi gửi Supabase Auth
- Không có email confirmation (tắt trong Supabase Dashboard → Auth Settings)

---

## 3. TÍNH NĂNG ĐÃ IMPLEMENT

### 3.1 Quản lý Phòng
- Thêm / sửa / xóa phòng
- Thông tin: tên phòng, tầng, giá thuê/tháng, mô tả
- Trạng thái: **Trống** | **Đang thuê**
- Format tiền VND với dấu phẩy (input type text + formatVND)

### 3.2 Quản lý Người Thuê
- Thêm / sửa người thuê — thông tin: họ tên, SĐT, CCCD, ngày vào, tiền cọc
- Gán người thuê vào phòng
- **Tái kích hoạt**: khi nhập SĐT/CCCD trùng với tenant cũ (inactive) → banner gợi ý tái kích hoạt thay vì tạo mới
- Kết thúc hợp đồng → lưu `rental_history`, phòng về trạng thái trống
- Khi kết thúc hợp đồng: hiện bảng tính tiền cọc - hóa đơn chưa thu = hoàn trả

### 3.3 Hóa Đơn Hàng Tháng
- Tổng = tiền phòng + điện + nước + tiền rác + tiền cáp mạng
- Giá điện/nước/rác/mạng lấy mặc định từ Settings, có thể override từng hóa đơn
- Tiền cáp mạng: mặc định fill từ settings, nhập 0 nếu phòng không dùng
- In hóa đơn (`window.print()`) — URL localhost bị ẩn qua `@page { margin: 0 }`
- Đánh dấu đã thu / chưa thu

### 3.4 Cài Đặt
- Giá điện (đ/kWh), giá nước (đ/m³), tiền rác (đ/tháng), cáp mạng (đ/tháng)
- Thông tin ngân hàng (tên NH, số TK, chủ TK)
- Mỗi user có 1 row settings riêng (upsert theo `user_id`)

### 3.5 Auth
- `/login` — đăng nhập bằng username + password
- `/register` — đăng ký username + password + confirm, tự tạo settings row mặc định
- `/register` và `/login` được whitelist trong middleware (không redirect)

---

## 4. DATABASE SCHEMA

```sql
-- Phòng
rooms (
  id, user_id,
  name, floor, price, description, status,
  created_at
)

-- Người thuê
tenants (
  id, user_id,
  full_name, phone, cccd, room_id,
  start_date, end_date, is_active, deposit,
  created_at
)

-- Hóa đơn tháng
invoices (
  id, user_id, room_id, tenant_id, month, year,
  room_price,
  electric_start, electric_end, electric_price, electric_total [generated],
  water_start, water_end, water_price, water_total [generated],
  garbage_fee, internet_fee,
  total_amount [generated = room + electric + water + garbage + internet],
  is_paid, paid_at, note,
  created_at,
  unique(room_id, month, year)
)

-- Lịch sử thuê (snapshot khi khách rời)
rental_history (
  id, user_id, room_id,
  tenant_name, tenant_phone, tenant_cccd,
  start_date, end_date,
  created_at
)

-- Cài đặt (1 row / user)
settings (
  id, user_id [unique],
  electric_price, water_price, garbage_fee, internet_fee,
  bank_name, bank_account, bank_owner, qr_image_url,
  updated_at
)
```

**RLS:** tất cả bảng dùng policy `user_id = auth.uid()` — mỗi user chỉ thấy data của mình.

---

## 5. CẤU TRÚC THƯ MỤC

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   └── (dashboard)/
│       ├── layout.tsx
│       ├── loading.tsx
│       ├── page.tsx                      # Dashboard / Tổng quan
│       ├── rooms/                        # Quản lý phòng
│       │   ├── loading.tsx
│       │   ├── page.tsx
│       │   ├── new/
│       │   ├── [id]/
│       │   └── _components/
│       │       ├── room-form.tsx
│       │       └── room-actions.tsx
│       ├── tenants/                      # Quản lý người thuê
│       │   ├── loading.tsx
│       │   ├── page.tsx
│       │   ├── new/
│       │   ├── [id]/
│       │   └── _components/
│       │       ├── tenant-form.tsx       # Có logic tái kích hoạt
│       │       └── tenant-actions.tsx    # Kết thúc hợp đồng + tính cọc
│       ├── invoices/                     # Hóa đơn
│       │   ├── loading.tsx
│       │   ├── page.tsx
│       │   ├── new/
│       │   ├── [id]/
│       │   └── _components/
│       │       └── invoice-form.tsx
│       └── settings/                     # Cài đặt
│           ├── page.tsx
│           ├── settings-form.tsx
│           └── logout-button.tsx         # Chỉ hiện trên mobile
├── components/
│   ├── ui/
│   │   ├── password-input.tsx            # Toggle show/hide password
│   │   └── ...shadcn components
│   └── shared/
│       ├── sidebar.tsx                   # Desktop nav + logout
│       └── bottom-nav.tsx               # Mobile nav (safe area inset)
├── lib/
│   ├── supabase/client.ts
│   ├── supabase/server.ts
│   └── utils.ts
├── middleware.ts                          # Auth guard, whitelist /login /register
└── types/database.ts
```

---

## 6. CÁC LƯU Ý KỸ THUẬT QUAN TRỌNG

### Supabase
- Client **không typed** với Database generic (tránh lỗi `never`) — cast kết quả thủ công: `data as Room[]`
- Zod v4: dùng `.issues` không phải `.errors` trên ZodError
- Generated columns (`electric_total`, `water_total`, `total_amount`) — loại khỏi Insert type
- Settings dùng `upsert` với `onConflict: 'user_id'`
- Multi-tenant: mọi INSERT phải thêm `user_id: user!.id` (lấy từ `supabase.auth.getUser()`)

### Next.js
- `router.refresh()` phải gọi **trước** `router.push()` — ngược lại cache không được invalidate đúng
- `loading.tsx` có ở tất cả route để hiện skeleton khi navigate
- `viewportFit: "cover"` trong viewport config — bắt buộc cho iOS safe area

### UI / UX
- **Base UI Select**: `SelectValue` render raw value (UUID) — luôn dùng custom `<span>` trong `SelectTrigger` thay vì `<SelectValue>`
- **Format VND**: dùng `formatVND()` helper (strip non-digits → thêm dấu phẩy mỗi 3 số) cho tất cả input tiền
- **iOS safe area**: bottom nav có `paddingBottom: env(safe-area-inset-bottom)`, main content có `calc(5rem + env(safe-area-inset-bottom))`
- **Print**: `@page { margin: 0 }` + `body { padding: 12mm }` để ẩn URL browser

---

## 7. LUỒNG SỬ DỤNG CHÍNH

```
1. Đăng ký tài khoản
   └── /register → nhập username + password → tự tạo settings mặc định

2. Cài đặt ban đầu
   └── /settings → nhập giá điện, nước, rác, mạng, thông tin ngân hàng

3. Thêm phòng
   └── /rooms/new → tên phòng, tầng, giá thuê

4. Có khách thuê
   └── /tenants/new → nhập thông tin → gán phòng → phòng chuyển "Đang thuê"
   └── Nếu khách cũ quay lại → hệ thống gợi ý tái kích hoạt

5. Cuối tháng
   └── /invoices/new → chọn phòng → nhập điện/nước → tạo hóa đơn
   └── In PDF gửi khách

6. Khách trả tiền
   └── Đánh dấu hóa đơn "Đã thanh toán"

7. Khách chuyển đi
   └── Kết thúc hợp đồng → hệ thống tính tiền hoàn cọc → lưu lịch sử
```

---

## 8. QUY TẮC CODE

- TypeScript strict, không dùng `any`
- Server Components mặc định, Client Components khi cần (`'use client'`)
- Validate bằng Zod ở client trước khi gọi Supabase
- Không bao giờ bỏ RLS trên Supabase production
- Không có chức năng xóa người thuê (tránh mất lịch sử hóa đơn)
