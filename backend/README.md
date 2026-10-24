# Backend

Express + TypeScript API สำหรับระบบจองคิวผ่าน LINE โดยใช้ Prisma และ SQLite

## เริ่มใช้งาน

```bash
npm install
```

สร้าง `.env` จากไฟล์ตัวอย่างก่อนเริ่มใช้งานครั้งแรก:

```powershell
Copy-Item .env.example .env
```

จากนั้นเตรียมฐานข้อมูล สร้าง Prisma Client และเปิดเซิร์ฟเวอร์:

```bash
npx prisma migrate dev
npx prisma generate
npm run dev
```

เซิร์ฟเวอร์ทำงานที่ `http://localhost:3000` โดยค่าเริ่มต้น

## โครงสร้างโปรเจคและหน้าที่ของแต่ละ folder

```text
backend/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── index.ts
│   ├── config/
│   │   └── env.ts
│   ├── lib/
│   │   └── prisma.ts
│   ├── routes/
│   │   ├── booking.ts
│   │   └── line.ts
│   ├── services/
│   │   ├── booking.ts
│   │   └── user.ts
│   └── types/
│       └── line.ts
├── package.json
├── tsconfig.json
├── prisma.config.ts
└── README.md
```

### `prisma/`

- เก็บ schema ของฐานข้อมูล Prisma
- `schema.prisma` คือไฟล์กลางที่กำหนดตาราง เช่น `User`, `Slot`, `Booking`
- `migrations/` เก็บประวัติการเปลี่ยน schema ของ database

### `src/`

- โฟลเดอร์หลักของ application logic
- เป็นจุดรวมของ API, service, config, types

### `src/app.ts`

- สร้างและตั้งค่า Express app
- mount route ต่าง ๆ เข้า app
- ทำหน้าที่ “วางอุปกรณ์รับ request” ให้ซอฟต์แวร์ทั้งหมดใช้งานร่วมกัน

### `src/server.ts`

- เป็น file start server จริง
- เรียก `prisma.$connect()`
- เปิด port และเริ่มฟัง request
- ดูแล graceful shutdown เมื่อ server ปิด

### `src/index.ts`

- เป็น entry point ของโปรเจกต์
- เรียก `startServer()` เพื่อเริ่มแอป
- ทำหน้าที่เป็น “จุดเริ่มต้นของโปรแกรม” เท่านั้น

### `src/config/env.ts`

- อ่านค่า environment variables เช่น `PORT`, `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`
- ใช้เพื่อ集中ความรับผิดชอบเรื่องการโหลด config

### `src/lib/prisma.ts`

- Initial Prisma Client
- สร้าง connection แบบที่โปรเจกต์ใช้ เช่น SQLite หรือ database อื่น ๆ
- เป็น layer ที่ route/service เรียกใช้งาน Prisma ได้แบบสะดวก

### `src/routes/booking.ts`

- เก็บ routes ที่เกี่ยวกับ slot และ booking
- เช่น `GET /slots`, `POST /slots`, `POST /bookings`, `DELETE /bookings/:id`
- รับ request, validate ข้อมูล, เรียก service logic

### `src/routes/line.ts`

- เก็บ routes และ logic ที่เกี่ยวกับ LINE webhook
- ตรวจลายเซ็น LINE (`x-line-signature`)
- parse events จาก LINE
- ส่ง reply กลับไปยัง LINE
- ทำหน้าที่เชื่อมระหว่าง LINE กับ business logic

### `src/services/booking.ts`

- เก็บ business logic ที่เกี่ยวกับ booking
- สร้าง booking
- ตรวจความพร้อมของ slot
- ตรวจความซ้ำ
- คำนวณว่าคิวเต็มหรือยัง
- ยกเลิก booking
- Query ข้อมูล booking / slot

### `src/services/user.ts`

- เก็บ logic เกี่ยวกับผู้ใช้
- ดึงหรือสร้าง user จาก `lineUserId`
- ทำหน้าที่เชื่อมข้อมูล LINE user กับฐานข้อมูล local

### `src/types/line.ts`

- ประกาศ type สำหรับ LINE payload และ LINE message
- ช่วยให้โค้ดอ่านง่ายและลดข้อผิดพลาดจาก type

## Flow การทำงานแบบสั้น ๆ

1. Client หรือ LINE ส่ง request ไปที่ route
2. route validate request และ call service
3. service ทำการ query/update database ผ่าน Prisma
4. response ถูกส่งกลับไปตาม route
5. สำหรับ LINE webhook จะมีขั้นตอน verify signature และ reply กลับไปยัง LINE

## ระเบียบการแยก concern

- `routes` = รับ request
- `services` = ทำ business logic
- `lib` = low-level utility และ connection
- `config` = configuration
- `types` = type definitions
- `prisma` = database schema และ migration
