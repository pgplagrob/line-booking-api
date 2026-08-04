# LINE Bot Backend

โปรเจกต์ฝึกสร้าง LINE Bot Backend ด้วย Express, TypeScript, Prisma และ SQLite ตั้งแต่การตั้งค่าเซิร์ฟเวอร์ ไปจนถึง Webhook, Flex Message และ Push Notification

## สถานะปัจจุบัน

**Day 1 — ทำเสร็จแล้วประมาณครึ่งหนึ่ง**

เซิร์ฟเวอร์ Express เปิดและทดสอบผ่าน `http://localhost:3000` แล้ว ขั้นตอนถัดไปคือสร้าง Task Model, รัน Migration และเปิดดูตาราง SQLite ด้วย Prisma Studio

## แผนทั้งหมด 6 วัน

### Day 1: ตั้งค่า Backend และฐานข้อมูล

ติดตั้งและตั้งค่าสำเร็จแล้ว:

- [X] ติดตั้ง Node.js
- [X] สร้างโปรเจกต์ `line-api`
- [X] สร้าง `package.json`
- [X] ติดตั้ง Express
- [X] ติดตั้ง TypeScript
- [X] ติดตั้ง `tsx`
- [X] ติดตั้ง Prisma
- [X] ติดตั้ง Prisma Client
- [X] ติดตั้ง SQLite Adapter (ตัวเชื่อม SQLite)
- [X] สร้าง `prisma.config.ts`
- [X] สร้าง `prisma/schema.prisma`
- [X] ตรวจสอบ Prisma ด้วย `npx prisma -v`
- [X] เพิ่ม `"type": "module"` ใน `package.json`
- [X] เพิ่มคำสั่ง `"dev": "tsx watch src/index.ts"`
- [X] สร้างไฟล์ `src/index.ts`
- [X] เขียน Express Server ตัวแรก
- [X] รันเซิร์ฟเวอร์ด้วย `npm run dev`
- [X] ทดสอบ `http://localhost:3000`

ยังเหลือ:

- [ ] สร้าง Task Model (โครงสร้างข้อมูลงาน) ใน Prisma
- [ ] รัน Migration (สร้างตารางฐานข้อมูล)

  ```bash
  npx prisma migrate dev --name init
  ```
- [ ] เปิดดูฐานข้อมูลด้วย Prisma Studio

  ```bash
  npx prisma studio
  ```

**เป้าหมาย Day 1:** เซิร์ฟเวอร์เปิดได้และเห็นตาราง SQLite

### Day 2: CRUD และ REST API

- [ ] ทำความเข้าใจ Request และ Response (คำขอและคำตอบ)
- [ ] ทำความเข้าใจ HTTP Methods (รูปแบบคำสั่ง HTTP)
- [ ] สร้าง Prisma Client สำหรับเชื่อมฐานข้อมูล
- [ ] เปิดใช้ `express.json()`
- [ ] สร้าง API เพิ่มงาน — `POST /tasks`
- [ ] สร้าง API ดูงานทั้งหมด — `GET /tasks`
- [ ] สร้าง API ดูงานตามรหัส — `GET /tasks/:id`
- [ ] สร้าง API แก้ไขงาน — `PUT /tasks/:id`
- [ ] สร้าง API ลบงาน — `DELETE /tasks/:id`
- [ ] จัดการกรณีไม่พบข้อมูลและข้อมูลผิดพลาด
- [ ] ทดสอบ API ทั้งหมดผ่าน Postman

**เป้าหมาย Day 2:** เพิ่ม อ่าน แก้ไข และลบข้อมูลใน SQLite ผ่าน API ได้

### Day 3: LINE OA และ Messaging API

- [ ] สร้าง LINE Official Account หรือ LINE OA (บัญชีทางการ)
- [ ] เข้า LINE Developers
- [ ] สร้าง Provider (ผู้ให้บริการ)
- [ ] สร้าง Messaging API Channel (ช่องทางเชื่อมต่อข้อความ)
- [ ] เก็บ Channel Secret อย่างปลอดภัย
- [ ] สร้าง Channel Access Token
- [ ] เพิ่มค่าทั้งสองลงในไฟล์ `.env`
- [ ] ติดตั้ง LINE Bot SDK (ชุดเครื่องมือพัฒนาบอต LINE)
- [ ] เชื่อม LINE SDK กับ Express
- [ ] ติดตั้ง Cloudflare Tunnel (ช่องทางเชื่อมเซิร์ฟเวอร์ในเครื่องสู่อินเทอร์เน็ต)
- [ ] สร้าง HTTPS URL สำหรับเซิร์ฟเวอร์
- [ ] ทดสอบว่า URL ภายนอกเข้าถึงเซิร์ฟเวอร์ได้

**เป้าหมาย Day 3:** LINE และอินเทอร์เน็ตเข้าถึงเซิร์ฟเวอร์ในเครื่องได้

### Day 4: Webhook

- [ ] สร้างเส้นทาง Webhook — `POST /webhook`
- [ ] นำ URL ไปใส่ใน LINE Developers
- [ ] กด Verify (ตรวจสอบการเชื่อมต่อ)
- [ ] เปิดใช้งาน Webhook
- [ ] รับ Event (เหตุการณ์) เมื่อผู้ใช้ส่งข้อความ
- [ ] อ่านข้อความที่ผู้ใช้ส่งมา
- [ ] อ่าน User ID (รหัสผู้ใช้)
- [ ] ตรวจสอบ Signature (ลายเซ็นยืนยันว่าคำขอมาจาก LINE)
- [ ] ให้บอตตอบข้อความกลับ
- [ ] บันทึกข้อมูลผู้ใช้หรือข้อความลง SQLite

**เป้าหมาย Day 4:** ผู้ใช้ส่งข้อความแล้วเซิร์ฟเวอร์รับและตอบกลับได้

### Day 5: Flex Message

- [ ] ทำความเข้าใจโครงสร้าง Flex Message (ข้อความรูปแบบการ์ด)
- [ ] สร้าง Bubble (การ์ดหนึ่งใบ)
- [ ] เพิ่มหัวข้อ รายละเอียด และปุ่ม
- [ ] สร้างการ์ดแสดงรายการงาน
- [ ] สร้างปุ่มเพิ่มงานหรือดูงาน
- [ ] เชื่อมข้อมูลจาก SQLite เข้ากับการ์ด
- [ ] ส่ง Flex Message ตอบกลับผู้ใช้
- [ ] ทดสอบรูปแบบบนโทรศัพท์

**เป้าหมาย Day 5:** บอตส่งการ์ดข้อมูลจากฐานข้อมูลให้ผู้ใช้ได้

### Day 6: Push Notification

- [ ] ทำความเข้าใจ Reply Message กับ Push Message
- [ ] เก็บ LINE User ID ลงฐานข้อมูล
- [ ] สร้าง API สำหรับส่ง Push Message (ข้อความที่เซิร์ฟเวอร์เริ่มส่งเอง)
- [ ] เลือกผู้รับจากฐานข้อมูล
- [ ] ส่งข้อความธรรมดา
- [ ] ส่ง Flex Message
- [ ] จัดการกรณี Token หรือ User ID ไม่ถูกต้อง
- [ ] ทดสอบการแจ้งเตือนจริงใน LINE
- [ ] เก็บ Secret และ Token ไว้ใน `.env`
- [ ] ตรวจสอบว่า `.env` ไม่ถูกอัปโหลดขึ้น GitHub

**เป้าหมาย Day 6:** เซิร์ฟเวอร์ส่งข้อความแจ้งเตือนไปยัง LINE ได้เอง

## ผลลัพธ์สุดท้าย

เมื่อทำครบ ระบบจะทำงานตามลำดับนี้:

```text
ผู้ใช้ส่งข้อความใน LINE
→ LINE ส่ง Webhook มาที่ Express
→ Express อ่านหรือบันทึกข้อมูลผ่าน Prisma
→ SQLite เก็บข้อมูล
→ บอตตอบกลับด้วย Flex Message
→ เซิร์ฟเวอร์ส่ง Push Notification ได้
```
