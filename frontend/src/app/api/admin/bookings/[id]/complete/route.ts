import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const response = await fetch(
      `${BACKEND_URL}/admin/bookings/${encodeURIComponent(id)}/complete`,
      {
        method: "PATCH",
        cache: "no-store",
      },
    );
    const data: unknown = await response.json().catch(() => ({
      message: "Backend returned an invalid response",
    }));

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Complete admin booking proxy failed:", error);
    return NextResponse.json(
      { message: "ไม่สามารถเชื่อมต่อ Backend ได้ กรุณาตรวจสอบว่าเซิร์ฟเวอร์กำลังทำงาน" },
      { status: 503 },
    );
  }
}
