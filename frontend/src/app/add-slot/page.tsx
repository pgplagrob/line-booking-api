"use client";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Plus,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormValues = {
  date: string;
  startTime: string;
  endTime: string;
  capacity: string;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

const initialValues: FormValues = {
  date: "",
  startTime: "09:00",
  endTime: "10:00",
  capacity: "1",
};

function getToday() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  const capacity = Number(values.capacity);

  if (!values.date) errors.date = "กรุณาเลือกวันที่";
  if (!values.startTime) errors.startTime = "กรุณาเลือกเวลาเริ่ม";
  if (!values.endTime) errors.endTime = "กรุณาเลือกเวลาสิ้นสุด";
  if (values.startTime && values.endTime && values.endTime <= values.startTime) {
    errors.endTime = "เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม";
  }
  if (!Number.isInteger(capacity) || capacity < 1) {
    errors.capacity = "จำนวนที่รับต้องเป็นเลขตั้งแต่ 1 ขึ้นไป";
  }

  return errors;
}

export default function AddSlotPage() {
  const today = useMemo(getToday, []);
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<
    { type: "success" | "error"; text: string } | null
  >(null);

  function updateField(field: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setMessage({ type: "error", text: "กรุณาตรวจสอบข้อมูลในแบบฟอร์ม" });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: values.date,
          startTime: values.startTime,
          endTime: values.endTime,
          capacity: Number(values.capacity),
        }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message || "ไม่สามารถเพิ่มช่วงเวลาได้");
      }

      setMessage({ type: "success", text: "เพิ่มช่วงเวลาเรียบร้อยแล้ว" });
      setValues(initialValues);
      setErrors({});
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "เกิดข้อผิดพลาด กรุณาลองใหม่",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 py-8 text-neutral-100 sm:px-6 sm:py-12">
      <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[110px]" />

      <div className="relative mx-auto w-full max-w-2xl">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-2 text-sm text-neutral-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          กลับไปหน้าแดชบอร์ด
        </Link>

        <Card className="overflow-hidden rounded-3xl border-neutral-800 bg-neutral-950/80 shadow-2xl shadow-emerald-950/10 backdrop-blur">
          <CardHeader className="border-b border-neutral-800 p-6 sm:p-8">
            <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
              <CalendarDays aria-hidden="true" className="size-6" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight sm:text-3xl">
              เพิ่มช่วงเวลาใหม่
            </CardTitle>
            <CardDescription className="mt-2 max-w-lg text-sm leading-6 text-neutral-400">
              กำหนดวัน เวลา และจำนวนลูกค้าที่รับได้สำหรับเปิดให้ลูกค้าจองคิว
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} noValidate>
              <div className="grid gap-6">
                <div className="grid gap-2.5">
                  <Label htmlFor="slot-date" className="flex items-center gap-2">
                    <CalendarDays aria-hidden="true" className="size-4 text-emerald-400" />
                    วันที่
                  </Label>
                  <Input
                    id="slot-date"
                    type="date"
                    min={today}
                    value={values.date}
                    aria-invalid={Boolean(errors.date)}
                    aria-describedby={errors.date ? "slot-date-error" : undefined}
                    onChange={(event) => updateField("date", event.target.value)}
                    className={errors.date ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}
                  />
                  {errors.date && (
                    <p id="slot-date-error" className="text-xs text-red-400">
                      {errors.date}
                    </p>
                  )}
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="grid gap-2.5">
                    <Label htmlFor="start-time" className="flex items-center gap-2">
                      <Clock3 aria-hidden="true" className="size-4 text-emerald-400" />
                      เวลาเริ่ม
                    </Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={values.startTime}
                      aria-invalid={Boolean(errors.startTime)}
                      onChange={(event) => updateField("startTime", event.target.value)}
                    />
                    {errors.startTime && <p className="text-xs text-red-400">{errors.startTime}</p>}
                  </div>

                  <div className="grid gap-2.5">
                    <Label htmlFor="end-time" className="flex items-center gap-2">
                      <Clock3 aria-hidden="true" className="size-4 text-emerald-400" />
                      เวลาสิ้นสุด
                    </Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={values.endTime}
                      aria-invalid={Boolean(errors.endTime)}
                      aria-describedby={errors.endTime ? "end-time-error" : undefined}
                      onChange={(event) => updateField("endTime", event.target.value)}
                      className={errors.endTime ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}
                    />
                    {errors.endTime && (
                      <p id="end-time-error" className="text-xs text-red-400">
                        {errors.endTime}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-2.5">
                  <Label htmlFor="capacity" className="flex items-center gap-2">
                    <UsersRound aria-hidden="true" className="size-4 text-emerald-400" />
                    จำนวนที่รับได้
                  </Label>
                  <div className="relative">
                    <Input
                      id="capacity"
                      type="number"
                      min="1"
                      step="1"
                      inputMode="numeric"
                      value={values.capacity}
                      aria-invalid={Boolean(errors.capacity)}
                      aria-describedby={errors.capacity ? "capacity-error" : "capacity-hint"}
                      onChange={(event) => updateField("capacity", event.target.value)}
                      className={`pr-14 ${errors.capacity ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-neutral-500">
                      คน
                    </span>
                  </div>
                  {errors.capacity ? (
                    <p id="capacity-error" className="text-xs text-red-400">
                      {errors.capacity}
                    </p>
                  ) : (
                    <p id="capacity-hint" className="text-xs text-neutral-500">
                      จำนวนลูกค้าสูงสุดที่สามารถจองช่วงเวลานี้ได้
                    </p>
                  )}
                </div>
              </div>

              {message && (
                <div
                  role="status"
                  className={`mt-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
                    message.type === "success"
                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                      : "border-red-500/25 bg-red-500/10 text-red-300"
                  }`}
                >
                  {message.type === "success" && (
                    <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  )}
                  <span>{message.text}</span>
                </div>
              )}

              <div className="mt-8 flex flex-col-reverse gap-3 border-t border-neutral-800 pt-6 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" className="sm:min-w-28" onClick={() => {
                  setValues(initialValues);
                  setErrors({});
                  setMessage(null);
                }}>
                  ล้างข้อมูล
                </Button>
                <Button type="submit" size="lg" disabled={isSubmitting} className="shadow-lg shadow-emerald-950/40 sm:min-w-44">
                  {isSubmitting ? (
                    <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                  ) : (
                    <Plus aria-hidden="true" className="size-4" />
                  )}
                  {isSubmitting ? "กำลังเพิ่ม..." : "เพิ่มช่วงเวลา"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
