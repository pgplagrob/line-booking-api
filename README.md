# LINE Booking สำหรับร้านตัดผม

โปรเจกต์นี้เป็นระบบจัดการคิวร้านตัดผมแบบวันต่อวัน ลูกค้าดูเวลาว่างและจองคิวผ่าน LINE Official Account ส่วนช่างหรือผู้ดูแลร้านใช้ Admin Dashboard สำหรับเปิดช่วงเวลา ดูจำนวนที่ว่าง ติดตามคิวของวันนี้ และกดยืนยันเมื่อให้บริการลูกค้าเสร็จแล้ว

เป้าหมายของระบบคือทำให้ร้านจัดการคิวประจำวันได้จากหน้าจอเดียว โดยไม่ต้องจดคิวแยกในกระดาษหรือแชต ลูกค้าใช้ LINE ซึ่งเป็นช่องทางที่คุ้นเคยอยู่แล้ว และข้อมูลการจองทั้งหมดถูกเก็บไว้ในฐานข้อมูลเดียวกัน

## การทำงานของระบบ

เมื่อเริ่มวัน ผู้ดูแลร้านสร้าง Slot โดยกำหนดเวลาเริ่ม เวลาสิ้นสุด และจำนวนลูกค้าที่รับได้ Slot ที่สร้างจะเป็นของวันปัจจุบันตามเวลา Asia/Bangkok จึงไม่ต้องเลือกวันที่ล่วงหน้า

เมื่อลูกค้าส่งข้อความขอดูคิวใน LINE ระบบจะแสดง Slot ที่ยังเหลือที่ว่าง ลูกค้าเลือก Slot ที่ต้องการแล้วระบบสร้างการจองพร้อมผูก LINE User ID เข้ากับลูกค้า การจองใหม่มีสถานะ `CONFIRMED` ซึ่งในหน้า Admin แสดงว่า “รอให้บริการ”

หน้า Dashboard แสดงเฉพาะคิวของวันนี้และเรียงตามเวลา เมื่อช่างตัดผมเสร็จ ช่างกดปุ่ม “เสร็จแล้ว” ระบบจะเปลี่ยนสถานะเป็น `COMPLETED` การจองที่เสร็จแล้วจะยังนับว่าใช้ความจุของ Slot เดิม เพื่อไม่ให้ช่วงเวลานั้นกลับมาเปิดรับการจองซ้ำ ส่วนการจองที่ถูกยกเลิกจะมีสถานะ `CANCELLED` และคืนที่ว่างให้ Slot

```text
ผู้ดูแลสร้าง Slot ของวันนี้
        ↓
ลูกค้าดูเวลาว่างและจองผ่าน LINE
        ↓
Backend ตรวจการจองซ้ำและจำนวนที่ว่าง
        ↓
การจองปรากฏใน Admin Dashboard
        ↓
ช่างให้บริการและกด “เสร็จแล้ว”
```

## โครงสร้างระบบ

Backend ใช้ Bun, Express, TypeScript, Prisma และ SQLite ทำหน้าที่รับ LINE Webhook จัดการ Slot และ Booking ตรวจสอบลายเซ็นจาก LINE ป้องกันการจองซ้ำ และป้องกันการจองเกินจำนวนที่รับได้

Frontend เป็น Admin Dashboard ที่สร้างด้วย Next.js App Router, TypeScript, Tailwind CSS และ shadcn/ui Browser เรียก Next.js Route Handler ก่อนส่งต่อไปยัง Express Backend เพื่อลดปัญหา CORS และเก็บตำแหน่ง Backend ไว้ใน environment variable เดียว

```text
LINE Official Account ── Webhook ──┐
                                   ├── Express Backend ── Prisma ── SQLite
Admin Dashboard ── Next.js API ────┘
```

โค้ดฝั่ง Backend อยู่ใน `backend/` ส่วนหน้า Admin อยู่ใน `frontend/` จุดเริ่มต้นของ Express app คือ `backend/src/app.ts` และเส้นทางหลักของ Admin คือ `/dashboard`, `/slots` และ `/add-slot`

## API ที่ Admin ใช้งาน

การจัดการ Slot ใช้ `GET /slots`, `POST /slots` และ `DELETE /slots/:id` การดึงคิวประจำวันใช้ `GET /admin/bookings` และการยืนยันงานเสร็จใช้ `PATCH /admin/bookings/:id/complete`

API สำหรับ flow การจองประกอบด้วย `POST /bookings`, `GET /bookings/:id`, `GET /users/:userId/bookings` และ `DELETE /bookings/:id` ส่วน `POST /webhook` เป็นทางเข้าของ event จาก LINE Messaging API

## การรัน Backend

สร้างไฟล์ `backend/.env` จาก `backend/.env.example` แล้วใส่ค่า LINE Channel Secret, Channel Access Token และการเชื่อมต่อฐานข้อมูล จากนั้นรันคำสั่งต่อไปนี้

```powershell
cd backend
bun install
bunx prisma migrate dev --config prisma.config.ts
bunx prisma generate --config prisma.config.ts
bun run dev
```

Backend เปิดที่ `http://localhost:3000` และตรวจสอบการเชื่อมต่อฐานข้อมูลได้ที่ `GET http://localhost:3000/health/db`

## การรัน Admin Dashboard

เปิด PowerShell อีกหน้าต่างหนึ่งและรันคำสั่งต่อไปนี้

```powershell
cd frontend
bun install
bun run dev
```

Admin Dashboard เปิดที่ `http://127.0.0.1:5173` หาก Backend ไม่ได้เปิดที่ `http://localhost:3000` ให้กำหนด `BACKEND_URL` ใน environment ของ frontend

## ขอบเขตปัจจุบัน

ระบบนี้ยังเป็น POC สำหรับพิสูจน์ flow การจองคิวร้านตัดผม ยังไม่มีระบบล็อกอินและสิทธิ์ผู้ใช้งานสำหรับ Admin และยังไม่มีระบบแจ้งเตือนล่วงหน้าแบบตั้งเวลา ข้อมูลชื่อจาก LINE อาจยังไม่มีในบางบัญชี หน้า Admin จึงใช้ส่วนท้ายของ LINE User ID เป็นชื่อชั่วคราวเมื่อไม่มี display name

ก่อนนำไปใช้งานจริงควรเพิ่ม authentication, การทดสอบ API แบบ integration, การจัดการ secret สำหรับ production และฐานข้อมูลที่เหมาะกับการใช้งานหลายผู้ใช้พร้อมกัน
