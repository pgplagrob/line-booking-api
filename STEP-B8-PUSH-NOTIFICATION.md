# Step B8: เพิ่มระบบแจ้งเตือน (Push API)

## สถานะปัจจุบัน

Step B6 เชื่อม LINE Webhook กับระบบ Booking และ Step B7 ตอบกลับด้วย Flex Message แล้ว ระบบปัจจุบันยังใช้ Reply API สำหรับตอบ Event ที่ผู้ใช้เพิ่งส่งมา และยังไม่มี Push API, scheduler หรือประวัติการส่ง Notification

Step B8 เพิ่ม LINE Push Message สำหรับการยืนยัน Booking ที่สร้างผ่าน REST API, Reminder ก่อนถึง Slot และการแจ้งยกเลิก Booking โดยคง Reply/Flex flow เดิมไว้

## เป้าหมาย

- [ ] สร้าง Service สำหรับส่ง LINE Push Message โดยใช้ `LINE_CHANNEL_ACCESS_TOKEN` จาก environment
- [ ] ส่ง Push ยืนยัน Booking ที่สร้างผ่าน `POST /bookings` โดยไม่ส่งซ้ำกับ Flex Reply ของ Booking ที่สร้างผ่าน LINE
- [ ] กำหนด Reminder ล่วงหน้า 24 ชั่วโมงสำหรับ Booking ที่ยัง `CONFIRMED`
- [ ] ส่ง Push แจ้งเมื่อยกเลิก Booking สำเร็จ
- [ ] บันทึกงานและสถานะการส่งใน SQLite เพื่อกู้คืนงานหลัง Backend restart และป้องกันการ enqueue ซ้ำ
- [ ] จัดการ User ID, Token, LINE API และ network errors โดยไม่เปลี่ยนผลของ Booking
- [ ] ทดสอบการสร้างงาน, worker, การ retry และการส่งจริงผ่าน LINE

## ขอบเขตและกติกา

- Booking ที่สร้างผ่าน LINE คงได้รับ Flex Reply ยืนยันทันที และต้องมี Reminder ตามปกติ แต่ไม่ส่ง Push ยืนยันซ้ำ
- Booking ที่สร้างผ่าน `POST /bookings` ให้ enqueue Push ยืนยันหลังบันทึก Booking สำเร็จ
- ส่ง Reminder ก่อน `Slot.startAt` 24 ชั่วโมง เฉพาะ Booking ที่ยัง `CONFIRMED`
- ถ้าสร้าง Booking หลังเวลาที่ควรส่ง Reminder แล้ว ให้ข้าม Reminder นั้น ไม่ส่งย้อนหลังทันที
- ถ้า Reminder ค้างจน Slot เริ่มหรือผ่านไปแล้ว ให้ mark เป็น `SKIPPED` แทนการส่งข้อความล่าช้า
- เมื่อยกเลิก Booking สำเร็จ ให้ยกเลิก Reminder ที่ยังรอส่งและ enqueue Push แจ้งยกเลิก
- Step นี้แจ้งการยกเลิกเท่านั้น ยังไม่เพิ่มการเลื่อนหรือเปลี่ยน Slot เพราะระบบปัจจุบันไม่มี reschedule operation
- ใช้ Text Message สำหรับ Push ใน Step นี้; Flex Reply ใน Step B7 ไม่ต้องถูกเปลี่ยน
- ใช้ `User.lineUserId` เป็นผู้รับ Push เท่านั้น ห้ามใช้ database `User.id` แทน LINE User ID
- ถ้า User ไม่มี `lineUserId` ให้ mark งานเป็น `SKIPPED` พร้อมเหตุผล ไม่ retry
- การส่ง LINE ล้มเหลวต้องไม่ rollback การสร้างหรือยกเลิก Booking
- ห้าม log `LINE_CHANNEL_ACCESS_TOKEN`, Authorization header หรือข้อมูลลับจาก LINE response

## สิ่งที่มีอยู่แล้ว

| ส่วน | ตำแหน่ง | หน้าที่ |
| --- | --- | --- |
| LINE Webhook และ Reply/Flex | `backend/src/index.ts` | รับ Event และตอบผู้ใช้ด้วย `replyToken` |
| Booking Service | `backend/src/services/booking.ts` | สร้าง Booking, ตรวจ duplicate/capacity และยกเลิก Booking |
| User mapping | `backend/src/services/user.ts` | ค้นหาหรือสร้าง User จาก `lineUserId` |
| Database | `backend/prisma/schema.prisma` | มี `User`, `Slot` และ `Booking`; ยังไม่มี Notification model |
| LINE credentials | `backend/.env.example` | มี Channel Access Token และ Channel Secret สำหรับ LINE integration |

## Flow ที่ต้องทำให้สำเร็จ

### ยืนยัน Booking จาก REST API

```text
POST /bookings
    ↓
สร้าง Booking สำเร็จ
    ↓
enqueue CONFIRMATION ถ้ามี User.lineUserId
    ↓
worker ส่ง LINE Push Message
```

### Booking จาก LINE และ Reminder

```text
ผู้ใช้จองผ่าน LINE
    ↓
createBooking() และ Flex Reply ยืนยันตาม Step B7
    ↓
enqueue REMINDER สำหรับ Slot.startAt - 24 ชั่วโมง
    ↓
worker ตรวจเวลาถึงกำหนดและสถานะ Booking
    ↓
ส่ง Reminder หาก Booking ยัง CONFIRMED และ Slot ยังไม่เริ่ม
```

### ยกเลิก Booking

```text
ยกเลิก Booking สำเร็จ
    ↓
ยกเลิก REMINDER ที่ยังไม่ส่ง และ enqueue CANCELLATION
    ↓
worker ส่ง LINE Push Message แจ้งยกเลิก
```

## แนวทาง Implementation

### 1. เพิ่ม Notification model และ migration

เพิ่ม model สำหรับเก็บงานแจ้งเตือนใน `backend/prisma/schema.prisma` โดยอย่างน้อยควรมี:

- `id`, `bookingId`, `type` (`CONFIRMATION`, `REMINDER`, `CANCELLATION`)
- `status` เช่น `PENDING`, `PROCESSING`, `SENT`, `FAILED`, `SKIPPED`
- `scheduledAt`, `attemptCount`, `nextAttemptAt`, `sentAt`
- `lastErrorCode` หรือข้อมูล error ที่ผ่านการ sanitize แล้ว
- timestamps ที่จำเป็นต่อการตรวจสอบและกู้คืนงาน

กำหนด unique constraint บน `(bookingId, type)` เพื่อไม่สร้าง Notification ชนิดเดียวกันซ้ำสำหรับ Booking เดิม ใช้ Prisma migration และ generate client หลังแก้ schema

เมื่อทำได้ ให้บันทึก Booking state change และ Notification row ที่เกี่ยวข้องใน transaction เดียวกัน ห้ามเรียก LINE API ภายใน transaction ของ Booking

### 2. สร้าง LINE Push Service

แยกฟังก์ชันส่ง Push ออกจาก route เช่น `backend/src/services/line-notification.ts` โดย:

- เรียก LINE Messaging API Push endpoint ด้วย HTTP `POST` และ Bearer token จาก `LINE_CHANNEL_ACCESS_TOKEN`
- รับ LINE User ID กับ message object หรือข้อมูลที่จำเป็นต่อการสร้าง Text Message
- ไม่รับ database `User.id` ในตำแหน่ง recipient
- ตรวจ response status และแปลงผลเป็น error แบบที่ worker จำแนก retry ได้
- ใช้ HTTP client ที่มีอยู่ในโปรเจกต์ก่อน; หลีกเลี่ยงการเพิ่ม dependency หากไม่จำเป็น
- ไม่ retry อยู่ภายใน Service จน worker ควบคุมจำนวนครั้งและสถานะได้

ตัวอย่างเนื้อหา:

```text
ยืนยันการจอง
เวลา: <วันและเวลาเริ่ม-จบ>
รหัสการจอง: <bookingCode>
```

```text
แจ้งเตือนนัดหมาย
คุณมีนัดวันที่ <วัน> เวลา <เวลาเริ่ม-จบ>
รหัสการจอง: <bookingCode>
```

```text
ยกเลิกการจองแล้ว
เวลาเดิม: <วันและเวลาเริ่ม-จบ>
รหัสการจอง: <bookingCode>
```

แสดงเวลาใน `Asia/Bangkok` ให้สอดคล้องกับการสร้าง Slot ในระบบ

### 3. Enqueue ตาม Booking lifecycle

- ใน flow สร้าง Booking ให้ enqueue Reminder ทุกช่องทาง รวมถึง Booking ที่มาจาก LINE
- enqueue Confirmation เฉพาะ Booking ที่สร้างผ่าน REST API เพราะ LINE flow มี Reply ยืนยันอยู่แล้ว
- สร้าง Reminder เฉพาะเมื่อ `Slot.startAt - 24 ชั่วโมง` ยังอยู่ในอนาคต
- หลังยกเลิกสำเร็จ ให้ยกเลิก Reminder ที่ยัง `PENDING` และ enqueue Cancellation
- การเรียกยกเลิกซ้ำหรือ Booking ที่ไม่ได้อยู่ในสถานะ `CONFIRMED` ต้องไม่สร้าง Cancellation Notification ซ้ำ
- ถ้าไม่มี LINE User ID ให้บันทึกสถานะ `SKIPPED` และเหตุผล เช่น `MISSING_LINE_USER_ID`

อย่าผูกการสร้าง Notification กับการตอบ LINE สำเร็จ การส่ง Reply/Push ล้มเหลวต้องไม่ทำให้สร้าง Booking ซ้ำ

### 4. เพิ่ม worker สำหรับงานตามเวลา

ยังไม่มี scheduler ใน Backend ปัจจุบัน ให้เพิ่ม worker ที่เริ่มและหยุดตาม lifecycle ของ Express server:

- poll งาน `PENDING` ที่ถึง `scheduledAt`/`nextAttemptAt` เป็นช่วง ๆ เช่น ทุก 60 วินาที
- อ่าน Booking, User และ Slot ล่าสุดก่อนส่ง โดยส่ง Reminder เฉพาะ Booking ที่ยัง `CONFIRMED` และ Slot ยังไม่เริ่ม
- claim งานก่อนส่ง เพื่อป้องกัน worker เดียวกันส่งแถวเดิมพร้อมกัน
- เมื่อส่งสำเร็จ ให้ mark `SENT` และบันทึก `sentAt`
- เมื่อ process restart ให้กู้คืนงาน `PENDING` และงาน `PROCESSING` ที่หมด lease กลับมาทำต่อได้
- ใช้ unique constraint ป้องกัน enqueue ซ้ำ และจำกัดให้มี worker instance เดียวใน POC ที่ใช้ SQLite
- ใช้ bounded retry และ backoff สำหรับ network error, HTTP 5xx หรือ rate limit; กำหนดจำนวนครั้งและช่วง backoff ให้ชัดใน implementation
- เมื่อ retry ครบ ให้ mark `FAILED` พร้อม error code ที่ sanitize แล้ว

การบันทึก `SENT` อาจล้มเหลวหลัง LINE รับข้อความแล้ว ทำให้มีโอกาสส่งซ้ำเมื่อ retry งาน จึงไม่ควรรับประกัน exactly-once; ให้ใช้สถานะถาวรและ deduplication ลดความเสี่ยงดังกล่าว

### 5. จัดการ Error

| กรณี | การจัดการ |
| --- | --- |
| ไม่มี `User.lineUserId` | `SKIPPED`; ไม่ retry |
| LINE ปฏิเสธ recipient/User ID | mark เป็น `FAILED` หรือ `SKIPPED` ตาม error ที่ LINE ส่งกลับ; ไม่ retry แบบเดิมซ้ำ |
| Channel Access Token ไม่ถูกต้อง/ถูกปฏิเสธ | หยุดหรือพัก worker, log sanitized error และแจ้งผู้ดูแล; ห้ามเปิดเผย Token |
| Network error, HTTP 5xx หรือ rate limit | retry แบบจำกัดจำนวนครั้งและ backoff |
| Booking ถูกยกเลิกก่อน Reminder | mark Reminder เป็น `SKIPPED` |
| Slot เริ่มหรือผ่านไปก่อน worker ส่ง Reminder | mark Reminder เป็น `SKIPPED` |
| LINE API ล้มเหลวหลังสร้างหรือยกเลิก Booking | คงผล Booking เดิมและบันทึกความล้มเหลวแยก |

อย่าพิจารณา status code เพียงอย่างเดียวหาก LINE response มี error code ที่ใช้แยก recipient error กับ channel credential error ได้ และอย่าบันทึก Authorization header หรือ response ที่อาจมีข้อมูลลับ

## วิธีทดสอบ

### ทดสอบโดยไม่ส่งข้อความจริง

- mock HTTP ของ LINE แล้วตรวจ URL, Bearer header และ request body โดยไม่พิมพ์ Token ลง log
- ตรวจว่า REST Booking สร้าง Confirmation และ Reminder ตามเงื่อนไข
- ตรวจว่า LINE Booking สร้าง Reminder แต่ไม่สร้าง Push Confirmation ซ้ำ
- ใช้ fake clock ตรวจการส่งก่อนถึงกำหนด, Reminder ที่เลยกำหนด, Slot ที่เริ่มแล้ว และ Booking ที่ถูกยกเลิก
- ตรวจ unique constraint เมื่อ enqueue `(bookingId, type)` เดิมซ้ำ
- จำลอง restart/lease หมดอายุ แล้วตรวจว่า worker นำงานค้างกลับมาทำต่อ
- จำลอง success, invalid User ID, invalid Token, network error, HTTP 5xx และ rate limit
- ตรวจว่า retry มีขีดจำกัด และ LINE error ไม่ rollback/สร้าง Booking ซ้ำ

### ทดสอบ Backend และ LINE จริง

จากโฟลเดอร์ `backend` เตรียมฐานข้อมูลและรัน server ตาม README:

```powershell
npm.cmd install
npx prisma migrate dev
npx prisma generate
npm.cmd run dev
```

ก่อนทดสอบ Push จริง ตรวจ `.env` ว่ามี Channel Access Token ที่ถูกต้อง และให้ LINE User เพิ่ม Official Account/เริ่มแชตเพื่อให้ระบบมี `lineUserId` ที่ใช้งานได้

- [ ] สร้าง Booking ผ่าน REST API แล้วได้รับ Push ยืนยัน
- [ ] สร้าง Booking ผ่าน LINE แล้วได้รับ Flex Reply เพียงครั้งเดียว และมี Reminder ถูก enqueue
- [ ] ทดสอบ Reminder โดยกำหนดเวลาทดสอบให้ถึงกำหนด โดยไม่ต้องรอ 24 ชั่วโมงจริง
- [ ] ยกเลิก Booking แล้วได้รับ Push แจ้งยกเลิก และ Reminder เดิมไม่ถูกส่ง
- [ ] ตรวจ Booking ที่ไม่มี `lineUserId` ว่าไม่ทำให้ API ล้มเหลวและไม่มีการ retry
- [ ] ทดสอบ invalid recipient/Token และยืนยันว่า Token ไม่ปรากฏใน log
- [ ] หยุดและเริ่ม Backend ใหม่ แล้วตรวจว่างานที่ยังไม่ส่งไม่หาย

ปัจจุบัน `backend/package.json` มี script `dev` แต่ยังไม่มี test/build script; เพิ่มหรือเลือกคำสั่งตรวจตามเครื่องมือที่มีเมื่อเริ่ม implement จริง และทดสอบ LINE จริงหลังผ่าน mock tests

## Definition of Done

ถือว่า Step B8 เสร็จเมื่อ:

- [ ] Push Service ส่ง Text Message ด้วย `User.lineUserId` และไม่เปิดเผย Token
- [ ] REST Booking ได้รับ Push ยืนยัน ส่วน LINE Booking ไม่ได้รับข้อความยืนยันซ้ำจาก Push
- [ ] Booking ที่ยังยืนยันอยู่ได้รับ Reminder ตามเวลาที่กำหนด และ Booking ที่ยกเลิก/Slot ที่เริ่มแล้วไม่ถูกเตือน
- [ ] ยกเลิก Booking แล้ว enqueue การแจ้งยกเลิกเพียงครั้งเดียว
- [ ] Notification state อยู่ใน SQLite และงานค้างกู้คืนได้หลัง restart
- [ ] Unique constraint, worker claim และ bounded retry ลดการส่งซ้ำและป้องกัน retry ไม่สิ้นสุด
- [ ] LINE API error ไม่ทำให้ Booking ถูกสร้างหรือยกเลิกซ้ำ
- [ ] ทดสอบ mock ครบ success, permanent error และ transient error
- [ ] ทดสอบ Push จริงผ่าน LINE อย่างน้อย confirmation, reminder และ cancellation

## ลำดับที่แนะนำสำหรับ /implement

```text
1. เพิ่ม Notification model, unique constraint และ migration
2. เพิ่ม LINE Push Service และทดสอบ request ด้วย mocked HTTP
3. Enqueue Reminder ใน flow สร้าง Booking และ Cancellation ใน flow ยกเลิก
4. Enqueue Confirmation สำหรับ REST Booking โดยคง Flex Reply เดิมสำหรับ LINE
5. เพิ่ม worker, claim/lease, retry/backoff และ shutdown lifecycle
6. เพิ่ม tests สำหรับเวลา, cancellation, restart, duplicate และ error handling
7. ทดสอบ migration, generate, typecheck/test ตาม scripts ที่มี
8. ทดสอบการส่งจริงผ่าน LINE และตรวจ logs ว่าไม่มี secret
```