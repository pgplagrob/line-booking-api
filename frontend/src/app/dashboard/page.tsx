import { UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const summary = [
  { value: 12, label: "จองทั้งหมด" },
  { value: 8, label: "รอดำเนินการ" },
  { value: 4, label: "เสร็จสิ้น" },
];

const bookings = [
  { id: 1, customer: "สมชาย", time: "09:00", status: "waiting" },
  { id: 2, customer: "มานี", time: "10:00", status: "waiting" },
  { id: 3, customer: "วิชัย", time: "11:00", status: "completed" },
] as const;

export default function AdminDashboardPage() {
  return (
    <main className="flex min-h-screen items-start justify-center bg-black px-3 py-3 text-neutral-100 sm:items-center sm:px-6">
      <Card className="w-full max-w-[608px] overflow-hidden rounded-[22px] border-neutral-800 bg-black shadow-none">
        <CardHeader className="flex-row items-start justify-between px-[14px] pb-0 pt-[17px]">
          <div>
            <h1 className="text-[23px] font-bold leading-tight tracking-[-0.03em]">
              Admin Dashboard
            </h1>
            <p className="mt-2 text-[13px] leading-none text-neutral-300">
              ตัวอย่างข้อมูลสมมติ
            </p>
          </div>

          <Badge className="mt-[17px] border-0 bg-emerald-950 px-3 py-1 text-sm font-medium text-emerald-500">
            Admin
          </Badge>
        </CardHeader>

        <CardContent className="px-[14px] pb-[15px] pt-0">
          <section
            aria-label="สรุปข้อมูลการจอง"
            className="grid grid-cols-3 pb-[25px] pt-[38px]"
          >
            {summary.map((item) => (
              <div key={item.label} className="pl-4">
                <p className="text-[24px] font-semibold leading-none">{item.value}</p>
                <p className="mt-2 text-[12px] text-neutral-300">{item.label}</p>
              </div>
            ))}
          </section>

          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="border-neutral-900">
                <TableHead className="w-[43%] px-0 text-[12px] text-neutral-300">
                  ลูกค้า
                </TableHead>
                <TableHead className="w-[25%] px-0 text-[12px] text-neutral-300">
                  เวลา
                </TableHead>
                <TableHead className="w-[32%] px-0 text-[12px] text-neutral-300">
                  สถานะ
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id} className="h-14 border-neutral-900 hover:bg-transparent">
                  <TableCell className="px-0 py-2">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-800">
                        <UserRound aria-hidden="true" className="size-[18px]" strokeWidth={1.6} />
                      </span>
                      <span className="font-semibold">{booking.customer}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-0 py-2 text-base">{booking.time}</TableCell>
                  <TableCell className="px-0 py-2">
                    <Badge
                      variant={booking.status === "waiting" ? "waiting" : "success"}
                      className="border-0 px-3 py-1 text-sm font-normal"
                    >
                      {booking.status === "waiting" ? "รอคิว" : "เสร็จสิ้น"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
