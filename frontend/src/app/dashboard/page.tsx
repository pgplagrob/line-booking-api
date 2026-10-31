"use client";

import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  RefreshCw,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  completeAdminBooking,
  getAdminDashboard,
  type AdminBooking,
  type AdminDashboard,
} from "@/api/admin";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function customerName(booking: AdminBooking) {
  return booking.user.displayName?.trim() || `LINE ${booking.user.lineUserId.slice(-6)}`;
}

function statusLabel(status: AdminBooking["status"]) {
  if (status === "COMPLETED") return "เสร็จแล้ว";
  if (status === "CANCELLED") return "ยกเลิก";
  return "รอให้บริการ";
}

export default function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setDashboard(await getAdminDashboard());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  async function handleComplete(booking: AdminBooking) {
    const confirmed = window.confirm(
      `ยืนยันว่าบริการ ${customerName(booking)} เวลา ${formatTime(booking.slot.startAt)} เสร็จแล้ว?`,
    );

    if (!confirmed) return;

    setCompletingId(booking.id);
    setError(null);

    try {
      await completeAdminBooking(booking.id);
      await loadDashboard();
    } catch (completeError) {
      setError(
        completeError instanceof Error ? completeError.message : "ไม่สามารถยืนยันงานเสร็จได้",
      );
    } finally {
      setCompletingId(null);
    }
  }

  const summary = [
    {
      value: dashboard?.summary.total ?? 0,
      label: "การจองวันนี้",
      icon: CalendarDays,
    },
    {
      value: dashboard?.summary.waiting ?? 0,
      label: "รอให้บริการ",
      icon: Clock3,
    },
    {
      value: dashboard?.summary.completed ?? 0,
      label: "เสร็จแล้ว",
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Today&apos;s queue
            </p>
            <h1 className="text-3xl font-bold tracking-tight">แดชบอร์ด</h1>
            <p className="mt-2 text-sm text-neutral-500">
              ดูคิววันนี้และยืนยันเมื่อตัดผมเสร็จ
            </p>
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

        <Card className="mt-6 border-neutral-200 bg-white shadow-sm">
          <CardHeader className="flex-row items-center justify-between border-b border-neutral-100 px-6 py-5">
            <div>
              <h2 className="font-semibold">คิววันนี้</h2>
              <p className="mt-1 text-xs text-neutral-500">เรียงตามเวลาให้บริการ</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void loadDashboard()}
              disabled={isLoading}
            >
              <RefreshCw aria-hidden="true" className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
              รีเฟรช
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            {error && (
              <div role="alert" className="m-6 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {isLoading && !dashboard ? (
              <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-neutral-500">
                <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
                กำลังโหลดคิววันนี้...
              </div>
            ) : dashboard?.bookings.length ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-neutral-100 hover:bg-transparent">
                    <TableHead className="pl-6">ลูกค้า</TableHead>
                    <TableHead>เวลา</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="pr-6 text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard.bookings.map((booking) => (
                    <TableRow key={booking.id} className="border-neutral-100">
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
                            <UserRound aria-hidden="true" className="size-4" />
                          </span>
                          <span className="font-medium">{customerName(booking)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-neutral-500">
                        {formatTime(booking.slot.startAt)} - {formatTime(booking.slot.endAt)} น.
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            booking.status === "COMPLETED"
                              ? "success"
                              : booking.status === "CONFIRMED"
                                ? "waiting"
                                : "default"
                          }
                        >
                          {statusLabel(booking.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        {booking.status === "CONFIRMED" ? (
                          <Button
                            type="button"
                            size="sm"
                            disabled={completingId === booking.id}
                            onClick={() => void handleComplete(booking)}
                          >
                            {completingId === booking.id ? (
                              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                            ) : (
                              <CheckCircle2 aria-hidden="true" className="size-4" />
                            )}
                            {completingId === booking.id ? "กำลังยืนยัน..." : "เสร็จแล้ว"}
                          </Button>
                        ) : (
                          <span className="text-xs text-neutral-400">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
                <CalendarClock aria-hidden="true" className="mb-4 size-10 text-neutral-300" />
                <p className="font-semibold">ยังไม่มีคิววันนี้</p>
                <p className="mt-1 text-sm text-neutral-500">
                  เมื่อมีลูกค้าจองผ่าน LINE รายการจะปรากฏที่นี่
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
