# Step B6: เชื่อม LINE เข้ากับระบบจองคิว

## สถานะปัจจุบัน

Step B5 ทำให้ Backend รับ `POST /webhook` ตรวจสอบ Signature อ่านข้อความและ LINE User ID ได้แล้ว รวมถึงตอบกลับด้วย Reply API

Step B6 จะนำข้อมูลจาก LINE มาเชื่อมกับระบบจองคิวที่มีอยู่ใน `backend/src/index.ts` และ `backend/src/services/booking.ts`

> ตอนเริ่ม Step นี้ Webhook ยังตอบข้อความ `Hello` อยู่ จึงยังไม่ถือว่า Step B6 เสร็จจนกว่าจะทดสอบ flow จองคิวผ่าน LINE ครบ

## เป้าหมายของ Step B6

- [ ] สร้างหรือค้นหา User จาก LINE User ID
- [ ] เมื่อผู้ใช้ขอดูคิว ให้แสดงเฉพาะ Slot ที่ยังมีที่ว่าง(ผ่าน)
- [ ] ให้ผู้ใช้เลือก Slot ที่ต้องการจอง
- [ ] สร้าง Booking ด้วย User และ Slot ที่เลือก
- [ ] บันทึก LINE User ID ไว้กับ User ใน SQLite
- [ ] ส่งผลการจองกลับไปยังผู้ใช้ผ่าน LINE
- [ ] ป้องกันการจอง Slot เดิมซ้ำและการจองเกิน `capacity`
- [ ] ทดสอบกรณีสำเร็จและกรณี Error ผ่าน LINE จริง

## สิ่งที่มีอยู่แล้ว

| ส่วน        | ตำแหน่ง                                       | หน้าที่                                             |
| --------------- | ---------------------------------------------------- | ---------------------------------------------------------- |
| Webhook         | `backend/src/index.ts`                             | รับ Event จาก LINE และตรวจสอบ HMAC-SHA256  |
| Reply API       | `replyLineMessage()` ใน `backend/src/index.ts` | ตอบกลับด้วย`replyToken`                       |
| Slot API        | `GET /slots`                                       | คืน Slot พร้อม`bookedCount` และ `remaining` |
| Booking Service | `backend/src/services/booking.ts`                  | ตรวจ User, Slot, การจองซ้ำ และ capacity    |
| Database        | `backend/prisma/schema.prisma`                     | มี`User.lineUserId`, `Slot` และ `Booking`       |

## Flow ที่ต้องทำให้สำเร็จ

```text
ผู้ใช้ส่งข้อความขอดูคิว
        ↓
LINE ส่ง Event เข้า POST /webhook
        ↓
อ่าน LINE User ID และค้นหา/สร้าง User
        ↓
อ่าน Slot ที่ยังเหลือจากฐานข้อมูล
        ↓
ส่งรายการ Slot กลับไปให้ผู้ใช้เลือก
        ↓
ผู้ใช้ส่งรหัส Slot ที่ต้องการจอง
        ↓
เรียก createBooking({ userId, slotId })
        ↓
ส่งผลสำเร็จหรือข้อความ Error กลับทาง LINE
```

## กติกาข้อมูลสำคัญ

- `LINE User ID` เป็น String เช่น `Uxxxxxxxx` และต้องเก็บใน `User.lineUserId`
- `User.id` เป็นตัวเลขของฐานข้อมูล ห้ามนำ LINE User ID ไปส่งแทน `userId` ใน `createBooking()`
- `Slot.id` เป็นตัวเลข และใช้เลือก Slot ในขั้นตอนจอง
- แสดง Slot ที่ `remaining > 0` เท่านั้น
- การสร้าง Booking ต้องเรียก `createBooking()` เพื่อใช้กติกาป้องกันการจองซ้ำและเกิน capacity ที่มีอยู่แล้ว
- ต้องใช้ `replyToken` ตอบกลับ Event เดิม และไม่ Log `LINE_CHANNEL_ACCESS_TOKEN`

## ขั้นตอนการลงมือทำ

### 1. สร้างฟังก์ชันจัดการ User จาก LINE User ID

เพิ่มฟังก์ชันใน Service แยก เช่น `backend/src/services/user.ts` หรือบริเวณ Service ที่เหมาะสม โดยมีพฤติกรรมดังนี้:

```text
รับ lineUserId
  ↓
ค้นหา User ด้วย lineUserId
  ↓ ไม่พบ
สร้าง User ใหม่
  ↓
คืน User.id ให้ใช้กับ Booking
```

การสร้าง User ควรใช้ `upsert` หรือวิธีที่รองรับการรับ Webhook ซ้ำได้อย่างปลอดภัย

### 2. แยกการประมวลผลข้อความออกจาก Route

ใน `POST /webhook` ให้คงลำดับเดิมไว้:

1. ตรวจ `x-line-signature` จาก raw body
2. Parse JSON และตรวจ `events`
3. อ่าน `type`, `source.userId`, `message.text` และ `replyToken`
4. ส่งข้อมูลให้ฟังก์ชันจัดการคำสั่ง
5. ตอบกลับด้วย Reply API

อย่าเรียก `express.json()` ก่อน Webhook เพราะ Signature ต้องคำนวณจาก raw request body

### 3. กำหนดคำสั่งขั้นต่ำสำหรับการทดสอบ

เริ่มจากข้อความธรรมดาเพื่อลดความซับซ้อนก่อน เช่น:

| ข้อความจากผู้ใช้   | การทำงาน                                   |
| ---------------------------------- | -------------------------------------------------- |
| `คิว` หรือ `ดูคิว` | ดึง Slot ที่ยังมีที่ว่าง         |
| `จอง <slotId>`                | สร้าง Booking ให้ LINE User คนนั้น   |
| ข้อความอื่น             | ส่งคำแนะนำการใช้งานกลับไป |

ตัวอย่างข้อความรายการคิว:

```text
คิวที่ว่าง
1) Slot ID 3: 10:00 - 11:00 เหลือ 2 ที่
2) Slot ID 4: 11:00 - 12:00 เหลือ 1 ที่

พิมพ์ "จอง <slotId>" เพื่อจอง
```

### 4. เชื่อมการจองกับ `createBooking()`

เมื่อได้รับ `จอง <slotId>`:

1. ตรวจว่า `slotId` เป็นจำนวนเต็มบวก
2. เรียก `getOrCreateUser(lineUserId)` เพื่อได้ Database `userId`
3. เรียก `createBooking({ userId, slotId })`
4. ส่ง `bookingCode` และเวลา Slot กลับไปทาง LINE

ตัวอย่างผลสำเร็จ:

```text
จองคิวสำเร็จ
เวลา: 10:00 - 11:00
รหัสการจอง: <bookingCode>
```

## การจัดการ Error ที่ต้องแสดงให้ผู้ใช้เข้าใจ

| กรณี                         | ข้อความที่ควรตอบ                                                    |
| -------------------------------- | ----------------------------------------------------------------------------------- |
| ไม่มี Slot                  | ตอนนี้ยังไม่มีคิวว่าง                                          |
| Slot ไม่พบ                  | ไม่พบ Slot นี้ กรุณาตรวจสอบรหัสอีกครั้ง             |
| ผู้ใช้จอง Slot เดิม | คุณจอง Slot นี้ไว้แล้ว                                              |
| Slot เต็ม                    | Slot นี้เต็มแล้ว กรุณาเลือกเวลาอื่น                    |
| รูปแบบคำสั่งผิด   | ใช้`คิว` เพื่อดูคิว หรือ `จอง <slotId>` เพื่อจอง |
| Database/LINE API ผิดพลาด | ระบบขัดข้องชั่วคราว กรุณาลองใหม่ภายหลัง       |

Booking ที่สร้างสำเร็จแล้วไม่ควรถูกลบเพียงเพราะการส่งข้อความตอบกลับ LINE ล้มเหลว ให้ Log Error แยกและไม่สร้าง Booking ซ้ำ

## วิธีทดสอบ

### เตรียมข้อมูลผ่าน API

เริ่ม Backend จากโฟลเดอร์ `backend`:

```powershell
npm.cmd run dev
```

สร้าง Slot สำหรับทดสอบผ่าน Postman:

```http
POST http://localhost:3000/slots
Content-Type: application/json
```

```json
{
  "date": "2026-09-15",
  "startTime": "10:00",
  "endTime": "11:00",
  "capacity": 2
}
```

ตรวจสอบด้วย:

```http
GET http://localhost:3000/slots
```

### ทดสอบผ่าน LINE

- [ ] ส่ง `คิว` และได้รับเฉพาะ Slot ที่ยังว่าง
- [ ] ส่ง `จอง <slotId>` และได้รับข้อความยืนยัน
- [ ] ตรวจว่า User ถูกบันทึกด้วย `lineUserId` จริง
- [ ] ส่งคำสั่งจอง Slot เดิมซ้ำ และได้รับข้อความแจ้งเตือนที่เหมาะสม
- [ ] จองจนเต็ม `capacity` แล้วทดสอบผู้ใช้คนถัดไป
- [ ] ส่งข้อความรูปแบบผิดและได้รับคำแนะนำ
- [ ] ตรวจ Booking ที่สร้างผ่าน `GET /bookings/:id` หรือฐานข้อมูล

## Definition of Done

ถือว่า Step B6 เสร็จเมื่อ:

- [ ] ผู้ใช้ LINE ดู Slot ที่ว่างได้
- [ ] ผู้ใช้ LINE จอง Slot ได้จนเกิด Booking ใน SQLite
- [ ] Booking เชื่อมกับ User ที่มี `lineUserId` ถูกต้อง
- [ ] ผู้ใช้ได้รับผลลัพธ์การจองกลับทาง LINE
- [ ] การจองซ้ำและการจองเกิน capacity ถูกป้องกัน
- [ ] Error สำคัญถูกแปลงเป็นข้อความที่ผู้ใช้เข้าใจได้
- [ ] ทดสอบผ่าน LINE จริงครบทั้ง success และ failure cases
- [ ] Secret และ Access Token ไม่อยู่ใน Git

## ลำดับที่แนะนำ

```text
1. ทำ getOrCreateUser(lineUserId)
2. ทำคำสั่ง "คิว"
3. ทำคำสั่ง "จอง <slotId>"
4. เชื่อม createBooking()
5. เพิ่มข้อความ Error และคำแนะนำ
6. ทดสอบจองซ้ำและเต็ม capacity
7. ทดสอบ Flow จริงผ่าน LINE
```
