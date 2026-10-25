# คู่มือเรียน Backend จากโปรเจกต์ LINE Booking

เอกสารนี้ใช้โปรเจกต์ปัจจุบันเป็นสนามฝึก ไม่ได้ต้องการให้เริ่มใหม่หรือจำทุกอย่างก่อนลงมือ
เป้าหมายคือเข้าใจเส้นทางข้อมูลหนึ่งเส้นให้จบ: **ผู้ใช้พิมพ์ใน LINE -> ระบบตรวจสอบ -> บันทึกการจองใน SQLite -> ส่งข้อความตอบกลับ**

## วิธีใช้คู่มือนี้

เรียนทีละหัวข้อ แล้วเปิดไฟล์ที่ระบุไว้ตามไปพร้อมกัน เมื่อพบคำที่ไม่เข้าใจ ให้หาคำตอบเฉพาะคำนั้นและกลับมาดู flow เดิมต่อ อย่าพยายามอ่านโค้ดทุกไฟล์ในครั้งเดียว

สัดส่วนที่แนะนำคือ:

- 30% อ่านแนวคิดพื้นฐาน
- 70% เปิดโค้ดจริง ทดลองด้วย Postman และสังเกตผล

## ภาพรวมระบบ

```text
LINE ผู้ใช้
  -> POST /webhook ใน backend/src/index.ts
  -> ตรวจ LINE signature และอ่านข้อความ
  -> getLineReplyMessage()
  -> service เช่น getOrCreateUser() / createBooking()
  -> Prisma Client
  -> SQLite (dev.db)
  -> LINE Reply API
  -> ข้อความหรือ Flex Message กลับไปหาผู้ใช้
```

คำสำคัญในโดเมนนี้:

- **User**: คนที่คุยกับ LINE OA โดยเก็บ `lineUserId` ซึ่งเป็น ID จาก LINE
- **Slot**: ช่วงเวลาที่เปิดให้จอง มีเวลาเริ่ม/จบ และจำนวนที่รับได้ (`capacity`)
- **Booking**: รายการจองหนึ่งรายการ ที่เชื่อม User กับ Slot
- **Booking Command**: ข้อความ `จอง <slotId>` เช่น `จอง 3`

`User.id` เป็นเลขภายใน database แต่ `User.lineUserId` เป็นรหัสจาก LINE อย่าสับสนสองค่านี้

## แผนที่ไฟล์และ folder

```text
line-booking-api/
├─ README.md                         ภาพรวม/วิธีใช้โครงการ
├─ CONTEXT.md                        คำศัพท์ของโดเมนงาน
└─ backend/
   ├─ .env.example                   แบบฟอร์มตัวแปรลับและการตั้งค่า
   ├─ package.json                   dependency และคำสั่ง Bun
   ├─ bun.lock                       เวอร์ชัน dependency ที่ Bun ล็อกไว้
   ├─ prisma/
   │  └─ schema.prisma               แบบจำลอง database
   └─ src/
      ├─ index.ts                    จุดเริ่ม Express, route และ webhook
      ├─ lib/
      │  └─ prisma.ts                สร้าง Prisma client เพื่อคุย database
      ├─ services/
      │  ├─ booking.ts               กติกาธุรกิจการจอง
      │  └─ user.ts                  ค้นหา/สร้าง User จาก LINE User ID
      └─ generated/prisma/           Prisma สร้างจาก schema; ไม่แก้เอง
```

### `backend/package.json`

เป็นรายการว่า backend ใช้อะไร และจะรันอย่างไร

- `express`: รับ HTTP request และสร้าง API/webhook
- `@prisma/client`: ใช้คำสั่ง TypeScript คุยกับ database
- `@prisma/adapter-libsql`: ตัวเชื่อม Prisma กับ SQLite ที่รองรับ Bun runtime
- `dotenv`: โหลดค่าจาก `.env`
- `bun`: รัน TypeScript โดยตรงและ watch การเปลี่ยนแปลงตอนพัฒนา
- `prisma`: สร้าง client และจัดการ schema/migration

คำสั่งพัฒนาในปัจจุบันคือ:

```powershell
cd backend
bun run dev
```

### `backend/.env.example`

เป็น **ตัวอย่างชื่อ** setting ที่เครื่องต้องมี ไม่ใช่ที่เก็บ secret จริง

- `DATABASE_URL`: ตำแหน่ง SQLite database เช่น `file:./dev.db`
- `LINE_CHANNEL_SECRET`: ใช้ตรวจว่า webhook มาจาก LINE จริง
- `LINE_CHANNEL_ACCESS_TOKEN`: ใช้สิทธิ์เรียก LINE Reply API
- `PORT`: port ของ Express

ให้คัดลอกเป็น `.env` ในเครื่องตัวเองและใส่ค่าเอง ห้าม commit `.env` และห้ามวาง token ใน source code หรือเอกสาร

### `backend/prisma/schema.prisma`

ไฟล์นี้คือแบบแปลน database ไม่ใช่ database ที่กำลังรันอยู่

โมเดลหลักมีความสัมพันธ์แบบนี้:

```text
User 1 คน  ----- มีได้หลาย ----- Booking
Slot 1 ช่วง ----- มีได้หลาย ----- Booking
```

ดังนั้น `Booking` มี `userId` และ `slotId` เป็น foreign key เพื่อบอกว่าใครจองช่วงไหน

สิ่งที่น่าสังเกต:

- `@id` คือ primary key
- `@default(autoincrement())` ให้ database สร้างเลข `id`
- `@unique` บน `lineUserId` ป้องกัน LINE user เดิมถูกสร้างซ้ำ
- `@@index([slotId, status])` ทำให้ query หาจำนวน booking ที่ยืนยันของ slot เร็วขึ้น
- `status` ปัจจุบันเป็น string เช่น `CONFIRMED` และ `CANCELLED`

หลังแก้ schema ต้องสร้าง Prisma Client ใหม่ก่อนจึงจะใช้ type/model ใหม่ใน TypeScript ได้ คำสั่งที่ใช้ควรดูจากเอกสาร Prisma และสถานะ migration ของโครงการก่อนเสมอ อย่าแก้ schema แล้วคาดหวังว่า database จะเปลี่ยนเอง

### `backend/src/lib/prisma.ts`

รวมจุดเชื่อม database ไว้จุดเดียว:

1. โหลด `.env`
2. อ่าน `DATABASE_URL`
3. สร้าง SQLite adapter
4. export `prisma` เพื่อให้ service ทุกตัวใช้ connection เดียวกัน

ไฟล์อื่นจึง import `prisma` แทนการตั้งค่า database ซ้ำ นี่คือการแยก **infrastructure** ออกจากกติกาธุรกิจ

### `backend/src/services/user.ts`

มี `getOrCreateUser(lineUserId)` ซึ่งใช้ `prisma.user.upsert()`:

- ถ้ามี User ที่ `lineUserId` ตรงกันแล้ว: คืน User เดิม
- ถ้ายังไม่มี: สร้าง User ใหม่แล้วคืนค่ากลับ

เหตุผลที่ใช้ `upsert` คือ webhook จะรับข้อความเดิมจาก LINE user คนเดิมได้หลายครั้ง โดยไม่ต้องเขียน query หาแล้วค่อยสร้างเองสองขั้นตอน

### `backend/src/services/booking.ts`

ไฟล์นี้คือหัวใจของกติกาจอง ไม่ควรยัดกติกาเหล่านี้ไว้ใน route

`createBooking({ userId, slotId })` ทำงานตามลำดับนี้:

1. หา Slot; ถ้าไม่มี โยน `SLOT_NOT_FOUND`
2. หา User; ถ้าไม่มี โยน `USER_NOT_FOUND`
3. ตรวจว่าคนเดิมมี booking ที่ `CONFIRMED` ใน Slot เดิมหรือยัง
4. นับ booking ที่ `CONFIRMED` ของ Slot นั้น
5. ถ้าจำนวนเท่ากับหรือมากกว่า `capacity` ให้โยน `SLOT_FULL`
6. สร้าง Booking ใหม่เป็น `CONFIRMED` พร้อม `bookingCode`

ทุกขั้นทำใน `prisma.$transaction()` ด้วย isolation level `Serializable` เพราะถ้ามีคนสองคนกดจองพร้อมกัน ทั้งคู่ไม่ควรผ่านการนับที่ว่างเดียวกันและทำให้คิวเกิน capacity ได้

ข้อควรจำ: route/webhook รับข้อมูล, service ตัดสินกติกา, Prisma คุยกับ database

### `backend/src/index.ts`

เป็นจุดเริ่มของ Express และมีหน้าที่เชื่อมโลกภายนอกเข้ากับ service

- `POST /webhook`: รับ event จาก LINE
- `express.raw(...)`: เก็บ body ดิบเพื่อ verify LINE signature ก่อน parse JSON
- `getLineReplyMessage(...)`: เลือกว่าจะตอบดูคิว จอง หรือดูสถานะ
- `GET /slots`, `POST /slots`: API สำหรับดู/สร้าง Slot
- `POST /bookings`: API สำหรับสร้าง Booking โดยไม่ผ่าน LINE
- `GET /bookings/:id`, `GET /users/:userId/bookings`: API สำหรับอ่านข้อมูล

การเรียก `express.json()` อยู่หลัง route `/webhook` เป็นเรื่องสำคัญ: การตรวจลายเซ็นของ LINE ต้องใช้ raw body เดิม หาก parse แล้วแปลงกลับเป็น JSON อาจทำให้ signature ไม่ตรง

### `backend/src/generated/prisma/`

เป็นโค้ดที่ Prisma generate จาก `schema.prisma` เพื่อให้ TypeScript รู้จัก type และ model เช่น `Booking` **ห้ามแก้ไฟล์ใน folder นี้โดยตรง** เพราะการ generate ครั้งถัดไปจะเขียนทับ

## พื้นฐานที่ควรเรียนก่อนพัฒนาต่อ

ไม่ต้องเรียนให้ครบทุกบทก่อน ให้เรียนตามลำดับนี้และกลับมาใช้กับโค้ดทันที

### 1. JavaScript/TypeScript ที่จำเป็นสำหรับ Bun

หัวข้อ:

- `const`, object, array, destructuring
- function และ module: `export` / `import`
- `async` / `await` และ Promise
- `try` / `catch` / `throw new Error()`
- `process.env` และ `.env`
- ความต่างระหว่าง process ที่รัน server กับ database

แบบฝึกจากโค้ดจริง: อธิบายว่าเหตุใด `createBooking()` จึงเป็น `async` และ `await prisma.$transaction(...)` ก่อนคืนค่าได้

### 2. HTTP และ Express

หัวข้อ:

- HTTP method: `GET` อ่าน, `POST` สร้าง
- request: path, headers, body, params
- response: status code และ JSON
- ความหมายคร่าว ๆ ของ `200`, `201`, `400`, `401`, `404`, `409`, `500`
- middleware และลำดับการทำงาน

แบบฝึก: เปิด `index.ts` แล้วตาม `POST /bookings` ว่าอ่าน `req.body` ตรงไหน ส่ง `res.status(...)` ตรงไหน และเรียก service ตรงไหน

### 3. Database และ SQL แนวคิด

หัวข้อ:

- table, row, column
- primary key และ foreign key
- one-to-many relation
- `INSERT`, `SELECT`, `UPDATE`, `COUNT`, `WHERE`
- unique constraint และ index
- transaction และปัญหา concurrent request

แบบฝึก: วาดตาราง `User`, `Slot`, `Booking` และใส่ตัวอย่าง `User.id = 1`, `Slot.id = 3`, `Booking.userId = 1`, `Booking.slotId = 3`

### 4. Prisma

หัวข้อ:

- schema กับ database เป็นคนละสิ่งกัน
- `findUnique`, `findFirst`, `findMany`, `create`, `update`, `count`, `upsert`
- `where`, `select`, `include`
- Prisma error และ transaction

แบบฝึก: เทียบ `prisma.booking.count({ where: ... })` กับประโยค SQL ความหมายว่า “นับการจองที่ยืนยันของ Slot นี้”

### 5. กติกาธุรกิจและการจัดโค้ด

หัวข้อ:

- route/controller ไม่ควรเป็นที่รวมกฎทุกอย่าง
- service คือที่อยู่ของกติกา เช่น slot เต็มหรือจองซ้ำ
- error code เฉพาะ เช่น `SLOT_FULL` ช่วยให้ caller ตอบผู้ใช้ได้ถูกต้อง
- input จากภายนอกต้องตรวจเสมอ แม้จะมาจาก LINE หรือ Postman

แบบฝึก: อธิบายว่าหากย้ายการตรวจ slot เต็มออกจาก `createBooking()` ไปไว้เฉพาะ webhook จะมีช่องโหว่อะไรเมื่อมีคนเรียก `POST /bookings` โดยตรง

## ลำดับฝึกปฏิบัติด้วย Postman

ให้เริ่ม server ก่อน:

```powershell
cd backend
bun run dev
```

ตั้ง base URL เป็น `http://localhost:3000`

### รอบ 1: ตรวจ server และ database

1. ส่ง `GET /`
2. ส่ง `GET /health/db`
3. บันทึก status และ response ที่เห็น

เป้าหมาย: แยกให้ได้ว่า Express ทำงาน กับ database เชื่อมได้ เป็นคนละการตรวจสอบ

### รอบ 2: สร้างและอ่าน Slot

1. อ่านรูปแบบ body ของ `POST /slots` จาก `index.ts` ก่อน
2. ส่ง request สร้าง Slot ใน Postman
3. ส่ง `GET /slots`
4. สังเกต `capacity`, `bookedCount`, `remaining`

เป้าหมาย: เข้าใจว่า Slot คือข้อมูลที่ผู้ดูแลกำหนด ส่วน `remaining` เป็นค่าที่ระบบคำนวณจาก Booking ที่ยืนยันแล้ว

### รอบ 3: ทดลองกติกาการจอง

1. เตรียม User และ Slot ที่มีอยู่จริงตามวิธีที่ API ปัจจุบันรองรับ
2. ส่ง `POST /bookings` ด้วย `userId` และ `slotId`
3. ส่งซ้ำด้วย user และ slot เดิม
4. ทำจน Slot เต็ม แล้วลองจองอีกครั้ง
5. ดู response และตามไปที่ `BookingError` ใน `services/booking.ts`

เป้าหมาย: รู้ว่าการ error ไม่ใช่ “ระบบพัง” เสมอไป บาง error คือผลลัพธ์ธุรกิจที่ตั้งใจ เช่นคิวเต็มหรือจองซ้ำ

### รอบ 4: เชื่อมกับ LINE เมื่อ API เข้าใจแล้ว

ทดสอบคำสั่งทีละคำสั่งผ่าน LINE:

1. `คิว` เพื่อดู Slot ที่ยังมีที่ว่าง
2. `จอง <slotId>` เพื่อสร้าง Booking
3. `สถานะ` เพื่อดู Booking ของ LINE user คนนั้น

ตรวจ log ใน terminal:

- `LINE webhook event:` หมายถึง server ได้ event
- `LINE reply sent` หมายถึง Reply API สำเร็จตามที่ server เห็น
- `LINE Reply API error:` ต้องอ่าน error ต่อ ไม่ควรสรุปจาก HTTP 200 ของ webhook เพียงอย่างเดียว

## Checklist ก่อนเพิ่ม feature ใหม่

ก่อนเริ่ม เช่น “ยกเลิกการจองผ่าน LINE” ให้ตอบคำถามนี้ได้ก่อน:

- ข้อมูลใหม่หรือ field ใหม่จำเป็นไหม? ถ้าจำเป็น แก้ที่ `schema.prisma`
- กติกาอยู่ service ไหน? เช่น `cancelBooking()` ใน `services/booking.ts`
- จะเปิดให้ HTTP API ไหนเรียกได้? route อยู่ `index.ts`
- ข้อความ LINE จะเรียก service เดียวกับ API ได้อย่างไร?
- error แต่ละแบบจะตอบ HTTP และตอบ LINE ว่าอะไร?
- จะทดสอบด้วย Postman ก่อน LINE ได้หรือไม่?
- กรณีพร้อมกันหลาย request ข้อมูลยังถูกต้องหรือไม่?

## โจทย์ต่อไปที่เหมาะที่สุด

อย่าเพิ่มหลายอย่างพร้อมกัน เลือกหนึ่ง Slice:

> เพิ่มการยกเลิก Booking โดยเริ่มจากทดสอบ service/API ด้วย Postman ก่อน แล้วจึงออกแบบคำสั่ง LINE

เหตุผล: มี `cancelBooking()` อยู่แล้ว จึงได้ฝึกอ่านของเดิม, HTTP, error handling, Prisma update และ state ของ Booking โดยไม่ต้องกระโดดไปเรียนเทคโนโลยีใหม่

## เกณฑ์ว่าพร้อมไปต่อ

คุณไม่ต้องจำ code ได้ทั้งหมด แต่ควรอธิบายได้ด้วยคำตัวเองว่า:

1. LINE User ID ต่างจาก User ID ใน database อย่างไร
2. `Booking` เชื่อม `User` กับ `Slot` อย่างไร
3. เพราะอะไรการเช็กคิวเต็มและสร้าง Booking ต้องอยู่ใน transaction
4. route, service และ Prisma รับผิดชอบคนละเรื่องอะไร
5. เมื่อ `POST /bookings` ได้ error คุณจะเริ่มตามหาจากไฟล์ใด

เมื่ออธิบายห้าข้อนี้ได้ ให้ทำ feature ต่อได้เลย ความเข้าใจที่เหลือจะค่อย ๆ เพิ่มจากการทำงานจริง
