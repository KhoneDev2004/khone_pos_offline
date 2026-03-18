# 📖 คู่มือการตั้งค่า POS System (Setup Guide)

---

## 1. ความต้องการของระบบ (Prerequisites)

ก่อนเริ่มต้น ให้ติดตั้งโปรแกรมเหล่านี้:

| โปรแกรม | เวอร์ชั่นขั้นต่ำ | ดาวน์โหลด |
|---------|----------------|-----------|
| **Node.js** | v18.17+ | https://nodejs.org |
| **npm** | v9+ | (มากับ Node.js) |
| **Git** | ล่าสุด | https://git-scm.com |
| **Python** | 3.x (สำหรับ build better-sqlite3) | https://python.org |
| **Visual Studio Build Tools** | 2019+ (Windows เท่านั้น) | https://visualstudio.microsoft.com/visual-cpp-build-tools/ |

> ⚠️ **Windows**: `better-sqlite3` ต้องใช้ **C++ Build Tools** ในการ compile  
> ให้ติดตั้ง Visual Studio Build Tools แล้วเลือก "Desktop development with C++"

ตรวจสอบเวอร์ชั่น:
```bash
node --version    # ต้องได้ v18.17 ขึ้นไป
npm --version     # ต้องได้ v9 ขึ้นไป
```

---

## 2. ติดตั้ง Dependencies

```bash
cd d:\WPS\nexjsposnew
npm install
```

ถ้า `better-sqlite3` install ไม่ผ่าน ลองรัน:
```bash
npm install --build-from-source
```

หรือ:
```bash
npx node-gyp rebuild
npm install
```

---

## 3. ตั้งค่า Environment Variables

แก้ไขไฟล์ `.env.local` ที่อยู่ root ของโปรเจค:

```env
# ============================================
# Supabase Configuration (ไม่บังคับ — ระบบทำงาน offline ได้โดยไม่ต้องตั้งค่า)
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...your-key-here

# ============================================
# Database Path (ไม่ต้องแก้ไขถ้าใช้ค่าเริ่มต้น)
# ============================================
DATABASE_PATH=./data/pos.db

# ============================================
# App Name
# ============================================
NEXT_PUBLIC_APP_NAME=POS System
```

### วิธีหาค่า Supabase:

| ค่า | หาจากไหน |
|-----|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → `service_role` key (secret) |

> 🔒 **สำคัญ**: `SUPABASE_SERVICE_ROLE_KEY` เป็น secret key — ห้ามเผยแพร่!  
> key นี้ใช้ฝั่ง server เท่านั้น (API routes) จะไม่ถูกส่งไป browser

---

## 4. ตั้งค่า Supabase (ถ้าต้องการ Cloud Sync)

### 4.1 สร้าง Project ใน Supabase

1. ไปที่ https://supabase.com → สร้าง account / login
2. กด **New Project**
3. ตั้งชื่อ เช่น `pos-system`
4. เลือก Region ใกล้ที่สุด
5. ตั้ง Database Password (เก็บไว้ปลอดภัย)

### 4.2 สร้าง Tables ใน Supabase

ไปที่ **SQL Editor** ใน Supabase Dashboard แล้วรัน SQL นี้:

```sql
-- Products table
CREATE TABLE IF NOT EXISTS products (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  barcode TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  category TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id BIGINT PRIMARY KEY,
  total NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  amount_paid NUMERIC DEFAULT 0,
  change_amount NUMERIC DEFAULT 0,
  cashier TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT PRIMARY KEY,
  order_id BIGINT REFERENCES orders(id),
  product_id BIGINT REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0
);

-- Enable Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Allow service role to access all data
CREATE POLICY "Service role access" ON products FOR ALL USING (true);
CREATE POLICY "Service role access" ON orders FOR ALL USING (true);
CREATE POLICY "Service role access" ON order_items FOR ALL USING (true);
```

### 4.3 คัดลอก API Keys

1. ไปที่ **Settings** → **API**
2. คัดลอก **Project URL** → ใส่ใน `NEXT_PUBLIC_SUPABASE_URL`
3. คัดลอก **service_role key** → ใส่ใน `SUPABASE_SERVICE_ROLE_KEY`

---

## 5. รันระบบ (Development)

```bash
# เริ่มต้น dev server
npm run dev
```

เปิด browser:
- 🖥️ **POS Terminal**: http://localhost:3000
- 📊 **Dashboard**: http://localhost:3000/dashboard
- 📋 **Logs**: http://localhost:3000/logs

---

## 6. ผู้ใช้เริ่มต้น (Default User)

ระบบมีผู้ใช้เริ่มต้น 1 คน:

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `admin123` |
| Role | `admin` |

> ⚠️ **ควรเปลี่ยนรหัสผ่านทันทีหลังจาก deploy**

### สร้างผู้ใช้ใหม่ (API):
```bash
curl -X PUT http://localhost:3000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username": "cashier1", "password": "secure_password", "role": "cashier"}'
```

Roles ที่ใช้ได้: `admin`, `manager`, `cashier`

---

## 7. นำเข้าสินค้าจาก Excel

### 7.1 Format ไฟล์ Excel (.xlsx)

สร้างไฟล์ Excel ที่มี header ดังนี้ (Row 1):

| name | barcode | price | stock | category |
|------|---------|-------|-------|----------|
| น้ำดื่ม | 8850001 | 10000 | 100 | เครื่องดื่ม |
| ข้าวเหนียว | 8850002 | 15000 | 50 | อาหาร |

- **name** — ชื่อสินค้า (บังคับ)
- **barcode** — รหัสบาร์โค้ด (ไม่บังคับ)
- **price** — ราคา (บังคับ)
- **stock** — จำนวนสต็อก (ไม่บังคับ, ค่าเริ่มต้น = 0)
- **category** — หมวดหมู่ (ไม่บังคับ)

### 7.2 วิธี Import

1. ไปที่ **Dashboard** → **Products**
2. กดปุ่ม **Import Excel**
3. เลือกไฟล์ `.xlsx`
4. ระบบจะ import อัตโนมัติ

---

## 8. ตั้งค่า Electron (Desktop App)

ถ้าต้องการ package เป็น `.exe`:

```bash
# รันในโหมด Electron development
npm run electron:dev

# Build เป็น .exe (production)
npm run electron:build
```

### เปลี่ยนไอคอน App
วางไฟล์ icon ที่:
- `public/icon.ico` (Windows)
- `public/icon.icns` (macOS)
- `public/icon.png` (General)

---

## 9. โครงสร้างฐานข้อมูล SQLite

ฐานข้อมูลจะถูกสร้างอัตโนมัติที่ `data/pos.db` เมื่อรันระบบครั้งแรก

### Tables:

| Table | Description |
|-------|-------------|
| `products` | รายการสินค้า (ชื่อ, บาร์โค้ด, ราคา, สต็อก) |
| `orders` | คำสั่งซื้อ (ยอดรวม, วิธีชำระ, สถานะ sync) |
| `order_items` | รายการสินค้าในแต่ละออเดอร์ |
| `users` | ผู้ใช้ระบบ (username, password hash, role) |
| `logs` | บันทึก log ของระบบ |

### Indexes (เพิ่มความเร็ว):
- `products(barcode)` — ค้นหาจากบาร์โค้ด
- `products(name)` — ค้นหาจากชื่อ
- `orders(created_at)` — กรองตามวันที่
- `orders(synced)` — ค้นหา order ที่ยังไม่ sync

---

## 10. การ Sync ข้อมูลไป Cloud

### วิธีการทำงาน:
1. ทุกการสร้าง order จะบันทึกใน SQLite ก่อน (`synced = 0`)
2. หลังสร้าง order สำเร็จ → ระบบจะพยายาม sync ไป Supabase อัตโนมัติ
3. ถ้า sync สำเร็จ → เปลี่ยนเป็น `synced = 1`
4. ถ้า offline → order จะรอจนกว่าจะ online แล้ว sync ทีหลัง

### Manual Sync:
```bash
# ตรวจสอบสถานะ sync
curl http://localhost:3000/api/sync

# บังคับ sync ทันที
curl -X POST http://localhost:3000/api/sync
```

---

## 11. Checklist สรุป

- [ ] ติดตั้ง Node.js v18.17+
- [ ] ติดตั้ง C++ Build Tools (Windows)
- [ ] รัน `npm install`
- [ ] แก้ไข `.env.local` (ถ้าต้องการ cloud sync)
- [ ] สร้าง Supabase tables (ถ้าต้องการ cloud sync)
- [ ] รัน `npm run dev`
- [ ] เข้า http://localhost:3000 เพื่อทดสอบ
- [ ] Import สินค้าจาก Excel
- [ ] เปลี่ยนรหัสผ่าน admin
- [ ] (ไม่บังคับ) Build Electron `.exe`
