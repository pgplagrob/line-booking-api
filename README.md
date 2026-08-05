# LINE Booking API POC

ระบบต้นแบบสำหรับจองคิวผ่าน LINE Official Account โดยใช้ Node.js Backend, REST API, Prisma และ SQLite

## ภาพรวมระบบ

```text
ผู้ใช้
  ↓
LINE Official Account
  ↓
LINE Messaging API
  ↓
Node.js + Express Backend
  ├── Webhook
  ├── Booking Service
  ├── Slot Service
  └── LINE Service
        ↓
      Prisma
        ↓
      SQLite
```

## แผนการทำ POC ทั้งหมด 11 Steps

### Step 1: สร้าง LINE Official Account

- [ ] สร้าง LINE Official Account สำหรับระบบจองคิว

### Step 2: เปิดใช้งาน Messaging API

- [ ] เปิดใช้งาน Messaging API ให้กับ LINE Official Account
- [ ] สร้าง Provider และ Messaging API Channel ใน LINE Developers
- [ ] เก็บ Channel Secret และ Channel Access Token ไว้อย่างปลอดภัย

### Step 3: สร้าง Node.js + Express + TypeScript

- [x] สร้างโปรเจกต์ Node.js
- [x] ติดตั้ง Express
- [x] ติดตั้ง TypeScript
- [x] ติดตั้ง `tsx`
- [x] สร้าง Express Server
- [x] เปิดใช้ `express.json()`
- [x] ทดสอบเซิร์ฟเวอร์ที่ `http://localhost:3000`

### Step 4: เชื่อม Webhook กับ LINE

- [ ] สร้าง `POST /webhook`
- [ ] เชื่อมต่อ Webhook URL กับ LINE Developers
- [ ] ตรวจสอบ Webhook Signature
- [ ] เปิดใช้งาน Webhook ใน LINE Developers
- [ ] ใช้ Cloudflare Tunnel หรือบริการอื่นเพื่อเปิด HTTPS URL

### Step 5: ให้บอทตอบ "Hello" เมื่อได้รับข้อความ

- [ ] รับข้อความจากผู้ใช้ผ่าน Webhook
- [ ] อ่านข้อความและ User ID
- [ ] ตอบกลับข้อความ `Hello` ผ่าน Reply API
- [ ] ทดสอบการส่งข้อความจริงผ่าน LINE

### Step 6: สร้างฐานข้อมูล SQLite และ Prisma

- [x] ติดตั้ง Prisma และ Prisma Client
- [x] ติดตั้ง SQLite Adapter
- [x] สร้าง `prisma.config.ts`
- [x] สร้าง `prisma/schema.prisma`
- [x] กำหนดค่า SQLite Database
- [x] สร้าง Migration
- [x] สร้างไฟล์ฐานข้อมูล SQLite
- [ ] สร้างโมเดล `User`, `Slot` และ `Booking`
- [ ] เชื่อม Prisma Client เข้ากับ Backend

### Step 7: สร้าง REST API สำหรับจัดการคิว

- [ ] สร้าง API ดูช่วงเวลาที่ว่าง — `GET /slots`
- [ ] สร้าง API จองคิว — `POST /bookings`
- [ ] สร้าง API ดูรายละเอียดการจอง — `GET /bookings/:id`
- [ ] สร้าง API ดูการจองของผู้ใช้ — `GET /users/:userId/bookings`
- [ ] สร้าง API ยกเลิกการจอง — `DELETE /bookings/:id`
- [ ] ป้องกันการจองช่วงเวลาเดียวกันซ้ำ
- [ ] จัดการกรณีไม่พบข้อมูลและข้อมูลไม่ถูกต้อง
- [ ] ทดสอบ REST API ด้วย Postman หรือเครื่องมืออื่น

### Step 8: เชื่อม Webhook ให้เรียก REST API

- [ ] เมื่อผู้ใช้ขอดูคิว ให้เรียก `GET /slots`
- [ ] เมื่อผู้ใช้เลือกเวลา ให้เรียก `POST /bookings`
- [ ] บันทึก LINE User ID กับข้อมูลการจอง
- [ ] ส่งผลลัพธ์การจองกลับไปยังผู้ใช้ผ่าน LINE

### Step 9: เปลี่ยนข้อความธรรมดาเป็น Flex Message

- [ ] สร้าง Flex Message แสดงช่วงเวลาที่ว่าง
- [ ] เพิ่มปุ่มเลือกและจองคิว
- [ ] สร้าง Flex Message ยืนยันการจอง
- [ ] สร้าง Flex Message แสดงรายละเอียดหรือสถานะการจอง
- [ ] ทดสอบการแสดงผลบนโทรศัพท์

### Step 10: เพิ่มระบบแจ้งเตือน (Push API)

- [ ] สร้าง API สำหรับส่ง Push Message
- [ ] ส่งข้อความแจ้งเตือนยืนยันการจอง
- [ ] ส่งแจ้งเตือนก่อนถึงเวลานัดหมาย
- [ ] ส่งแจ้งเตือนเมื่อมีการยกเลิกหรือเปลี่ยนแปลงคิว
- [ ] จัดการกรณี User ID หรือ Token ไม่ถูกต้อง
- [ ] เก็บ Secret และ Token ไว้ใน `.env`
- [ ] ตรวจสอบว่า `.env` ไม่ถูกอัปโหลดขึ้น GitHub

### Step 11: ทดสอบระบบแบบครบ Flow

- [ ] ผู้ใช้เปิดแชตกับ LINE Official Account
- [ ] บอทแสดงช่วงเวลาที่ว่าง
- [ ] ผู้ใช้เลือกและจองคิว
- [ ] ระบบบันทึกข้อมูลลง SQLite
- [ ] บอทยืนยันการจองด้วย Flex Message
- [ ] ระบบป้องกันการจองซ้ำ
- [ ] ระบบส่ง Push Notification ได้

## สถานะปัจจุบัน

ทำแล้ว:

- Node.js + Express + TypeScript
- SQLite + Prisma เบื้องต้น
- Express Server และ `express.json()`

ยังไม่ได้ทำ:

- LINE Official Account และ Messaging API
- Webhook และ Reply API
- โมเดล `User`, `Slot`, `Booking`
- REST API สำหรับจัดการคิว
- Flex Message
- Push Notification

## เป้าหมายสุดท้าย

```text
ผู้ใช้ส่งข้อความใน LINE
→ Webhook ส่งข้อมูลมาที่ Express
→ Backend เรียก REST API สำหรับจัดการ Slot และ Booking
→ Prisma บันทึกข้อมูลลง SQLite
→ LINE Service ตอบกลับด้วย Flex Message
→ ระบบส่ง Push Notification ตามเหตุการณ์
```
