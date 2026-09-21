# Step B7: สร้าง Flex Message

## สถานะปัจจุบัน

Step B6 เชื่อม LINE เข้ากับระบบจองคิวแล้ว โดย `POST /webhook` ใน `backend/src/index.ts` สามารถ:

- รับข้อความจาก LINE
- อ่าน LINE User ID
- แสดง Slot ที่ยังว่างเมื่อผู้ใช้ส่ง `คิว` หรือ `ดูคิว`
- สร้าง Booking เมื่อผู้ใช้ส่ง `จอง <slotId>`
- ตอบกลับผ่าน LINE Reply API เป็น text message

Step B7 จะเปลี่ยนประสบการณ์ตอบกลับหลักให้เป็น LINE Flex Message เพื่อให้ผู้ใช้เห็นช่วงเวลาที่ว่าง กดเลือก Slot และเห็นผลยืนยันการจองได้ชัดเจนขึ้น

> เป้าหมายของ Step นี้คือเพิ่ม Flex Message โดยยังรักษา command เดิมไว้ให้ใช้งานได้ เช่น `คิว`, `ดูคิว`, และ `จอง <slotId>`

## เป้าหมายของ Step B7

- [ ] สร้าง Flex Message สำหรับแสดงช่วงเวลาที่ว่าง
- [ ] เพิ่มปุ่มเลือกและจองคิวในแต่ละ Slot
- [ ] สร้าง Flex Message สำหรับยืนยันการจองสำเร็จ
- [ ] สร้าง Flex Message สำหรับแสดงรายละเอียดหรือสถานะการจอง
- [ ] คง text fallback สำหรับกรณี error หรือกรณีที่ Flex Message ไม่เหมาะสม
- [ ] ทดสอบการแสดงผลบนโทรศัพท์จริงผ่าน LINE

## สิ่งที่มีอยู่แล้ว

| ส่วน        | ตำแหน่ง                                               | หน้าที่                                                         |
| --------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Webhook         | `backend/src/index.ts`                                     | รับ Event จาก LINE และตรวจสอบ signature                |
| Reply API       | `replyLineMessage()` ใน `backend/src/index.ts`         | ตอบกลับด้วย text message                                    |
| Queue command   | `getAvailableSlotsMessage()` ใน `backend/src/index.ts` | ดึง Slot ว่างแล้วสร้างข้อความรายการคิว |
| Booking command | `createLineBookingMessage()` ใน `backend/src/index.ts` | สร้าง Booking แล้วคืนข้อความยืนยัน            |
| Booking rules   | `backend/src/services/booking.ts`                          | ตรวจ duplicate booking และ capacity                             |
| User mapping    | `backend/src/services/user.ts`                             | หา/สร้าง User จาก LINE User ID                               |

## Flow ที่ต้องการ

```text
ผู้ใช้ส่ง "คิว" หรือ "ดูคิว"
        ↓
ระบบดึง Slot ที่ remaining > 0
        ↓
ตอบกลับ Flex Message รายการ Slot ว่าง
        ↓
ผู้ใช้กดปุ่ม "จองคิว" ใน Slot ที่ต้องการ
        ↓
LINE ส่งข้อความหรือ postback ที่ระบุ slotId กลับเข้า webhook
        ↓
ระบบเรียก createBooking({ userId, slotId })
        ↓
ตอบกลับ Flex Message ยืนยันการจอง หรือ text error ที่เข้าใจง่าย
```

## แนวทาง Implementation

### 1. แยกชนิดข้อความ LINE Reply

ตอนนี้ `replyLineMessage(replyToken, text)` รับเฉพาะ string และส่ง message type `text`

ให้เปลี่ยนเป็นรับ LINE message object เช่น:

```ts
type LineReplyMessage =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "flex";
      altText: string;
      contents: LineFlexContainer;
    };
```

จากนั้นให้ `replyLineMessage()` ส่ง `messages: [message]`

ควรมี helper สำหรับ text เพื่อลดการแก้หลายจุด:

```ts
function createTextMessage(text: string): LineReplyMessage {
  return {
    type: "text",
    text,
  };
}
```

### 2. สร้างชนิดข้อมูล Slot สำหรับ Flex Message

ให้แยกการดึง Slot ว่างออกจากการ format text เดิม เพื่อให้ใช้ซ้ำกับ Flex Message ได้ เช่น:

```ts
type AvailableSlot = {
  id: number;
  startAt: Date;
  endAt: Date;
  capacity: number;
  remaining: number;
};
```

สร้าง helper เช่น `getAvailableSlots()` ที่คืน `AvailableSlot[]`

กติกา:

- เรียงตาม `startAt` จากน้อยไปมาก
- นับเฉพาะ Booking ที่มี `status: "CONFIRMED"`
- แสดงเฉพาะ Slot ที่ `remaining > 0`

### 3. สร้าง Flex Message รายการ Slot ว่าง

เพิ่ม helper เช่น `createAvailableSlotsFlexMessage(slots)`

ข้อกำหนด:

- `type: "flex"`
- `altText`: ใช้ข้อความสั้น เช่น `คิวที่ว่าง`
- แสดงหัวข้อ `คิวที่ว่าง`
- แต่ละ Slot ต้องเห็นอย่างน้อย:
  - Slot ID
  - เวลาเริ่ม-จบ
  - จำนวนที่เหลือ
  - ปุ่มจอง
- ถ้า Slot มีหลายรายการ ให้ใช้ `carousel` หรือ `bubble` ที่มีหลาย box ตามความเหมาะสม

ตัวอย่าง action ของปุ่มจองแบบง่าย:

```json
{
  "type": "message",
  "label": "จองคิว",
  "text": "จอง 3"
}
```

เริ่มจาก message action ก่อน เพราะใช้ flow เดิม `จอง <slotId>` ได้ทันที และไม่ต้องเพิ่ม postback parser ใน Step นี้

### 4. สร้าง Flex Message ยืนยันการจอง

เพิ่ม helper เช่น `createBookingConfirmationFlexMessage(booking)`

ข้อกำหนด:

- `altText`: `จองคิวสำเร็จ`
- แสดงข้อความยืนยันชัดเจน
- แสดงเวลา Slot
- แสดง `bookingCode`
- ถ้ามี `booking.id` ให้แสดงเป็นรหัสอ้างอิงภายในได้ แต่ไม่ควรให้ผู้ใช้ต้องจำถ้าไม่จำเป็น

ข้อมูล Booking ที่ใช้ได้จาก `createBooking()` มี `slot` รวมอยู่แล้ว

### 5. ปรับ command handler ให้คืน LINE Reply Message

เปลี่ยน `getLineReplyText()` เป็นแนวคิดประมาณ:

```ts
async function getLineReplyMessage(
  text: string,
  lineUserId: string | undefined,
): Promise<LineReplyMessage> {
  // ...
}
```

กติกา:

- ถ้าเป็น `คิว` หรือ `ดูคิว` และมี Slot ว่าง ให้ตอบ Flex Message
- ถ้าไม่มี Slot ว่าง ให้ตอบ text message เดิม
- ถ้าเป็น `จอง <slotId>` และจองสำเร็จ ให้ตอบ Flex Message ยืนยัน
- ถ้าเกิด `BookingError` ให้ตอบ text message ที่เข้าใจง่ายเหมือน Step B6
- ถ้าข้อความไม่ตรง command ให้ตอบ text message แนะนำการใช้งาน

### 6. รักษา error handling เดิม

ห้ามทำให้ Booking สำเร็จแล้วถูกสร้างซ้ำเพียงเพราะ LINE Reply API ล้มเหลว

แนวทาง:

- `createBooking()` ยังเป็นแหล่งเดียวที่สร้าง Booking
- `BookingError` ยังถูกแปลงเป็นข้อความสำหรับผู้ใช้
- ถ้า LINE Reply API error ให้ log error แต่ไม่ retry การสร้าง Booking ซ้ำใน webhook เดิม
- ห้าม log `LINE_CHANNEL_ACCESS_TOKEN`

## โครงสร้าง Flex Message ที่แนะนำ

### รายการ Slot ว่าง

```json
{
  "type": "flex",
  "altText": "คิวที่ว่าง",
  "contents": {
    "type": "bubble",
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "text",
          "text": "คิวที่ว่าง",
          "weight": "bold",
          "size": "lg"
        }
      ]
    }
  }
}
```

ให้ implementation เติมรายการ Slot และปุ่ม `จองคิว` ตาม LINE Flex Message schema จริง

### ยืนยันการจอง

```json
{
  "type": "flex",
  "altText": "จองคิวสำเร็จ",
  "contents": {
    "type": "bubble",
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "text",
          "text": "จองคิวสำเร็จ",
          "weight": "bold",
          "size": "lg"
        }
      ]
    }
  }
}
```

## ข้อควรระวัง

- LINE Flex Message มี schema ค่อนข้างเข้มงวด ต้องไม่ส่ง field เกินหรือผิดชนิด
- `altText` จำเป็นสำหรับ Flex Message
- จำนวน bubble ใน carousel ไม่ควรมากเกินไป ถ้ามี Slot เยอะให้จำกัดรายการแรก ๆ ก่อน เช่น 10 รายการ
- ข้อความในปุ่ม LINE มีความยาวจำกัด ให้ใช้ label สั้น เช่น `จองคิว`
- อย่าเปลี่ยนกติกา `createBooking()` ใน Step นี้ถ้าไม่จำเป็น
- อย่าเปลี่ยน endpoint REST API เว้นแต่จำเป็นต่อ Flex Message

## วิธีทดสอบ

### ทดสอบ Backend compile/runtime

จากโฟลเดอร์ `backend`:

```powershell
npm.cmd run dev
```

ถ้ามี script สำหรับ typecheck หรือ build ให้รันด้วย:

```powershell
npm.cmd run build
```

### ทดสอบผ่าน LINE จริง

- [ ] ส่ง `คิว` แล้วได้รับ Flex Message รายการ Slot ว่าง
- [ ] กดปุ่ม `จองคิว` แล้ว LINE ส่งข้อความ `จอง <slotId>` กลับเข้า webhook
- [ ] จองสำเร็จแล้วได้รับ Flex Message ยืนยัน
- [ ] จอง Slot เดิมซ้ำแล้วได้รับข้อความ error ที่เข้าใจง่าย
- [ ] จอง Slot เต็มแล้วได้รับข้อความ error ที่เข้าใจง่าย
- [ ] ไม่มี Slot ว่างแล้วได้รับ text message แจ้งว่าไม่มีคิวว่าง
- [ ] ข้อความอื่น ๆ ยังได้รับคำแนะนำการใช้งาน

## Definition of Done

ถือว่า Step B7 เสร็จเมื่อ:

- [ ] ผู้ใช้ดู Slot ว่างผ่าน Flex Message ได้
- [ ] ผู้ใช้กดปุ่มใน Flex Message เพื่อจอง Slot ได้
- [ ] ผู้ใช้ได้รับ Flex Message ยืนยันเมื่อจองสำเร็จ
- [ ] Error สำคัญยังถูกตอบเป็นข้อความที่เข้าใจง่าย
- [X] Command เดิม `คิว`, `ดูคิว`, และ `จอง <slotId>` ยังใช้งานได้
- [ ] Webhook ยังตรวจ LINE signature จาก raw body ได้เหมือนเดิม
- [ ] Secret และ Access Token ไม่ถูก log และไม่ถูก commit
- [ ] ทดสอบบน LINE mobile จริงแล้ว Flex Message แสดงผลถูกต้อง

## ลำดับที่แนะนำสำหรับ /implement

```text
1. เพิ่ม type/helper สำหรับ LINE reply message
2. เปลี่ยน replyLineMessage() ให้รับ message object
3. แยก getAvailableSlots() ออกจาก text formatter
4. สร้าง createAvailableSlotsFlexMessage()
5. สร้าง createBookingConfirmationFlexMessage()
6. เปลี่ยน getLineReplyText() เป็น getLineReplyMessage()
7. รักษา text fallback สำหรับ error และ command ที่ไม่รู้จัก
8. รัน build/typecheck
9. ทดสอบผ่าน LINE จริงบนมือถือ
```
