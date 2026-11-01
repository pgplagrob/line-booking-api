# สรุปการปรับระบบปิด Slot แบบ Soft delete

วันที่ดำเนินการ: 1 พฤศจิกายน 2569

## ภาพรวม

ปรับระบบจัดการ Slot ให้สามารถปิด Slot ที่มี Booking อยู่แล้วได้ โดยไม่ลบ Slot หรือ Booking ออกจากฐานข้อมูลจริง ประวัติการจองจึงยังคงใช้งานใน Admin Dashboard และประวัติลูกค้าได้ ขณะที่ Slot ที่ปิดแล้วจะไม่แสดงในรายการคิวและไม่สามารถรับการจองใหม่ได้

## ปัญหาเดิม

`DELETE /slots/:id` ตรวจจำนวน Booking ของ Slot และตอบ `409 Cannot delete a slot that has bookings` เมื่อพบข้อมูลที่เชื่อมอยู่ วิธีเดิมป้องกัน Foreign Key และประวัติการจองเสียหาย แต่ทำให้ผู้ดูแลไม่สามารถนำ Slot ดังกล่าวออกจากรายการที่เปิดรับจองได้

ระหว่างเพิ่ม `deletedAt` พบปัญหา Prisma `P3006` เพิ่มเติม เนื่องจาก `dev.db` บันทึกว่าเคยใช้ migration `20260805045058_init` แต่ไฟล์ migration นี้ไม่มีอยู่ใน repository ขณะที่ migration ถัดไปเริ่มด้วยการลบตาราง `Task` ทำให้ Prisma ไม่สามารถ replay migration history บน shadow database ที่ว่างได้

## สิ่งที่แก้ไข

| ส่วน | การเปลี่ยนแปลง |
| --- | --- |
| Prisma schema | เพิ่ม `Slot.deletedAt DateTime?` และ index `[deletedAt, startAt]` |
| Migration | แทนที่ migration history ที่ replay ไม่ได้ด้วย baseline `20261101000100_init_current_schema` |
| ปิด Slot | `DELETE /slots/:id` เปลี่ยนจากการลบแถวเป็นการตั้ง `deletedAt` |
| รายการ Slot | `GET /slots` และคิว LINE เลือกเฉพาะ Slot ที่ `deletedAt` เป็น `null` |
| สร้าง Booking | ปฏิเสธ Slot ที่ปิดแล้วด้วย `SLOT_NOT_FOUND` |
| ประวัติ Booking | ยังอ่าน Booking และ Slot ที่ปิดแล้วได้ตามเดิม |
| Admin UI | เปลี่ยนข้อความและไอคอนจากการ “ลบ” เป็นการ “ปิด Slot” พร้อมแจ้งว่าประวัติเดิมยังอยู่ |

## พฤติกรรมหลังแก้ไข

1. ผู้ดูแลสามารถปิด Slot ที่มี Booking ได้
2. Slot ที่ปิดแล้วหายจากหน้าจัดการ Slot และรายการคิวใน LINE
3. Booking เดิมไม่ถูกลบและยังอ้างอิง Slot เดิมได้
4. การส่ง Slot ID ที่ปิดแล้วมาสร้าง Booking ใหม่ถูกปฏิเสธ
5. การปิด Slot เดิมซ้ำตอบ `404 Slot not found`
6. ระบบยังไม่มีคำสั่งเปิด Slot ที่ปิดแล้วกลับมา หากต้องการสามารถเพิ่ม Restore endpoint ภายหลังได้

## การจัดการฐานข้อมูลเดิม

ฐานข้อมูล local ถูก sync ให้ตรงกับ schema ใหม่โดยรักษาข้อมูลเดิมทั้งหมด และปรับเฉพาะประวัติใน `_prisma_migrations` ให้ชี้ไปยัง baseline ใหม่ ก่อนดำเนินการมีการสำรอง `dev.db` ไว้แล้ว ไฟล์ฐานข้อมูลและไฟล์สำรองไม่ถูกนำเข้า Git

ผลตรวจหลังปรับฐานข้อมูล:

- User: 2 รายการ
- Slot: 3 รายการ
- Booking: 3 รายการ
- Slot จริงที่ถูกปิดระหว่างทดสอบ: 0 รายการ
- Migration status: up to date

## ผลการตรวจสอบ

### Migration

- `prisma validate`: ผ่าน
- Prisma Client generation: ผ่าน
- สร้าง SQLite ใหม่จากศูนย์และ apply baseline: ผ่าน
- `prisma migrate status`: up to date
- ไม่พบ `P3006` กับ baseline ใหม่

### Soft delete integration

ทดสอบด้วยฐาน SQLite แยกจาก `dev.db` จริง ได้ผลดังนี้:

- ก่อนปิด Slot: `GET /slots` ตอบ `200` และพบ Slot 1 รายการ
- ปิด Slot ที่มี Booking: ตอบ `200 Slot closed successfully`
- หลังปิด Slot: `GET /slots` ตอบ `200` และไม่พบ Slot ดังกล่าว
- จอง Slot ที่ปิดแล้ว: ตอบ `404 SLOT_NOT_FOUND`
- ปิด Slot ซ้ำ: ตอบ `404 Slot not found`
- ตรวจฐานข้อมูล: `deletedAt` มีค่าและ Booking เดิมยังอยู่ 1 รายการ

### Backend

- TypeScript (`tsc --noEmit`): ผ่าน
- Tests: 5 ผ่าน, 0 ล้มเหลว

### Frontend

- Next route type generation: ผ่าน
- TypeScript (`tsc --noEmit`): ผ่าน
- Next.js production build ด้วย webpack: ผ่านทุก route

Turbopack build ใน environment นี้ยังพบข้อผิดพลาดภายในตอนสร้าง PostCSS child process (`node process exited before we could connect`) ซึ่งเกิดเหมือนเดิมทั้งผ่าน Bun launcher และ Node.js โดยตรง จึงใช้ webpack build ที่ Next.js รองรับเป็นตัวตรวจ production build แทน ข้อผิดพลาดนี้ไม่เกิดจาก TypeScript หรือโค้ด Soft delete

## ไฟล์สำคัญที่เกี่ยวข้อง

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/20261101000100_init_current_schema/migration.sql`
- `backend/src/routes/booking.ts`
- `backend/src/services/booking.ts`
- `frontend/src/app/slots/page.tsx`
