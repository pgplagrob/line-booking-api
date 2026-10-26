import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const response = await fetch(`${BACKEND_URL}/slots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data: unknown = await response.json().catch(() => ({
      message: "Backend returned an invalid response",
    }));

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Create slot proxy failed:", error);
    return NextResponse.json(
      { message: "ไม่สามารถเชื่อมต่อ Backend ได้ กรุณาตรวจสอบว่าเซิร์ฟเวอร์กำลังทำงาน" },
      { status: 503 },
    );
  }
}
