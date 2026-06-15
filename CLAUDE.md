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
- `xlsx` để parse file Excel khi import

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
- Thông tin: tên phòng, **khu** (số nhà / dãy), giá thuê/tháng, mô tả
- Trạng thái: **Trống** | **Đang thuê**
- Format tiền VND với dấu phẩy (input type text + formatVND)
- Danh sách phòng **group theo Khu** (Khu 74, Khu 76, Khu 78...)
- **Nhiều người cùng phòng**: 1 phòng có thể có nhiều người thuê cùng lúc
  - Room status chỉ về "Trống" khi người CUỐI CÙNG rời đi
  - Dropdown chọn phòng hiện tất cả phòng (không filter status)
  - Hiển thị: `"Khu 74 - 101"` để phân biệt phòng cùng số khác khu

### 3.2 Quản lý Người Thuê
- Thêm / sửa người thuê
- Thông tin đầy đủ (bộ công an yêu cầu):
  - Họ tên, SĐT, CCCD
  - Giới tính, Ngày sinh
  - Hộ khẩu thường trú, Nơi làm việc, Công việc
  - Dân tộc, Tôn giáo
  - Đăng ký tạm trú (Có/Không)
  - Ngày vào, Tiền cọc
- Gán người thuê vào phòng
- **Tái kích hoạt**: khi nhập SĐT/CCCD trùng với tenant cũ (inactive) → banner gợi ý tái kích hoạt thay vì tạo mới
- Kết thúc hợp đồng → lưu `rental_history`, phòng về trạng thái trống (nếu không còn ai)
- Khi kết thúc hợp đồng: hiện bảng tính tiền cọc - hóa đơn chưa thu = hoàn trả
- **Import từ Excel** (`/tenants/import`): upload .xlsx → preview → import hàng loạt
  - Đọc tất cả sheet cùng lúc
  - Mapping sheet → Khu (tự điền từ tên sheet nếu là số)
  - Match phòng theo **khu + tên phòng** (tránh nhầm khi nhiều khu có cùng số phòng)

### 3.3 Hóa Đơn Hàng Tháng
- Tổng = tiền phòng + điện + nước + tiền rác + tiền cáp mạng
- Giá điện/nước/rác/mạng lấy mặc định từ Settings, có thể override từng hóa đơn
- Tiền cáp mạng: mặc định fill từ settings, nhập 0 nếu phòng không dùng
- **Tạo hàng loạt** (`/invoices/new`): bảng Excel-like, mỗi row = 1 phòng đang thuê
  - Cột sticky trái (Khu · Phòng + tên người thuê) + scroll ngang cho các cột số liệu
  - Checkbox chọn/bỏ từng phòng; cột "= Điện", "= Nước", "Tổng" tự tính real-time
  - Chọn tháng/năm → tự query phòng đã có hóa đơn → đánh dấu "Đã tạo" + disable
  - **Auto-fill từ tháng trước**: khi chọn tháng/năm → query hóa đơn tháng trước → tự điền `electric_start` / `water_start` từ `electric_end` / `water_end`; tự điền `internet_fee` từ hóa đơn tháng trước theo từng phòng (fallback về settings nếu chưa có); `electric_end` / `water_end` reset về trống để nhập mới
  - Footer bảng hiện tổng **điện** (amber), tổng **nước** (blue), tổng **tiền** (green) — tính real-time theo các phòng được chọn
  - Submit → batch insert, báo kết quả (X tạo / Y lỗi)
- **Danh sách** (`/invoices`): group theo tháng/năm, tháng mới nhất mở sẵn, các tháng cũ collapsed
  - Filter tabs: Tất cả / Chưa thu / Đã thu
  - Mỗi group header hiện: số phòng, badge "X chưa thu", tổng tiền tháng
- In hóa đơn đơn lẻ (`window.print()`) — `@page { margin: 0 }` + `body { padding: 12mm }`
- **In hàng loạt**: `/invoices/print?month=X&year=Y` — 2 hóa đơn/tờ A4, tự động mở dialog in
  - Nút "In tháng" trên trang danh sách → dialog chọn tháng/năm → mở tab mới
  - CSS class `invoice-slip` (**148mm** height) + `invoice-pair` (page-break)
  - `invoice-cut` class = `height:0; border-top: 1px dashed` — cut line giữa 2 slip, không thêm chiều cao
  - Page dùng `<style>` tag inline để override body/main padding khi in
  - **QR code** in bên phải (cột riêng, `width: 115px screen / 62mm print`), bảng phí bên trái
- **Thống kê điện/nước tháng hiện tại** trên dashboard: sum `electric_total` + `water_total` từ tất cả hóa đơn tháng hiện tại — hiện khi đã có ít nhất 1 hóa đơn
- Đánh dấu đã thu / chưa thu

### 3.4 Cài Đặt
- Giá điện (đ/kWh), giá nước (đ/m³), tiền rác (đ/tháng), cáp mạng (đ/tháng)
- Thông tin ngân hàng (tên NH, số TK, chủ TK)
- **QR code thanh toán**: upload ảnh → lưu vào Supabase Storage bucket `qr-images`, URL lưu vào `settings.qr_image_url`
  - Path: `{user_id}/qr.{ext}` (upsert — mỗi user 1 file)
  - Hiển thị preview trong settings; nút Thay ảnh / Xóa
  - Tự động in trên hóa đơn (đơn lẻ + hàng loạt) nếu có URL
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
  name, floor, price, description, status,  -- floor = số khu (74, 76, 78...)
  created_at
)

-- Người thuê
tenants (
  id, user_id,
  full_name, phone, cccd, room_id,
  start_date, end_date, is_active, deposit,
  -- Thông tin nhân thân (bộ công an)
  gender, date_of_birth,
  hometown, workplace, occupation,
  ethnicity, religion,
  temp_residence,                            -- boolean
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
│       ├── layout.tsx                    # Chỉ render <DashboardShell> (server)
│       ├── loading.tsx
│       ├── page.tsx                      # Dashboard / Tổng quan
│       ├── rooms/                        # Quản lý phòng
│       │   ├── loading.tsx
│       │   ├── page.tsx                  # Grid 3 cột, group theo Khu
│       │   ├── new/
│       │   ├── [id]/
│       │   └── _components/
│       │       ├── room-form.tsx         # Label "Khu" thay vì "Tầng"
│       │       └── room-actions.tsx
│       ├── tenants/                      # Quản lý người thuê
│       │   ├── loading.tsx
│       │   ├── page.tsx
│       │   ├── new/
│       │   ├── [id]/
│       │   ├── import/                   # Import từ Excel
│       │   │   ├── page.tsx             # Server component, fetch rooms
│       │   │   └── import-form.tsx      # Client, parse xlsx + zone mapping
│       │   └── _components/
│       │       ├── tenant-form.tsx       # Có logic tái kích hoạt + fields mới
│       │       ├── tenant-actions.tsx    # Kết thúc hợp đồng + tính cọc
│       │       └── tenants-list.tsx      # Client: search + compact rows + collapsed inactive
│       ├── invoices/                     # Hóa đơn
│       │   ├── loading.tsx
│       │   ├── page.tsx
│       │   ├── new/
│       │   │   └── page.tsx             # Server: fetch rooms+tenants+settings → InvoiceForm
│       │   ├── [id]/
│       │   │   ├── page.tsx             # Chi tiết + print view (QR, breakdown)
│       │   │   └── invoice-actions.tsx  # Client: đánh dấu thu/chưa thu, xóa
│       │   ├── print/                    # In hàng loạt (?month=&year=)
│       │   │   ├── page.tsx             # Server: 2 hóa đơn/A4, QR bên phải
│       │   │   └── print-trigger.tsx    # Client, auto window.print()
│       │   └── _components/
│       │       ├── invoice-form.tsx      # Client: bảng Excel-like, bulk create
│       │       ├── invoice-list.tsx      # Client: group theo tháng, filter tabs
│       │       └── print-button.tsx     # Dialog chọn tháng/năm → mở tab print
│       └── settings/                     # Cài đặt
│           ├── page.tsx
│           ├── settings-form.tsx         # Giá + bank info + QR upload
│           └── logout-button.tsx         # Chỉ hiện trên mobile
├── components/
│   ├── ui/
│   │   ├── password-input.tsx            # Toggle show/hide password
│   │   └── ...shadcn components
│   └── shared/
│       ├── dashboard-shell.tsx           # Client: quản lý collapsed state sidebar
│       ├── sidebar.tsx                   # Desktop nav + toggle button (collapsed/expanded)
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
- **useState type annotation phải khai báo ĐẦY ĐỦ tất cả fields** — nếu initial value có field không có trong type → Vercel build lỗi `Object literal may only specify known properties`

### Dashboard Layout
- **`DashboardShell`** (`components/shared/dashboard-shell.tsx`) là client component duy nhất bọc toàn bộ dashboard layout — quản lý `collapsed` state của sidebar
- `layout.tsx` chỉ render `<DashboardShell>{children}</DashboardShell>` (server component thuần)
- Sidebar nhận props `collapsed` + `onToggle` — không có internal state
- Khi collapsed: sidebar `w-14` (icon only), main `md:pl-14`; khi expanded: `w-56`, `md:pl-56`
- **Không có `max-w-3xl`** trên inner div của layout — content full width; các trang tự giới hạn nếu cần
- Children (server components) vẫn render phía server đúng cách dù parent là client component — đây là pattern hợp lệ của Next.js App Router

### UI / UX
- **Base UI Select**: `SelectValue` render raw value (UUID) — luôn dùng custom `<span>` trong `SelectTrigger` thay vì `<SelectValue>`
- **Base UI Select `onValueChange`**: `v` có type `string | null` — luôn dùng `(!v || v === 'none') ? '' : v` thay vì `v === 'none' ? '' : v` để tránh lỗi TypeScript
- **Format VND**: dùng `formatVND()` helper (strip non-digits → thêm dấu phẩy mỗi 3 số) cho tất cả input tiền
- **iOS safe area**: bottom nav có `paddingBottom: env(safe-area-inset-bottom)`, main content có `calc(5rem + env(safe-area-inset-bottom))`
- **Print đơn lẻ**: `@page { margin: 0 }` + `body { padding: 12mm }` (globals.css)
- **Print hàng loạt**: page tự override bằng `<style>` tag inline — override `body/main padding`, `main > div max-width`
  - `invoice-slip` height = **148mm** (không phải 148.5mm) + `overflow: hidden` — tránh tràn trang
  - `invoice-cut` class = cut line giữa 2 slip: `height: 0; border-top: 1px dashed` — không thêm chiều cao
  - **KHÔNG dùng `border-b` trên slip** — sẽ tạo trang trắng thừa ở cuối
  - `@page { margin: 0 }` khai báo lại trong `<style>` tag của print page (belt-and-suspenders)
  - QR print size: 58mm × 58mm (override qua `.qr-img` trong `@media print`)
- **Font size base**: `html { font-size: 18px }` trong globals.css — tất cả rem scale theo đây

### Supabase Storage (QR Code)
- Bucket: `qr-images` — **public bucket**, cần tạo thủ công trong Supabase Dashboard
- Upload path: `{user_id}/qr.{ext}` — upsert (`{ upsert: true }`), mỗi user chỉ có 1 file
- 4 RLS policies cần tạo trên `storage.objects`:
  ```sql
  -- INSERT: auth user upload vào folder của mình
  WITH CHECK (bucket_id = 'qr-images' AND auth.uid()::text = (storage.foldername(name))[1])
  -- UPDATE: auth user ghi đè file của mình
  USING (bucket_id = 'qr-images' AND auth.uid()::text = (storage.foldername(name))[1])
  -- SELECT: public read
  USING (bucket_id = 'qr-images')
  -- DELETE: auth user xóa file của mình
  USING (bucket_id = 'qr-images' AND auth.uid()::text = (storage.foldername(name))[1])
  ```
- URL lưu vào `settings.qr_image_url` qua upsert; bust cache bằng `?t={Date.now()}` khi preview

### Import Excel
- Dùng thư viện `xlsx` (đã cài)
- Parse phía client với `FileReader` + `XLSX.read(..., { cellDates: true })`
- Match cột theo **keyword trong tên header** (không theo thứ tự cột)
- Match phòng theo **khu (floor) + tên phòng** — tránh nhầm khi nhiều khu có cùng số phòng
- Ngày tháng: xử lý cả JS Date object (cellDates), DD/MM/YYYY, YYYY-MM-DD
- `Đăng ký tạm trú`: parse "Có" → `true`, "Không" → `false`, còn lại → `null`

---

## 7. MAPPING EXCEL → DB (Import người thuê)

| Cột Excel | Field DB | Ghi chú |
|---|---|---|
| Họ và tên | `full_name` | keyword: `họ và tên`, `họ tên`, `tên` |
| Giới tính | `gender` | keyword: `giới tính` |
| Ngày tháng năm sinh | `date_of_birth` | keyword: `ngày tháng năm sinh`, `ngày sinh`, `sinh` |
| Số CCCD | `cccd` | keyword: `cccd`, `cmnd`, `căn cước` |
| Số điện thoại | `phone` | keyword: `điện thoại`, `sdt` |
| Hộ khẩu thường trú | `hometown` | keyword: `hộ khẩu`, `thường trú`, `địa danh` |
| Nơi làm việc | `workplace` | keyword: `nơi làm việc`, `công ty` |
| Công việc | `occupation` | keyword: `công việc` |
| Dân tộc | `ethnicity` | keyword: `dân tộc` |
| Tôn giáo | `religion` | keyword: `tôn giáo` |
| Số phòng | `room_id` | keyword: `số phòng`, `phòng` — match theo khu + tên |
| Thời gian bắt đầu ở | `start_date` | keyword: `thời gian`, `bắt đầu`, `ngày vào` |
| Đăng ký tạm trú | `temp_residence` | keyword: `tạm trú` — Có/Không → boolean |
| STT | *(bỏ qua)* | |

---

## 8. LUỒNG SỬ DỤNG CHÍNH

```
1. Đăng ký tài khoản
   └── /register → nhập username + password → tự tạo settings mặc định

2. Cài đặt ban đầu
   └── /settings → nhập giá điện, nước, rác, mạng, thông tin ngân hàng, upload QR code

3. Thêm phòng
   └── /rooms/new → tên phòng, khu (số nhà), giá thuê

4. Có khách thuê
   └── /tenants/new → nhập thông tin đầy đủ → gán phòng → phòng chuyển "Đang thuê"
   └── Nếu khách cũ quay lại → hệ thống gợi ý tái kích hoạt
   └── Hoặc import hàng loạt từ Excel: /tenants → Import → upload file

5. Cuối tháng
   └── /invoices/new → bảng tất cả phòng đang thuê → nhập điện/nước từng dòng → tạo tất cả 1 lần
   └── In PDF đơn lẻ từ /invoices/[id] (có QR nếu đã cài)
   └── Hoặc "In tháng" → chọn tháng/năm → /invoices/print → in tất cả 2/trang A4 (có QR)

6. Khách trả tiền
   └── Đánh dấu hóa đơn "Đã thanh toán"

7. Khách chuyển đi
   └── Kết thúc hợp đồng → hệ thống tính tiền hoàn cọc → lưu lịch sử
   └── Phòng chỉ về "Trống" nếu không còn người nào khác trong phòng
```

---

## 9. QUY TẮC CODE

- TypeScript strict, không dùng `any`
- Server Components mặc định, Client Components khi cần (`'use client'`)
- Validate bằng Zod ở client trước khi gọi Supabase
- Không bao giờ bỏ RLS trên Supabase production
- Không có chức năng xóa người thuê (tránh mất lịch sử hóa đơn)
