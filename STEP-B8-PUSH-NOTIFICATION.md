# Step B8: เพิ่มระบบแจ้งเตือนผ่าน LINE Push API

## Step นี้คืออะไร

Step B8 คือการทำให้ Backend สามารถส่งข้อความหา LINE User ได้เอง โดยไม่ต้องรอให้ User ส่งข้อความเข้ามาก่อน

ความแตกต่างจากระบบที่มีอยู่:

```text
Reply API  = ตอบกลับข้อความที่ User เพิ่งส่งเข้ามา โดยใช้ replyToken
Push API   = ส่งข้อความหา User โดยตรง โดยใช้ LINE userId
```

ในโปรเจกต์นี้มี `replyLineMessage()` สำหรับ Reply API อยู่แล้ว ส่วน Step B8 จะเพิ่มฟังก์ชันใหม่สำหรับ Push API

---

## เป้าหมายของ Step B8

- [ ] สร้าง Service สำหรับส่ง Push Message
- [ ] ส่งข้อความยืนยันหลังจองสำเร็จ
- [ ] ส่งข้อความเมื่อยกเลิกการจอง
- [ ] สร้างระบบแจ้งเตือนก่อนถึงเวลานัดหมาย
- [ ] จัดการกรณี LINE User ID หรือ Access Token ใช้งานไม่ได้
- [ ] ทดสอบการส่งข้อความผ่าน LINE จริง

---

## สิ่งที่ต้องมีอยู่ก่อน

ตรวจสอบว่าไฟล์ `backend/.env` มีค่าต่อไปนี้:

```env
LINE_CHANNEL_SECRET=your-channel-secret
LINE_CHANNEL_ACCESS_TOKEN=your-channel-access-token
```

และ User ต้องเคยเพิ่ม LINE Official Account เป็นเพื่อนแล้ว จึงจะสามารถรับ Push Message ได้

---

## แนวคิดก่อนเขียนโค้ด

ให้เริ่มจากฟังก์ชัน `replyLineMessage()` ใน `backend/src/index.ts` แล้วตอบคำถามต่อไปนี้:

1. Reply API ใช้ข้อมูลอะไรเพื่อรู้ว่าจะตอบกลับใคร?
2. Push API ควรใช้ข้อมูลอะไรเพื่อรู้ว่าจะส่งหาใคร?
3. URL ของ Push API แตกต่างจาก Reply API อย่างไร?
4. ใน Request Body ควรใช้ `replyToken` หรือ `lineUserId`?
5. ถ้า LINE ตอบกลับด้วย HTTP status ที่ไม่ใช่ 2xx ระบบควรทำอย่างไร?

คำตอบสำคัญคือ Push API ต้องใช้ `lineUserId` และส่งไปยัง Endpoint นี้:

```text
POST https://api.line.me/v2/bot/message/push
```

---

## ขั้นที่ 1: สร้างฟังก์ชัน Push Message

แนะนำให้แยกฟังก์ชันออกเป็นไฟล์ใหม่:

```text
backend/src/services/line.ts
```

ฟังก์ชันควรรับข้อมูลอย่างน้อย 2 อย่าง:

```ts
pushLineMessage(lineUserId, text)
```

ให้คิดตามโครงสร้าง Request นี้:

```ts
fetch("https://api.line.me/v2/bot/message/push", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
  },
  body: JSON.stringify({
    to: lineUserId,
    messages: [
      {
        type: "text",
        text,
      },
    ],
  }),
});
```

ข้อควรคิด:

- `to` ต้องเป็น LINE User ID ไม่ใช่ Database User ID
- `Authorization` ต้องใช้ Channel Access Token
- `messages` ต้องเป็น Array
- ถ้า `response.ok` เป็น `false` ต้องอ่าน Error Body แล้วโยน Error ออกไป
- ห้าม Log ค่า Channel Access Token

---

## ขั้นที่ 2: ทดสอบ Push Message แยกก่อน

ก่อนเชื่อมกับระบบจอง ให้ทดสอบส่งข้อความธรรมดาให้สำเร็จก่อน

ใช้ LINE User ID ที่ได้จาก Webhook เช่นค่าที่แสดงจากโค้ดนี้:

```ts
console.log("LINE webhook event:", {
  type,
  userId,
  text,
});
```

ทดสอบข้อความสั้น ๆ เช่น:

```text
ทดสอบ Push Message จากระบบจองคิว
```

ถ้าทดสอบไม่ผ่าน ให้ตรวจสอบตามลำดับ:

1. Server อ่านค่า `.env` ได้หรือไม่
2. Channel Access Token ยังไม่หมดอายุหรือไม่
3. LINE User ID ถูกต้องหรือไม่
4. User เคยเพิ่ม Official Account เป็นเพื่อนหรือไม่
5. Error Response จาก LINE ระบุว่าอะไร

---

## ขั้นที่ 3: ส่งข้อความหลังจองสำเร็จ

จุดที่ควรส่งข้อความคือหลังจาก `createBooking()` สำเร็จใน Endpoint:

```text
POST /bookings
```

ลำดับการทำงานควรเป็นแบบนี้:

```text
รับ userId และ slotId
        ↓
สร้าง Booking สำเร็จ
        ↓
อ่าน User.lineUserId
        ↓
สร้างข้อความยืนยัน
        ↓
เรียก Push API
        ↓
ส่ง HTTP Response กลับให้ผู้เรียก API
```

ตัวอย่างข้อความ:

```text
จองคิวสำเร็จ
เวลา: 10:00 - 11:00
รหัสการจอง: <bookingCode>
```

ข้อควรตัดสินใจ:

- ถ้าบันทึก Booking สำเร็จ แต่ส่ง LINE ไม่สำเร็จ ควรยกเลิก Booking หรือเก็บ Booking ไว้แล้ว Log Error?
- ระบบควรตอบ User ว่าจองไม่สำเร็จ หรือจองสำเร็จแต่แจ้งเตือนไม่ได้?

สำหรับระบบเริ่มต้น แนะนำให้เก็บ Booking ไว้ เพราะการจองใน Database สำเร็จแล้ว และ Log ปัญหาการส่ง LINE แยกต่างหาก

---

## ขั้นที่ 4: ส่งข้อความเมื่อยกเลิกการจอง

จุดที่ควรส่งข้อความคือหลังจาก `cancelBooking()` สำเร็จใน Endpoint:

```text
DELETE /bookings/:id
```

ตัวอย่างข้อความ:

```text
ยกเลิกการจองเรียบร้อยแล้ว
รหัสการจอง: <bookingCode>
```

ต้องแน่ใจว่า Query การยกเลิก Booking ดึงข้อมูล User และ `lineUserId` มาด้วย ไม่เช่นนั้นระบบจะไม่รู้ว่าจะส่งข้อความหาใคร

---

## ขั้นที่ 5: เพิ่มระบบแจ้งเตือนก่อนถึงเวลานัดหมาย

ระบบต้องค้นหา Booking ที่:

- มีสถานะ `CONFIRMED`
- มีเวลานัดหมายใกล้ถึง เช่น เหลือ 1 ชั่วโมง
- ยังไม่เคยส่ง Reminder

ควรเพิ่ม Field สำหรับป้องกันการส่งซ้ำ เช่น:

```prisma
reminderSentAt DateTime?
```

ลำดับการทำงาน:

```text
Scheduler ทำงานทุก 1-5 นาที
        ↓
ค้นหา Booking ที่ใกล้ถึงเวลา
        ↓
ตรวจสอบ reminderSentAt ยังเป็น null
        ↓
ส่ง Push Message
        ↓
อัปเดต reminderSentAt
```

ตัวอย่างข้อความ:

```text
แจ้งเตือนการนัดหมาย
คุณมีคิวเวลา 10:00 - 11:00
```

ข้อควรระวัง: ต้องอัปเดต `reminderSentAt` หลังส่งสำเร็จเท่านั้น เพื่อให้ระบบสามารถลองส่งใหม่ได้หาก LINE ขัดข้อง

---

## การจัดการ Error

กรณีที่ควรรองรับ:

| กรณี | แนวทาง |
|---|---|
| Channel Access Token ผิด | Log Error และตรวจ `.env` |
| LINE User ID ผิด | Log User ID ที่เกี่ยวข้อง แต่ห้าม Log Token |
| User บล็อก Official Account | เก็บ Booking ไว้ และบันทึก Push Error |
| LINE API ล่มชั่วคราว | Retry ได้ตามความเหมาะสม |
| ส่ง Reminder ซ้ำ | ตรวจ `reminderSentAt` ก่อนส่ง |
| ส่งไม่สำเร็จหลังจองสำเร็จ | ไม่ควรสร้าง Booking ซ้ำ |

---

## Definition of Done

ถือว่า Step B8 เสร็จเมื่อ:

- [ ] มี Service สำหรับเรียก LINE Push API
- [ ] ทดสอบส่งข้อความธรรมดาเข้า LINE สำเร็จ
- [ ] จองคิวแล้วได้รับข้อความยืนยัน
- [ ] ยกเลิกคิวแล้วได้รับข้อความแจ้งเตือน
- [ ] ระบบแจ้งเตือนก่อนถึงเวลานัดหมายได้
- [ ] Reminder เดิมไม่ถูกส่งซ้ำ
- [ ] ระบบไม่ล่มเมื่อ LINE API ส่ง Error
- [ ] ไม่มี Secret หรือ Access Token อยู่ใน Git

---

## ลำดับการลงมือทำที่แนะนำ

```text
1. แยก line.ts ออกจาก index.ts
2. เขียน pushLineMessage()
3. ทดสอบส่งข้อความธรรมดา
4. เชื่อมหลัง createBooking()
5. เชื่อมหลัง cancelBooking()
6. เพิ่ม reminderSentAt ใน Prisma
7. ทำ Scheduler
8. ทดสอบกรณีสำเร็จและกรณี Error
```

อย่าเริ่มจาก Scheduler ทันที ให้ทำให้การส่ง Push Message แบบข้อความธรรมดาทำงานก่อน เพราะทุกส่วนถัดไปจะใช้ Service เดียวกันนี้
