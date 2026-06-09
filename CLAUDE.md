# CLAUDE.md — Phần Mềm Quản Lý Nhà Trọ

> Tài liệu định hướng dự án. Cập nhật liên tục trong quá trình phát triển.

---

## 1. TỔNG QUAN

Ứng dụng web nội bộ giúp **chủ nhà trọ tự quản lý** hoạt động cho thuê phòng.
Không phức tạp, không multi-tenant — một người dùng duy nhất (chủ trọ = admin).

**Tech stack:**
- Frontend: Next.js 14+ (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- Backend & DB: Supabase (PostgreSQL + Auth + Storage)
- Mobile first

---

## 2. NGƯỜI DÙNG

| Vai trò | Mô tả |
|---|---|
| **Admin (Chủ trọ)** | Người dùng duy nhất. Toàn quyền quản lý. |

> Không có portal khách thuê, không có phân quyền phức tạp.

---

## 3. TÍNH NĂNG

### 3.1 Quản lý Phòng
- Thêm / sửa / xóa phòng
- Thông tin phòng: tên phòng, tầng, giá thuê/tháng, mô tả
- Trạng thái: **Trống** | **Đang thuê**
- Xem danh sách tất cả phòng + trạng thái nhanh

### 3.2 Quản lý Người Thuê
- Thêm / sửa / xóa người thuê
- Thông tin: họ tên, số điện thoại, CCCD, ngày bắt đầu thuê
- Gán người thuê vào phòng
- Ngày kết thúc hợp đồng (nếu có)

### 3.3 Hóa Đơn Hàng Tháng
- Nhập chỉ số điện đầu kỳ & cuối kỳ → tự động tính tiền điện
- Nhập chỉ số nước đầu kỳ & cuối kỳ → tự động tính tiền nước
- Giá điện (đ/kWh) và giá nước (đ/m³) cài đặt sẵn, chỉnh được
- Tổng hóa đơn = tiền phòng + tiền điện + tiền nước
- Xuất hóa đơn dạng PDF để in hoặc chụp gửi khách
- Trạng thái hóa đơn: **Chưa thanh toán** | **Đã thanh toán**
- Ghi nhận ngày thanh toán

### 3.4 Thanh Toán QR Code
- Hiển thị QR Code VietQR tĩnh của chủ trọ (chụp 1 lần, dùng mãi)
- In hoặc lưu ảnh QR để đưa cho khách thuê
- Ghi nhận thủ công khi khách đã chuyển khoản

### 3.5 Thống Kê
- Doanh thu theo tháng (tổng tiền đã thu)
- Doanh thu theo năm
- Số phòng đang thuê / tổng số phòng
- Danh sách hóa đơn chưa thu

### 3.6 Lịch Sử Thuê Phòng
- Xem từng phòng đã có những ai thuê
- Thời gian vào / ra của mỗi người thuê

---

## 4. DATABASE SCHEMA

```sql
-- Phòng
rooms (
  id, name, floor, price, description, status, created_at
)

-- Người thuê
tenants (
  id, full_name, phone, cccd, room_id,
  start_date, end_date, is_active, created_at
)

-- Hóa đơn tháng
invoices (
  id, room_id, tenant_id, month, year,
  room_price,
  electric_start, electric_end, electric_price, electric_total,
  water_start,   water_end,   water_price,   water_total,
  total_amount, is_paid, paid_at, note, created_at
)

-- Lịch sử thuê (ghi lại khi khách rời đi)
rental_history (
  id, room_id, tenant_name, tenant_phone, tenant_cccd,
  start_date, end_date, created_at
)

-- Cài đặt chung
settings (
  id, electric_price, water_price,
  bank_name, bank_account, bank_owner, qr_image_url,
  updated_at
)
```

---

## 5. CẤU TRÚC THƯ MỤC

```
src/
├── app/
│   ├── (auth)/login/
│   └── (dashboard)/
│       ├── layout.tsx
│       ├── page.tsx                 # Dashboard / Tổng quan
│       ├── rooms/                   # Quản lý phòng
│       ├── tenants/                 # Quản lý người thuê
│       ├── invoices/                # Hóa đơn
│       ├── statistics/              # Thống kê
│       ├── history/                 # Lịch sử thuê
│       └── settings/                # Cài đặt (giá điện, nước, QR)
├── components/
│   ├── ui/                          # shadcn/ui
│   └── shared/                      # Component dùng chung
├── lib/
│   ├── supabase/client.ts
│   ├── supabase/server.ts
│   └── utils.ts
└── types/database.ts
```

---

## 6. LUỒNG SỬ DỤNG CHÍNH

```
1. Cài đặt ban đầu
   └── Nhập giá điện, giá nước, thông tin QR ngân hàng

2. Thêm phòng mới
   └── Nhập tên phòng, giá thuê → lưu

3. Có khách thuê
   └── Thêm người thuê → gán vào phòng → phòng chuyển "Đang thuê"

4. Cuối tháng
   └── Vào từng phòng → nhập chỉ số điện/nước
   └── Hệ thống tính tổng tiền → xuất PDF hóa đơn → in/gửi khách

5. Khách trả tiền
   └── Đánh dấu hóa đơn "Đã thanh toán"

6. Khách chuyển đi
   └── Kết thúc hợp đồng → lưu vào lịch sử → phòng chuyển "Trống"
```

---

## 7. ROADMAP

### Giai đoạn 1 — MVP
- [ ] Auth (đăng nhập email/password)
- [ ] CRUD Phòng
- [ ] CRUD Người thuê + gán phòng
- [ ] Tạo hóa đơn tháng (nhập điện/nước, tính tự động)
- [ ] Xuất PDF hóa đơn
- [ ] Đánh dấu đã thanh toán
- [ ] Trang cài đặt (giá điện/nước, QR ngân hàng)
- [ ] Dashboard tổng quan

### Giai đoạn 2 — Bổ sung
- [ ] Thống kê doanh thu tháng/năm (biểu đồ)
- [ ] Lịch sử thuê phòng
- [ ] Danh sách nợ (hóa đơn chưa thu)
- [ ] Tìm kiếm / lọc

## 8. QUY TẮC CODE

- TypeScript strict, không dùng `any`
- Server Components mặc định, Client Components khi cần
- Validate bằng Zod ở cả client và server
- Không bao giờ bỏ RLS trên Supabase production
---