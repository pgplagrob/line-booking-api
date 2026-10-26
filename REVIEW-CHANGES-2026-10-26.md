# สรุปการเปลี่ยนแปลงวันที่ 26 ตุลาคม 2026

เอกสารนี้สรุปงานที่ทำในวันที่ **26 ตุลาคม 2026 (เวลาไทย)** ก่อน push ขึ้น Git โดยงานรอบนี้เน้นการเพิ่มหน้า Admin สำหรับสร้างช่วงเวลาเปิดจอง (Slot) ใน frontend

## ภาพรวมงาน

- เพิ่มหน้า `/add-slot` สำหรับสร้างช่วงเวลาใหม่
- ใช้ Next.js App Router, React, TypeScript, shadcn/ui และ Tailwind CSS
- เชื่อมฟอร์มกับ `POST /slots` ของ backend ผ่าน Next.js API route
- เพิ่มปุ่มเข้าสู่หน้า Add Slot จากหน้า Dashboard
- เพิ่ม validation และสถานะ loading, success และ error
- ตรวจสอบ TypeScript, production build และการเปิดหน้าเว็บแล้ว

## Flow การทำงาน

```text
ผู้ดูแลเปิด /dashboard
        ↓
กดปุ่ม "เพิ่ม Slot"
        ↓
กรอกข้อมูลที่ /add-slot
        ↓
POST /api/slots ของ Next.js
        ↓
ส่งต่อไปยัง POST /slots ของ Express backend
        ↓
Backend บันทึก Slot ผ่าน Prisma
```

การส่ง request ผ่าน API route ภายใน frontend ช่วยให้ browser ไม่ต้องเรียก backend คนละ origin โดยตรง จึงไม่ติดปัญหา CORS ในระหว่างพัฒนา

## ไฟล์ที่เพิ่ม

### `frontend/src/app/add-slot/page.tsx`

หน้าเพิ่ม Slot แบบ Client Component ประกอบด้วย:

- ช่องเลือกวันที่ โดยไม่อนุญาตให้เลือกวันก่อนวันปัจจุบันจาก date picker
- ช่องเวลาเริ่มและเวลาสิ้นสุด
- ช่องจำนวนลูกค้าสูงสุดที่รับได้
- validation ว่าเวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม
- validation ว่า capacity ต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป
- loading state ระหว่างส่งข้อมูล
- success message เมื่อเพิ่ม Slot สำเร็จ
- error message เมื่อข้อมูลไม่ถูกต้องหรือเชื่อมต่อ backend ไม่ได้
- ปุ่มล้างข้อมูลและลิงก์กลับหน้า Dashboard
- layout responsive สำหรับมือถือและหน้าจอขนาดใหญ่

ข้อมูลที่ส่งไปยัง API มีรูปแบบ:

```json
{
  "date": "2026-10-26",
  "startTime": "09:00",
  "endTime": "10:00",
  "capacity": 1
}
```

### `frontend/src/app/api/slots/route.ts`

สร้าง Next.js API route สำหรับรับ `POST /api/slots` แล้วส่งต่อไปยัง Express backend ที่ `POST /slots`

- ใช้ค่า `BACKEND_URL` จาก environment variable
- หากไม่ได้กำหนด `BACKEND_URL` จะใช้ `http://localhost:3000`
- ส่ง status code และ response จาก backend กลับไปยังหน้า Add Slot
- ตอบ `503` พร้อมข้อความภาษาไทยเมื่อเชื่อมต่อ backend ไม่ได้

ตัวอย่างการกำหนด backend URL:

```env
BACKEND_URL=http://localhost:3000
```

### `frontend/src/components/ui/button.tsx`

เพิ่ม shadcn-style Button component โดยใช้ `class-variance-authority` รองรับ:

- variant: `default`, `outline`, `ghost`
- size: `default`, `sm`, `lg`, `icon`
- disabled state และ focus ring สำหรับ keyboard navigation

### `frontend/src/components/ui/input.tsx`

เพิ่ม Input component สำหรับ form control พร้อม style ที่เข้ากับธีมดำ-เขียวของระบบ และรองรับ focus/disabled state

### `frontend/src/components/ui/label.tsx`

เพิ่ม Label component สำหรับเชื่อมกับ input ผ่าน `htmlFor` และใช้ซ้ำในฟอร์มอื่นได้

## ไฟล์ที่แก้ไข

### `frontend/src/app/dashboard/page.tsx`

- เพิ่มปุ่ม **เพิ่ม Slot** ในส่วนหัวของ Dashboard
- ปุ่มลิงก์ไปยัง `/add-slot`
- ใช้ `buttonVariants` เพื่อให้ Link มีรูปแบบเดียวกับ Button component
- ซ่อน Admin badge บนหน้าจอแคบเพื่อรักษาพื้นที่สำหรับปุ่มหลัก

## การออกแบบและการเข้าถึง

- รักษาธีมเดิมของระบบด้วยพื้นหลังสีดำและ accent สีเขียว
- ใช้ Card, Button, Input และ Label ตามแนวทางของ shadcn/ui
- รองรับ responsive layout ด้วย Tailwind CSS
- ผูก label กับ input ทุกช่อง
- ใช้ `aria-invalid` และ `aria-describedby` กับช่องที่มี validation error
- มี focus state สำหรับผู้ใช้ keyboard
- ใช้ `role="status"` สำหรับข้อความผลลัพธ์จากการส่งฟอร์ม

## ผลการตรวจสอบก่อน push

รันคำสั่งจากโฟลเดอร์ `frontend`:

```powershell
bun run typecheck
bun run build
```

ผลลัพธ์:

- `bun run typecheck` — ผ่าน
- `bun run build` — ผ่าน
- Next.js สร้าง route `/add-slot` แบบ static สำเร็จ
- Next.js สร้าง route `/api/slots` แบบ dynamic สำเร็จ
- เปิด `http://127.0.0.1:5173/add-slot` ได้ HTTP `200`
- ตรวจพบหัวข้อ “เพิ่มช่วงเวลาใหม่” ใน HTML ที่ render แล้ว

## ขอบเขตที่ยังไม่ได้ตรวจ

- ยังไม่ได้ทดสอบการสร้าง Slot แบบ end-to-end กับ Express และฐานข้อมูลในรอบนี้ เนื่องจากการตรวจหน้าเว็บไม่ได้เปิด backend ควบคู่กัน
- Dashboard ส่วนรายการ booking ยังเป็น mock data ตามโครงสร้างเดิม
- ยังไม่มีหน้าแสดงรายการ Slot หรือฟังก์ชันลบ Slot ใน frontend

## วิธีทดสอบการเพิ่ม Slot แบบครบ Flow

1. เปิด backend:

   ```powershell
   cd backend
   bun run dev
   ```

2. เปิด frontend อีก terminal:

   ```powershell
   cd frontend
   bun run dev
   ```

3. เปิด `http://127.0.0.1:5173/dashboard`
4. กด **เพิ่ม Slot**
5. กรอกวันที่ เวลา และจำนวนที่รับได้
6. กด **เพิ่มช่วงเวลา**
7. ตรวจข้อความสำเร็จ และตรวจข้อมูลผ่าน `GET http://localhost:3000/slots`

## ไฟล์ที่ควรรวมใน commit นี้

```text
REVIEW-CHANGES-2026-10-26.md
frontend/src/app/dashboard/page.tsx
frontend/src/app/add-slot/page.tsx
frontend/src/app/api/slots/route.ts
frontend/src/components/ui/button.tsx
frontend/src/components/ui/input.tsx
frontend/src/components/ui/label.tsx
```

