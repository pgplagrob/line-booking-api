# ทบทวนไฟล์ที่เปลี่ยนเมื่อวันที่ 24 ตุลาคม 2026

เอกสารนี้สรุปงานที่เกิดขึ้นในวันที่ **24 ตุลาคม 2026 (เวลาไทย)** เพื่อใช้ย้อนทบทวนว่าแต่ละไฟล์มีหน้าที่อะไร เชื่อมต่อกันอย่างไร และควรเรียนรู้อะไรจากการเปลี่ยนแปลงครั้งนี้

## ขอบเขตที่ใช้ตรวจ

- จุดเริ่มเปรียบเทียบ: commit `d9a2384` ซึ่งเป็น commit ล่าสุดบน `main` ก่อนวันที่ 24 ตุลาคม
- จุดสิ้นสุด: ไฟล์ใน working tree หลังจบงานวันที่ 24 ตุลาคม
- พบทั้งหมด **28 ไฟล์**
  - แก้ไข 10 ไฟล์
  - เพิ่ม 16 ไฟล์
  - ลบ 2 ไฟล์
- ไม่รวมไฟล์ที่เครื่องมือสร้างและถูก ignore เช่น `node_modules/`, `frontend/.next/` และ `frontend/out/`

ใน Git history ของ `main` มีงานวันที่ 24 ตุลาคมดังนี้:

| เวลา | Commit | สิ่งที่เกิดขึ้น |
| --- | --- | --- |
| 13:42 | `c456636` | แก้ชื่อและเพิ่มคำศัพท์ใน `CONTEXT.md` ก่อนที่ไฟล์นี้จะถูกลบภายหลัง |
| 13:43 | `f0ff006` | แก้ `backend/README.md` |
| 13:43 | `2f7a274` | merge งานจาก `origin/main` เข้ากับ `main` |

> หมายเหตุ: Git มี commit `a0822b0` ชื่อ `baseline checkpoint` ที่ไม่ได้อยู่บนสายของ branch `main` จึงไม่ได้ใช้เป็นฐานสำหรับสรุปหรือ push งานครั้งนี้

## ภาพรวมของสิ่งที่ทำ

งานแบ่งออกเป็น 3 กลุ่มใหญ่:

1. เปลี่ยน backend จากการใช้ npm/Node tooling มาใช้ **Bun** เป็น runtime และ package manager
2. เปลี่ยน Prisma SQLite adapter จาก `@prisma/adapter-better-sqlite3` เป็น `@prisma/adapter-libsql` เพื่อทำงานกับ Bun
3. เริ่ม frontend สำหรับผู้ดูแลด้วย **Next.js App Router + React + TypeScript + shadcn/ui + Tailwind CSS**

Flow หลังการเปลี่ยนแปลงมีภาพรวมดังนี้:

```text
ผู้ดูแลเปิด http://127.0.0.1:5173
        ↓
frontend/src/app/page.tsx
redirect ไป /dashboard
        ↓
frontend/src/app/dashboard/page.tsx
แสดงข้อมูลการจองแบบ mock ผ่าน Badge, Card และ Table

backend: bun run dev
        ↓
bun --watch src/index.ts
        ↓
Express routes/services เดิม
        ↓
PrismaClient + PrismaLibSql
        ↓
SQLite
```

ตอนนี้ frontend และ backend ยังเป็นคนละส่วนกัน หน้า Dashboard ยังไม่ได้เรียก REST API

---

## 1. ไฟล์ระดับ root และเอกสารภาพรวม

### `.gitignore` — แก้ไข

เพิ่มการ ignore:

```gitignore
/frontend/.next/
/frontend/out/
```

- `.next/` เป็น cache และ build output ของ Next.js
- `out/` เป็น static export output หากมีการ export ในอนาคต
- ไฟล์เหล่านี้สร้างใหม่ได้ จึงไม่ควร commit เข้า Git

สิ่งที่ควรจำ: source code ต้องเก็บใน Git แต่ generated output ขนาดใหญ่ที่สร้างใหม่ได้ควรถูก ignore

### `README.md` — แก้ไข

การเปลี่ยนแปลงสำคัญ:

- เปลี่ยนคำอธิบาย backend จาก Node.js เป็น Bun
- เปลี่ยนคำสั่งติดตั้งและรันจาก `npm`/`npx` เป็น `bun`/`bunx`
- เปลี่ยน Prisma adapter ที่เอกสารกล่าวถึงเป็น `@prisma/adapter-libsql`
- ทำเครื่องหมาย Step B7 Flex Message ว่าเสร็จแล้ว
- เปลี่ยนสถานะ frontend จาก “ยังไม่เริ่ม” เป็น Admin Dashboard ที่กำลังพัฒนา
- เพิ่มรายการงาน frontend ที่ทำแล้วและรายการ API ที่ยังต้องเชื่อม

จุดสำคัญในการอ่าน:

- README เป็น roadmap และภาพรวม ไม่ใช่หลักฐานว่า production หรือ LINE จริงทำงานแล้ว
- checkbox เรื่อง Flex Message และการทดสอบบนโทรศัพท์ถูกเปลี่ยนเป็นเสร็จแล้ว แต่การตรวจ source ในเอกสารนี้ไม่ได้ยืนยันการทดสอบผ่าน LINE จริง
- หัวข้อ checkpoint ยังเขียนว่า “9 กันยายน 2026” และกำลังเริ่ม Step B6 ซึ่งไม่ตรงกับสถานะ Step B7/Frontend ที่อัปเดตใหม่ ควรกลับมาปรับให้สอดคล้องกัน

### `BACKEND-LEARNING-PATH.md` — แก้ไข

ปรับคู่มือเรียน backend ให้ตรงกับ Bun:

- อธิบาย `bun.lock`
- เปลี่ยน adapter เป็น `@prisma/adapter-libsql`
- เปลี่ยนคำสั่งเริ่ม server เป็น `bun run dev`
- เปลี่ยนหัวข้อพื้นฐานจาก Node.js เป็น JavaScript/TypeScript สำหรับ Bun

จุดที่ต้องระวัง: ผังโฟลเดอร์ยังแสดง `CONTEXT.md` แต่ไฟล์นั้นถูกลบจาก working tree แล้ว

### `CONTEXT.md` — ลบ

ไฟล์นี้เคยเป็น glossary ของคำสำคัญใน domain เช่น:

- LINE User ID
- Slot
- Booking
- Booking Command
- Booking Notification
- LINE Push Message
- Reminder

ก่อนถูกลบ มีการเปลี่ยนชื่อหัวข้อจาก `LINE Booking Context` เป็น `LINE Booking API` และเพิ่มคำศัพท์เกี่ยวกับ notification/push/reminder

ผลของการลบคือ repository ไม่มีไฟล์กลางที่กำหนดความหมายของคำใน domain และ `BACKEND-LEARNING-PATH.md` ยังอ้างถึงไฟล์นี้อยู่

---

## 2. การย้าย backend มาใช้ Bun

### `backend/package.json` — แก้ไข

ไฟล์นี้เป็นศูนย์กลางของคำสั่งและ dependency ของ backend

เพิ่มข้อมูลสำคัญ:

```json
"private": true,
"packageManager": "bun@1.3.8"
```

- `private: true` ป้องกันการ publish package นี้ขึ้น registry โดยไม่ตั้งใจ
- `packageManager` ระบุเวอร์ชัน Bun ที่โปรเจกต์คาดหวัง

Scripts ใหม่:

| คำสั่ง | หน้าที่ |
| --- | --- |
| `bun run dev` | รัน `src/index.ts` และ restart เมื่อไฟล์เปลี่ยน |
| `bun run start` | รัน backend แบบไม่เปิด watch |
| `bun run typecheck` | ตรวจ TypeScript โดยไม่สร้างไฟล์ output |
| `bun test` | รัน test ของ LINE route |

Dependency ที่เปลี่ยน:

- ลบ `@prisma/adapter-better-sqlite3`
- เพิ่ม `@prisma/adapter-libsql`
- ลบ `tsx` เพราะ Bun รัน TypeScript ได้โดยตรง
- ลบ `@types/better-sqlite3` เพราะไม่ได้ใช้ adapter เดิมแล้ว

### `backend/bun.lock` — เพิ่ม

เป็น lockfile ที่ Bun สร้างจาก `backend/package.json`

หน้าที่ของ lockfile คือเก็บ dependency tree และเวอร์ชันที่ resolve แล้ว เพื่อให้การติดตั้งบนเครื่องอื่นใกล้เคียงกัน ไม่ควรแก้ด้วยมือ

### `backend/package-lock.json` — ลบ

เป็น lockfile เดิมของ npm การลบไฟล์นี้สอดคล้องกับการเลือก Bun เป็น package manager หลัก และช่วยลดโอกาสที่ lockfile สองระบบจะขัดกัน

หลักปฏิบัติ: หลังจากเลือก Bun แล้ว ให้ใช้ `bun install` เมื่อ dependency เปลี่ยน เพื่อให้ `bun.lock` อัปเดตตาม `package.json`

### `backend/prisma/schema.prisma` — แก้ไข

เพิ่ม:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
  runtime  = "bun"
}
```

`runtime = "bun"` บอก Prisma ให้สร้าง client ที่เหมาะกับ Bun runtime ส่วน datasource ยังคงเป็น SQLite

### `backend/prisma.config.ts` — แก้ไข

เปลี่ยนเฉพาะคำแนะนำการติดตั้งใน comment จาก npm เป็น Bun:

```text
bun add --dev prisma dotenv
```

ตัว config จริงยังคงโหลด `.env`, ชี้ไปที่ schema/migrations และอ่าน `DATABASE_URL`

### `backend/src/lib/prisma.ts` — แก้ไข

เปลี่ยนตัวเชื่อม SQLite:

```text
เดิม: PrismaBetterSqlite3
ใหม่: PrismaLibSql
```

Flow ของไฟล์นี้:

1. โหลดค่าจาก `.env`
2. อ่าน `DATABASE_URL`
3. throw error ทันทีถ้าไม่มี URL
4. สร้าง `PrismaLibSql` adapter
5. ส่ง adapter เข้า `PrismaClient`
6. export `prisma` ให้ route/service อื่นใช้ร่วมกัน

ไฟล์นี้เป็น seam สำคัญ: business logic ไม่ต้องรู้ว่า connection ถูกสร้างอย่างไร แค่ import `prisma` ไปใช้

### `backend/tsconfig.json` — แก้ไข

เปลี่ยน comment ตัวอย่างการติดตั้ง type จาก npm เป็น:

```text
bun add --dev @types/node
```

ไม่มี compiler option ที่เปลี่ยนพฤติกรรมจากงานนี้

### `backend/README.md` — แก้ไข

ปรับคู่มือให้ใช้คำสั่ง Bun และระบุ `bun.lock` ในโครงสร้าง เพิ่มคำอธิบายแต่ละ folder/file ให้อ่านง่ายขึ้น และอธิบายว่า Prisma เชื่อม SQLite ผ่าน `@prisma/adapter-libsql`

ลำดับรัน backend ตามเอกสาร:

```powershell
cd backend
bun install
Copy-Item .env.example .env
bunx prisma migrate dev --config prisma.config.ts
bunx prisma generate --config prisma.config.ts
bun run dev
```

---

## 3. การเริ่ม Next.js Admin Dashboard

### `frontend/package.json` — เพิ่ม

กำหนด frontend เป็น Next.js 16 + React 19 และใช้ Bun 1.3.8

Scripts:

| คำสั่ง | หน้าที่ |
| --- | --- |
| `bun run dev` | เปิด Next.js dev server ที่ `127.0.0.1:5173` |
| `bun run build` | สร้าง production build |
| `bun run start` | เปิด production server จาก build ที่ port 5173 |
| `bun run typecheck` | สร้าง route types แล้วตรวจ TypeScript |

Dependency แบ่งได้เป็น:

- Framework: `next`, `react`, `react-dom`
- UI composition: `class-variance-authority`, `clsx`, `tailwind-merge`
- Icon: `lucide-react`
- Styling/build: Tailwind CSS 4, PostCSS และ `tw-animate-css`

### `frontend/bun.lock` — เพิ่ม

ล็อก dependency ของ frontend แยกจาก backend เพราะทั้งสองโฟลเดอร์มี `package.json` ของตัวเอง

### `frontend/tsconfig.json` — เพิ่ม

ค่าที่ควรสังเกต:

- `strict: true` เปิดการตรวจ type แบบเข้ม
- `noEmit: true` ให้ Next.js/Bundler เป็นผู้สร้าง output
- `moduleResolution: "Bundler"` เหมาะกับระบบ bundler สมัยใหม่
- alias `@/*` ชี้ไปที่ `src/*`
- เก็บ incremental cache ใน `.next/cache/`

ดังนั้น import นี้:

```ts
import { Badge } from "@/components/ui/badge";
```

จะชี้ไปที่ `frontend/src/components/ui/badge.tsx`

### `frontend/next-env.d.ts` — เพิ่ม

Next.js สร้างไฟล์นี้เพื่อโหลด type definitions และ route types ของ framework ไม่ควรแก้ด้วยมือ

### `frontend/next.config.ts` — เพิ่ม

ตั้งค่า:

- `agentRules: false`
- `turbopack.root: process.cwd()` เพื่อกำหนด root ให้เป็นโฟลเดอร์ frontend ที่รันคำสั่งอยู่

การ pin root ช่วยไม่ให้ Turbopack เดา workspace root จาก lockfile ที่อยู่นอก frontend

### `frontend/postcss.config.mjs` — เพิ่ม

เชื่อม PostCSS กับ Tailwind CSS 4 ผ่าน plugin `@tailwindcss/postcss`

### `frontend/components.json` — เพิ่ม

เป็น config ของ shadcn/ui:

- ใช้ style `new-york`
- รองรับ React Server Components
- ใช้ TypeScript/TSX
- ใช้ CSS variables
- กำหนด alias ให้ตรงกับ `tsconfig.json`
- ใช้ `src/app/globals.css` เป็น stylesheet หลัก

### `frontend/src/app/layout.tsx` — เพิ่ม

เป็น root layout ที่ครอบทุก route:

- import `globals.css` หนึ่งครั้ง
- กำหนด metadata ของหน้าเว็บ
- ตั้ง `<html lang="th">`
- เปิด dark theme ผ่าน class `dark`
- render route ปัจจุบันผ่าน `children`

### `frontend/src/app/page.tsx` — เพิ่ม

เป็น route `/` และมีหน้าที่เดียวคือ redirect ไป `/dashboard`

การแยก redirect ไว้ตรงนี้ทำให้ URL เริ่มต้นพาผู้ดูแลไปยังหน้าหลักโดยไม่ต้องสร้าง UI ซ้ำ

### `frontend/src/app/dashboard/page.tsx` — เพิ่ม

เป็น route `/dashboard` และเป็นหน้าหลักที่ผู้ใช้เห็น

ข้อมูลภายในมี 2 ชุด:

- `summary`: จำนวนจองทั้งหมด, รอดำเนินการ และเสร็จสิ้น
- `bookings`: ชื่อลูกค้า เวลา และสถานะ

ทั้งสองชุดเป็นข้อมูล mock ที่เขียนคงที่ในไฟล์ ยังไม่มี `fetch`, loading state, error state หรือการเชื่อม backend

Component tree โดยย่อ:

```text
AdminDashboardPage
└─ Card
   ├─ CardHeader
   │  ├─ ชื่อหน้าและคำอธิบาย mock data
   │  └─ Badge: Admin
   └─ CardContent
      ├─ summary 3 ช่อง
      └─ Table
         └─ bookings.map(...)
            ├─ ลูกค้า + UserRound icon
            ├─ เวลา
            └─ Badge สถานะ
```

### `frontend/src/app/globals.css` — เพิ่ม

หน้าที่หลัก:

- import Tailwind CSS และ animation utilities
- สร้าง dark variant
- map CSS variables ให้ Tailwind ใช้เป็น theme token
- กำหนดสีพื้นหลัง ตัวอักษร card border และสีหลัก
- ตั้ง font stack ที่รองรับภาษาไทย
- ตั้ง base style ให้ `html` และ `body`

ข้อดีของ theme token คือ component ใช้ชื่อเชิงความหมาย เช่น `bg-card` และ `text-muted-foreground` แทนการผูกกับค่าสีตายตัวทุกจุด

### `frontend/src/lib/utils.ts` — เพิ่ม

สร้างฟังก์ชัน `cn()` จาก `clsx` และ `tailwind-merge`

- `clsx` รวม class ตามเงื่อนไข
- `tailwind-merge` แก้ class Tailwind ที่ชนกัน โดยให้ค่าที่ส่งมาทีหลัง override ค่าเดิม

ฟังก์ชันนี้ทำให้ UI component มี default classes แต่หน้าที่เรียกใช้ยังปรับ class เพิ่มได้

### `frontend/src/components/ui/badge.tsx` — เพิ่ม

สร้าง Badge component และ variant ด้วย `class-variance-authority`:

- `default`
- `waiting`
- `success`
- `secondary`

หน้า Dashboard เลือก variant จากสถานะ booking จึงแยก “ข้อมูลสถานะ” ออกจาก “รูปแบบสี” ได้ชัดเจน

### `frontend/src/components/ui/card.tsx` — เพิ่ม

สร้าง component ย่อย:

- `Card`
- `CardHeader`
- `CardTitle`
- `CardDescription`
- `CardContent`

ทุกตัวรับ props ของ HTML element เดิมและรวม class ผ่าน `cn()` จึงนำกลับมาใช้กับหน้าอื่นได้

### `frontend/src/components/ui/table.tsx` — เพิ่ม

สร้าง wrapper สำหรับ HTML table:

- `Table`
- `TableHeader`
- `TableBody`
- `TableRow`
- `TableHead`
- `TableCell`

`Table` มี container `overflow-x-auto` เพื่อให้ตารางเลื่อนแนวนอนได้เมื่อพื้นที่แคบ

### `frontend/README.md` — แก้ไข

เปลี่ยนจาก placeholder สั้น ๆ เป็นคู่มือ frontend:

- บอก stack ที่ใช้
- ให้คำสั่งรันด้วย Bun
- ระบุ URL และ redirect ไป `/dashboard`
- อธิบายโครงสร้าง App Router
- ย้ำว่าข้อมูลลูกค้ายังเป็น mock และยังไม่เชื่อม backend

---

## 4. จุดเชื่อมที่ควรเข้าใจ

### Package manager กับ lockfile

```text
backend/package.json  → backend/bun.lock
frontend/package.json → frontend/bun.lock
```

แต่ละแอปมี dependency ของตัวเอง จึงมี lockfile แยกกัน และควรรันคำสั่งจากโฟลเดอร์ของแอปนั้น

### Next.js route จากโครงสร้างโฟลเดอร์

```text
src/app/page.tsx           → /
src/app/dashboard/page.tsx → /dashboard
src/app/layout.tsx         → ครอบทั้งสอง route
```

App Router ใช้ชื่อ folder/file สร้าง URL ไม่ต้องประกาศ route table แยก

### UI component กับ utility

```text
dashboard/page.tsx
  ├─ components/ui/badge.tsx ─┐
  ├─ components/ui/card.tsx  ──┼→ lib/utils.ts: cn()
  └─ components/ui/table.tsx ──┘
```

หน้า route เลือกว่าจะประกอบ UI อย่างไร ส่วน component กลางดูแล style พื้นฐานและ reuse

### Prisma runtime flow

```text
schema.prisma: runtime = "bun"
        ↓ generate
src/generated/prisma
        ↓ import
src/lib/prisma.ts
        ↓ PrismaLibSql adapter
SQLite จาก DATABASE_URL
```

`schema.prisma` กำหนดสิ่งที่จะ generate ส่วน `src/lib/prisma.ts` กำหนดวิธีเชื่อม database ตอน runtime

---

## 5. สิ่งที่ยังไม่ได้ทำหรือควรกลับมาตรวจ

- Dashboard ยังใช้ mock data และยังไม่เชื่อม API
- ยังไม่มี loading, empty และ error state ใน frontend
- ยังไม่มีหน้าเพิ่ม Slot หรือจัดการ Booking จริง
- `CONTEXT.md` ถูกลบ แต่ `BACKEND-LEARNING-PATH.md` ยังอ้างถึงไฟล์นี้
- README checkpoint เก่ายังไม่สอดคล้องกับ checkbox และสถานะ frontend ล่าสุด
- การติ๊กว่าทดสอบ Flex Message บนโทรศัพท์แล้ว ควรมีผลทดสอบจริงรองรับก่อนใช้เป็นสถานะที่ยืนยันแล้ว
- ควรทดสอบ backend typecheck/test และ frontend typecheck/build ทุกครั้งก่อน push

## ลำดับทบทวนที่แนะนำ

1. อ่าน `backend/package.json` แล้วลองอธิบายว่าแต่ละ script ทำอะไร
2. อ่าน `backend/prisma/schema.prisma` คู่กับ `backend/src/lib/prisma.ts`
3. อ่าน `frontend/src/app/layout.tsx` → `page.tsx` → `dashboard/page.tsx`
4. ไล่จาก Dashboard ไปที่ `Badge`, `Card`, `Table` และ `cn()`
5. อ่าน `globals.css` เพื่อดูว่า theme token ถูกนำไปใช้ใน component อย่างไร
6. เปิด `frontend/README.md` และลองรัน frontend ตามคำสั่ง
7. กลับมาอ่าน root `README.md` แล้วแยกว่าอะไร “ทำแล้ว”, “เป็น mock” และ “ยังต้องเชื่อมระบบจริง”

## คำถามสำหรับทบทวนตัวเอง

1. ทำไมโปรเจกต์จึงลบ `package-lock.json` หลังเปลี่ยนมาใช้ Bun?
2. `runtime = "bun"` ใน Prisma generator ต่างจาก `PrismaLibSql` adapter อย่างไร?
3. เมื่อเปิด `/` ไฟล์ใดเป็นผู้พาไป `/dashboard`?
4. เพราะเหตุใด `dashboard/page.tsx` จึงยังไม่ถือว่าเชื่อม backend แล้ว?
5. `cn()` ช่วย component ของ shadcn/Tailwind อย่างไร?
6. ไฟล์ใดสร้าง route และไฟล์ใดครอบทุก route?
7. ถ้าจะเปลี่ยน mock bookings เป็นข้อมูลจริง ต้องเพิ่ม loading/error state ที่ชั้นใด?
8. ไฟล์ generated ใดไม่ควรแก้ด้วยมือ และ directory ใดไม่ควร commit?
