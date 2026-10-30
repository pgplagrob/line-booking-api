import { ArrowRight, CalendarClock, CalendarDays, Clock3, UserRound, UsersRound } from "lucide-react";
import Link from "next/link";

import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

const summary = [
  { value: 12, label: "การจองทั้งหมด", icon: CalendarDays },
  { value: 8, label: "กำลังรอคิว", icon: Clock3 },
  { value: 4, label: "ลูกค้าวันนี้", icon: UsersRound },
];

const bookings = [
  { id: 1, customer: "สมชาย", time: "09:00", status: "waiting" },
  { id: 2, customer: "มานี", time: "10:00", status: "waiting" },
  { id: 3, customer: "วิชัย", time: "11:00", status: "completed" },
] as const;

export default function AdminDashboardPage() {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">Overview</p>
            <h1 className="text-3xl font-bold tracking-tight">แดชบอร์ด</h1>
            <p className="mt-2 text-sm text-neutral-500">ภาพรวมการจองและคิวของวันนี้</p>
          </div>
          <Link href="/slots" className={buttonVariants()}>
            <CalendarClock aria-hidden="true" className="size-4" />
            จัดการ Slot
          </Link>
        </div>

        <section aria-label="สรุปข้อมูลการจอง" className="grid gap-4 sm:grid-cols-3">
          {summary.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.label} className="border-neutral-200 bg-white shadow-sm">
                <CardContent className="p-6">
                  <span className="mb-5 flex size-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <p className="text-3xl font-bold tracking-tight">{item.value}</p>
                  <p className="mt-1 text-sm text-neutral-500">{item.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          <Card className="border-neutral-200 bg-white shadow-sm">
            <CardHeader className="flex-row items-center justify-between border-b border-neutral-100 px-6 py-5">
              <div>
                <h2 className="font-semibold">คิวล่าสุด</h2>
                <p className="mt-1 text-xs text-neutral-500">รายการจองที่กำลังดำเนินการ</p>
              </div>
              <button className="text-xs font-medium text-neutral-500 hover:text-neutral-950">ดูทั้งหมด</button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking.id} className="border-neutral-100">
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
                            <UserRound aria-hidden="true" className="size-4" />
                          </span>
                          <span className="font-medium">{booking.customer}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-neutral-500">{booking.time} น.</TableCell>
                      <TableCell className="pr-6 text-right">
                        <Badge variant={booking.status === "waiting" ? "waiting" : "success"}>
                          {booking.status === "waiting" ? "รอคิว" : "เสร็จสิ้น"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-neutral-200 bg-white shadow-sm">
            <CardContent className="flex h-full min-h-64 flex-col justify-between p-6">
              <div>
                <span className="mb-5 flex size-10 items-center justify-center rounded-xl bg-neutral-950 text-white">
                  <CalendarClock aria-hidden="true" className="size-5" />
                </span>
                <h2 className="text-lg font-semibold">จัดการช่วงเวลา</h2>
                <p className="mt-2 text-sm leading-6 text-neutral-500">เพิ่มช่วงเวลาใหม่ ตรวจจำนวนที่ว่าง หรือลบ Slot ที่ไม่ใช้งานแล้ว</p>
              </div>
              <Link href="/slots" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-neutral-950">
                ไปหน้าจัดการ
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
