# Kurupan — ระบบยืม-คืนครุภัณฑ์

ระบบจัดการการยืม-คืนครุภัณฑ์ภายในองค์กร สร้างด้วย Next.js App Router, PostgreSQL และ Drizzle ORM

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16.2.2 (App Router), React 19, Tailwind CSS v4 |
| UI Components | shadcn/ui, base-ui/react, lucide-react |
| Database | PostgreSQL 16 (Drizzle ORM) |
| Auth | JWT (jose) + bcryptjs, session เก็บใน cookie |
| Validation | Zod |
| Runtime | Node.js 20 |
| Testing | Vitest + MSW |

---

## Roles & สิทธิ์การใช้งาน

| ความสามารถ | Borrower | Staff | Admin |
|---|:---:|:---:|:---:|
| ดู Dashboard ส่วนตัว | ✅ | ✅ | ✅ |
| ดู Dashboard ภาพรวมทั้งหมด | ❌ | ✅ | ✅ |
| ดูรายการครุภัณฑ์ | ✅ | ✅ | ✅ |
| เพิ่ม/แก้ไขครุภัณฑ์ | ❌ | ✅ | ✅ |
| สร้างคำขอยืม | ✅ | ✅ | ✅ |
| อนุมัติ/ปฏิเสธคำขอ | ❌ | ✅ | ✅ |
| บันทึกการคืน | ❌ | ✅ | ✅ |
| ดูประวัติทั้งระบบ / Audit Logs | ❌ | ✅ | ✅ |
| จัดการสิทธิ์ผู้ใช้ | ❌ | ❌ | ✅ |

> Login ได้ = `borrower` อัตโนมัติ — `staff` / `admin` ต้องถูกกำหนดโดย Admin

---

## การติดตั้งและรัน

### ข้อกำหนดเบื้องต้น

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Node.js 20+
- npm

### 1. ตั้งค่า Environment

```bash
cp .env.example .env.local
```

แก้ไขค่าใน `.env.local`:

```env
DATABASE_URL=postgresql://app:secret@localhost:5432/borrowing
SESSION_SECRET=change-me-to-random-64-char-hex
APP_ENV=development
LOG_LEVEL=debug
SESSION_TTL_HOURS=8
NEXT_PUBLIC_APP_NAME=Kurupan Borrowing System
```

### 2. เริ่ม Database

```bash
docker compose up postgres -d
```

รอจน postgres พร้อม (healthy):

```bash
docker compose ps
```

### 3. ติดตั้ง Dependencies

```bash
npm install
```

### 4. Migrate + Seed Database

```bash
npm run db:setup
```

คำสั่งนี้รัน migration แล้วใส่ข้อมูลตัวอย่าง (seed) ให้อัตโนมัติ

### 5. รัน Dev Server

```bash
npm run dev
```

เปิดที่ http://localhost:3000

---

## บัญชีทดสอบ (Seed Data)

| Username | Password | Role |
|---|---|---|
| `admin` | `password` | Admin |
| `staff01` | `password` | Staff |
| `user01` | `password` | Borrower |

---

## Scripts

| คำสั่ง | คำอธิบาย |
|---|---|
| `npm run dev` | รัน dev server |
| `npm run build` | Build สำหรับ production |
| `npm run db:generate` | สร้าง migration ใหม่จาก schema |
| `npm run db:migrate` | รัน migration ที่ยังไม่ได้รัน |
| `npm run db:seed` | ใส่ข้อมูลตัวอย่าง |
| `npm run db:setup` | migrate + seed ในคำสั่งเดียว |
| `npm run db:studio` | เปิด Drizzle Studio (GUI ดูข้อมูล) |
| `npm run lint` | ตรวจ ESLint |
| `npm test` | รัน unit tests ด้วย Vitest |

---

## โครงสร้างโปรเจค

```
src/
├── app/
│   ├── (auth)/login/          # หน้า Login
│   ├── (dashboard)/           # หน้าหลักทั้งหมด (layout + pages)
│   │   ├── dashboard/
│   │   ├── assets/
│   │   ├── borrow-requests/
│   │   ├── returns/
│   │   ├── history/
│   │   └── users/
│   └── api/                   # API Routes
├── components/
│   ├── forms/                 # Form components
│   ├── layouts/               # Layout components
│   ├── shared/                # Shared UI (badges, dialogs)
│   ├── tables/                # Data table components
│   └── ui/                    # shadcn/ui base components
├── db/
│   ├── schema/                # Drizzle schema definitions
│   ├── migrations/            # SQL migrations
│   └── seed.ts                # Seed script
├── modules/                   # Business logic (services, repositories, policies)
│   ├── assets/
│   ├── auth/
│   ├── borrow/
│   ├── returns/
│   ├── users/
│   └── audit/
├── lib/                       # Utilities (auth, permissions, validators)
└── types/                     # TypeScript type definitions
```

---

## Database Schema

- **assets** — รายการครุภัณฑ์ (code, name, category, location, qty, status)
- **asset_code_series** — เทมเพลตการสร้างรหัสครุภัณฑ์อัตโนมัติ (prefix, separator, pad length)
- **borrow_requests** — คำขอยืม (ผู้ยืม, วันที่, สถานะ, items)
- **returns** — บันทึกการคืน (items, condition, วันที่)
- **local_auth_users** — ผู้ใช้ในระบบ
- **sessions** — session token
- **audit_logs** — บันทึก action ทุกอย่างในระบบ
- **notifications** — การแจ้งเตือน (ครบกำหนด, เกินกำหนดคืน)
