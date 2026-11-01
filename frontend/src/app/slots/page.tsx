"use client";

import {
  CalendarPlus,
  CircleOff,
  Clock3,
  LoaderCircle,
  RefreshCw,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

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

type Slot = {
  id: number;
  startAt: string;
  endAt: string;
  capacity: number;
  bookedCount: number;
  remaining: number;
};

type SlotsResponse = {
  slots?: Slot[];
  message?: string;
};

const timeFormatter = new Intl.DateTimeFormat("th-TH", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Asia/Bangkok",
});

function formatTime(value: string) {
  return timeFormatter.format(new Date(value));
}

export default function SlotsPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [closingId, setClosingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSlots = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/slots", { cache: "no-store" });
      const data = (await response.json()) as SlotsResponse;

      if (!response.ok) {
        throw new Error(data.message || "ไม่สามารถโหลดรายการ Slot ได้");
      }

      setSlots(data.slots ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  async function closeSlot(slot: Slot) {
    const confirmed = window.confirm(
      `ต้องการปิด Slot เวลา ${formatTime(slot.startAt)} - ${formatTime(slot.endAt)} ใช่หรือไม่? ลูกค้าจะจองเพิ่มไม่ได้ แต่ประวัติการจองเดิมยังอยู่`,
    );

    if (!confirmed) return;

    setClosingId(slot.id);
    setError(null);

    try {
      const response = await fetch(`/api/slots/${slot.id}`, { method: "DELETE" });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message || "ไม่สามารถปิด Slot ได้");
      }

      setSlots((current) => current.filter((item) => item.id !== slot.id));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "เกิดข้อผิดพลาด กรุณาลองใหม่",
      );
    } finally {
      setClosingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <Card className="overflow-hidden border-neutral-200 bg-white shadow-sm">
          <CardHeader className="flex-col gap-5 border-b border-neutral-100 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-neutral-950 text-white">
                <Clock3 aria-hidden="true" className="size-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">จัดการ Slot</h1>
              <p className="mt-2 text-sm text-neutral-500">เพิ่ม ดูสถานะ และปิดช่วงเวลาที่ไม่ต้องการรับจองเพิ่ม</p>
            </div>

            <Link href="/add-slot" className={buttonVariants({ className: "w-full sm:w-auto" })}>
              <CalendarPlus aria-hidden="true" className="size-4" />
              เพิ่ม Slot
            </Link>
          </CardHeader>

          <CardContent className="p-0">
            {error && (
              <div role="alert" className="m-6 flex items-center justify-between gap-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                <span>{error}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => void loadSlots()}>
                  <RefreshCw aria-hidden="true" className="size-4" />
                  ลองใหม่
                </Button>
              </div>
            )}

            {isLoading ? (
              <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-neutral-500">
                <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
                กำลังโหลด Slot...
              </div>
            ) : slots.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
                <Clock3 aria-hidden="true" className="mb-4 size-10 text-neutral-300" />
                <p className="font-semibold">ยังไม่มี Slot</p>
                <p className="mt-1 text-sm text-neutral-500">เพิ่มช่วงเวลาแรกเพื่อเปิดให้ลูกค้าจองคิว</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-neutral-100 hover:bg-transparent">
                    <TableHead className="pl-6 sm:pl-8">เวลา</TableHead>
                    <TableHead>การจอง</TableHead>
                    <TableHead>ว่าง</TableHead>
                    <TableHead className="pr-6 text-right sm:pr-8">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slots.map((slot) => (
                    <TableRow key={slot.id} className="border-neutral-100">
                      <TableCell className="pl-6 font-semibold sm:pl-8">
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <Clock3 aria-hidden="true" className="size-4 text-neutral-500" />
                          {formatTime(slot.startAt)} - {formatTime(slot.endAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 whitespace-nowrap text-neutral-600">
                          <UsersRound aria-hidden="true" className="size-4 text-neutral-500" />
                          {slot.bookedCount}/{slot.capacity} คน
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={slot.remaining > 0 ? "success" : "waiting"} className="border-0">
                          {slot.remaining > 0 ? `เหลือ ${slot.remaining}` : "เต็มแล้ว"}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-6 text-right sm:pr-8">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`ปิด Slot เวลา ${formatTime(slot.startAt)}`}
                          disabled={closingId === slot.id}
                          onClick={() => void closeSlot(slot)}
                          className="text-neutral-400 hover:bg-red-500/10 hover:text-red-400"
                        >
                          {closingId === slot.id ? (
                            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                          ) : (
                            <CircleOff aria-hidden="true" className="size-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
