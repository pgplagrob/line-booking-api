# Admin Dashboard Frontend

หน้า Admin สำหรับดูภาพรวมคิว พัฒนาด้วย Next.js App Router, React, TypeScript, shadcn/ui และ Tailwind CSS โดยใช้ Bun เป็น package manager และตัวรันคำสั่ง

## วิธีรัน

```powershell
cd frontend
bun install
bun run dev
```

เปิด `http://127.0.0.1:5173` ระบบจะพาไปที่ `/dashboard`

## โครงสร้าง

```text
frontend/
├── src/
│   ├── app/
│   │   ├── dashboard/page.tsx  # หน้า /dashboard
│   │   ├── globals.css         # Tailwind และ theme ของ shadcn
│   │   ├── layout.tsx          # HTML shell และ metadata ที่ใช้ทุกหน้า
│   │   └── page.tsx            # หน้า / ซึ่ง redirect ไป /dashboard
│   ├── components/ui/          # Component ของ shadcn/ui
│   └── lib/utils.ts            # ฟังก์ชันรวม class ของ shadcn/ui
├── components.json             # ตั้งค่า shadcn/ui
├── next.config.ts              # ตั้งค่า Next.js
├── postcss.config.mjs          # เชื่อม Tailwind กับ Next.js
├── package.json
└── tsconfig.json
```

Next.js App Router สร้าง route จากโฟลเดอร์ใน `src/app` จึงไม่ต้องมี `index.html`, `main.tsx`, `server.ts` หรือ `build.ts` แบบ frontend เดิม

ข้อมูลลูกค้าใน `src/app/dashboard/page.tsx` ยังเป็นข้อมูลสมมติและยังไม่ได้เชื่อม Backend
