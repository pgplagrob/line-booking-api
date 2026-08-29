# LINE Booking System POC

ระบบต้นแบบสำหรับจองคิวผ่าน LINE Official Account โดยแบ่งการพัฒนาออกเป็น 2 ส่วน คือ **Backend** และ **Frontend**

> ลำดับการพัฒนา: ทำ Backend และ REST API ให้พร้อมใช้งานก่อน แล้วจึงเริ่มพัฒนา Frontend

## ภาพรวมระบบ

```text
ผู้ใช้
  ├── LINE Official Account
  │     ↓
  │   LINE Messaging API / Webhook
  │
  └── Frontend (เริ่มพัฒนาหลัง Backend พร้อม)
          ↓
Node.js + Express Backend
  ├── REST API
  ├── Booking Service
  ├── Slot Service
  └── LINE Service
          ↓
        Prisma
          ↓
        SQLite
```

## ลำดับการพัฒนา

1. **Backend** — ฐานข้อมูล, REST API, LINE Webhook และระบบแจ้งเตือน
2. **Frontend** — หน้าจอผู้ใช้และการเชื่อมต่อ REST API

## โครงสร้างโปรเจกต์

```text
line-api/
├── backend/           # Express API, Prisma และ SQLite
│   ├── prisma/
│   ├── src/
│   ├── .env.example
│   ├── .env
│   └── package.json
├── frontend/          # พื้นที่สำหรับพัฒนาเว็บใน Phase 2
├── .gitignore
└── README.md
```

---

# Phase 1: Backend

> สถานะ: กำลังพัฒนา — ให้ทำ Phase นี้ให้เสร็จก่อนเริ่ม Frontend

## Step B1: สร้าง Node.js + Express + TypeScript

- [X] สร้างโปรเจกต์ Node.js
- [X] ติดตั้ง Express
- [X] ติดตั้ง TypeScript
- [X] ติดตั้ง `tsx`
- [X] สร้าง Express Server
- [X] เปิดใช้ `express.json()`
- [X] ทดสอบเซิร์ฟเวอร์ที่ `http://localhost:3000`

## Step B2: สร้างฐานข้อมูล SQLite และ Prisma

- [X] ติดตั้ง Prisma และ Prisma Client
- [X] ติดตั้ง SQLite Adapter
- [X] สร้าง `prisma.config.ts`
- [X] สร้าง `prisma/schema.prisma`
- [X] กำหนดค่า SQLite Database
- [X] สร้าง Migration
- [X] สร้างไฟล์ฐานข้อมูล SQLite
- [X] สร้างโมเดล `User`, `Slot` และ `Booking`
- [X] เชื่อม Prisma Client เข้ากับ Backend

## Step B3: สร้าง REST API สำหรับจัดการคิว

- [X] สร้าง API ดูช่วงเวลาที่ว่าง — `GET /slots`
- [X] สร้าง API เพิ่มช่วงเวลา — `POST /slots`
- [X] สร้าง API ลบช่วงเวลาที่ยังไม่มีการจอง — `DELETE /slots/:id`
- [X] สร้าง API จองคิว — `POST /bookings`
- [X] สร้าง API ดูรายละเอียดการจอง — `GET /bookings/:id`
- [X] สร้าง API ดูการจองของผู้ใช้ — `GET /users/:userId/bookings`
- [X] สร้าง API ยกเลิกการจอง — `DELETE /bookings/:id`
- [X] ป้องกันผู้ใช้จองช่วงเวลาเดิมซ้ำและป้องกันการจองเกิน `capacity`
- [X] ตรวจสอบ input และจัดการกรณีไม่พบข้อมูลสำหรับ API ที่สร้างแล้ว
- [X] ทดสอบ REST API ด้วย Postman หรือเครื่องมืออื่น

## Step B4: ตั้งค่า LINE Official Account และ Messaging API

- [X] สร้าง LINE Official Account สำหรับระบบจองคิว
- [X] เปิดใช้งาน Messaging API ให้กับ LINE Official Account
- [X] สร้าง Provider และ Messaging API Channel ใน LINE Developers
- [X] เก็บ Channel Secret และ Channel Access Token ไว้ใน `.env`
- [X] ตรวจสอบว่า `.env` ไม่ถูกอัปโหลดขึ้น GitHub

## Step B5: เชื่อม Webhook กับ LINE

- [X] สร้าง `POST /webhook`
- [X] ตรวจสอบ Webhook Signature
- [X] ใช้ Cloudflare Tunnel หรือบริการอื่นเพื่อเปิด HTTPS URL
- [X] เชื่อมต่อ Webhook URL กับ LINE Developers
- [X] เปิดใช้งาน Webhook ใน LINE Developers
- [X] อ่านข้อความและ LINE User ID จาก Webhook
- [ ] ตอบกลับข้อความ `Hello` ผ่าน Reply API
- [ ] ทดสอบการส่งข้อความจริงผ่าน LINE

## Step B6: เชื่อม LINE เข้ากับระบบจองคิว

- [ ] เมื่อผู้ใช้ขอดูคิว ให้ดึงข้อมูลช่วงเวลาที่ว่าง
- [ ] เมื่อผู้ใช้เลือกเวลา ให้สร้างรายการจอง
- [ ] บันทึก LINE User ID กับข้อมูลการจอง
- [ ] ส่งผลลัพธ์การจองกลับไปยังผู้ใช้ผ่าน LINE
- [ ] ป้องกันการจองช่วงเวลาเดียวกันซ้ำ

## Step B7: สร้าง Flex Message

- [ ] สร้าง Flex Message แสดงช่วงเวลาที่ว่าง
- [ ] เพิ่มปุ่มเลือกและจองคิว
- [ ] สร้าง Flex Message ยืนยันการจอง
- [ ] สร้าง Flex Message แสดงรายละเอียดหรือสถานะการจอง
- [ ] ทดสอบการแสดงผลบนโทรศัพท์

## Step B8: เพิ่มระบบแจ้งเตือน (Push API)

- [ ] สร้าง Service สำหรับส่ง Push Message
- [ ] ส่งข้อความแจ้งเตือนยืนยันการจอง
- [ ] ส่งแจ้งเตือนก่อนถึงเวลานัดหมาย
- [ ] ส่งแจ้งเตือนเมื่อมีการยกเลิกหรือเปลี่ยนแปลงคิว
- [ ] จัดการกรณี User ID หรือ Token ไม่ถูกต้อง

## Step B9: ทดสอบ Backend แบบครบ Flow

- [ ] ผู้ใช้เปิดแชตกับ LINE Official Account
- [ ] บอทแสดงช่วงเวลาที่ว่าง
- [ ] ผู้ใช้เลือกและจองคิว
- [ ] ระบบบันทึกข้อมูลลง SQLite
- [ ] บอทยืนยันการจองด้วย Flex Message
- [ ] ระบบป้องกันการจองซ้ำ
- [ ] ระบบส่ง Push Notification ได้
- [ ] REST API มีรูปแบบ Response และ Error ที่พร้อมให้ Frontend ใช้งาน

## สถานะปัจจุบัน (Checkpoint: 25 สิงหาคม 2026)

ขณะนี้อยู่ระหว่าง **Step B3: REST API** และเริ่ม **Step B5: LINE Webhook** แล้ว โดยส่วนที่ทำเสร็จและตรวจสอบ TypeScript แล้วมีดังนี้:

- Prisma models: `User`, `Slot` และ `Booking`
- Prisma Client สำหรับ SQLite ผ่าน `@prisma/adapter-better-sqlite3`
- Database health check และการเชื่อมต่อ/ปิดการเชื่อมต่อ Prisma ตาม lifecycle ของ server
- Slot API สำหรับดู เพิ่ม และลบช่วงเวลา
- Booking API สำหรับสร้างการจอง
- Validation ของ request, การตรวจ user/slot, การกันผู้ใช้จอง slot เดิมซ้ำ และการกันยอดจองเกิน capacity
- ใช้ Serializable transaction และ retry เมื่อ transaction conflict

### API ที่ใช้งานได้แล้ว

| Method     | Endpoint                    | สถานะ/หน้าที่                                                                    |
| ---------- | --------------------------- | -------------------------------------------------------------------------------------------- |
| `GET`    | `/`                       | ตรวจสอบว่า server ทำงาน                                                       |
| `GET`    | `/health/db`              | ตรวจสอบการเชื่อมต่อฐานข้อมูล                                     |
| `GET`    | `/slots`                  | ดู slot พร้อม`bookedCount` และ `remaining`                                     |
| `POST`   | `/slots`                  | เพิ่ม slot โดยรับ`date`, `startTime`, `endTime`, `capacity`               |
| `DELETE` | `/slots/:id`              | ลบ slot ที่ยังไม่มี booking                                                     |
| `POST`   | `/bookings`               | จอง slot โดยรับ`userId`, `slotId` และ `note` (ถ้ามี)                  |
| `GET`    | `/bookings/:id`           | ดูรายละเอียดการจองพร้อมข้อมูลผู้ใช้และช่วงเวลา |
| `GET`    | `/users/:userId/bookings` | ดูรายการจองทั้งหมดของผู้ใช้                                       |
| `DELETE` | `/bookings/:id`           | ยกเลิกการจองที่มีสถานะ`CONFIRMED`                                    |
| `POST`   | `/webhook`                | รับ event จาก LINE และอ่านชนิด event, User ID และข้อความ          |

### งานถัดไป

1. ทดสอบ REST API และปรับรูปแบบ response/error ให้สม่ำเสมอ
2. ตรวจสอบ Webhook Signature และเชื่อม Webhook URL กับ LINE Developers

## วิธีรัน Backend

1. เข้าโฟลเดอร์ Backend

   ```bash
   cd backend
   ```
2. ติดตั้ง dependencies

   ```bash
   npm install
   ```
3. คัดลอก `.env.example` เป็น `.env` ภายใน `backend/`

   ```powershell
   Copy-Item .env.example .env
   ```
4. รัน Migration และ Generate Prisma Client

   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```
5. เริ่ม Development Server

   ```bash
   npm run dev
   ```
6. ตรวจสอบ Server และ Database

   ```text
   GET http://localhost:3000/
   GET http://localhost:3000/health/db
   ```

## Backend Definition of Done

เริ่มทำ Frontend ได้เมื่อเงื่อนไขต่อไปนี้ครบ:

- [ ] REST API สำหรับ Slot และ Booking ใช้งานได้ครบ
- [ ] Validation และ Error Response มีรูปแบบชัดเจน
- [ ] ป้องกันการจองซ้ำได้
- [ ] LINE Webhook ใช้งานร่วมกับระบบจองได้
- [ ] ทดสอบ Backend flow หลักผ่านแล้ว
- [ ] มีข้อมูล API ที่ Frontend ต้องใช้ครบ

---

# Phase 2: Frontend

> สถานะ: ยังไม่เริ่ม — เริ่ม Phase นี้หลัง Backend ผ่าน Definition of Done

## Step F1: กำหนดขอบเขตและสร้างโปรเจกต์ Frontend

- [ ] กำหนดกลุ่มผู้ใช้และหน้าจอที่ต้องมี
- [ ] เลือก Frontend framework
- [ ] สร้างโปรเจกต์และโครงสร้างหน้า
- [ ] กำหนดค่า Backend API URL ผ่าน environment variable

## Step F2: สร้างหน้าจอระบบจองคิว

- [ ] หน้าดูช่วงเวลาที่ว่าง
- [ ] หน้าสร้างและยืนยันการจอง
- [ ] หน้าดูรายละเอียดการจอง
- [ ] หน้าดูประวัติการจองของผู้ใช้
- [ ] ปุ่มยกเลิกการจอง

## Step F3: เชื่อม Frontend กับ Backend

- [ ] เชื่อม `GET /slots`
- [ ] เชื่อม `POST /bookings`
- [ ] เชื่อม `GET /bookings/:id`
- [ ] เชื่อม `GET /users/:userId/bookings`
- [ ] เชื่อม `DELETE /bookings/:id`
- [ ] แสดงสถานะ Loading, Empty และ Error

## Step F4: ทดสอบ Frontend แบบครบ Flow

- [ ] ผู้ใช้ดูช่วงเวลาที่ว่างได้
- [ ] ผู้ใช้จองคิวและเห็นผลยืนยันได้
- [ ] ผู้ใช้ดูและยกเลิกการจองได้
- [ ] Frontend แสดง Error จาก Backend ได้ถูกต้อง
- [ ] ทดสอบการแสดงผลบนมือถือและหน้าจอขนาดต่าง ๆ

## เป้าหมายสุดท้าย

```text
Backend พร้อมใช้งาน
→ LINE และ Frontend เรียกใช้ REST API ชุดเดียวกัน
→ Prisma บันทึกข้อมูลลง SQLite
→ ผู้ใช้จอง ดู และยกเลิกคิวได้
→ ระบบส่งข้อความยืนยันและแจ้งเตือนผ่าน LINE
```
