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
