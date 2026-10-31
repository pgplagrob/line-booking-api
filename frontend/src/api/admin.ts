export type BookingStatus = "CONFIRMED" | "COMPLETED" | "CANCELLED";

export type AdminBooking = {
  id: number;
  bookingCode: string;
  status: BookingStatus;
  note: string | null;
  user: {
    id: number;
    lineUserId: string;
    displayName: string | null;
  };
  slot: {
    id: number;
    startAt: string;
    endAt: string;
  };
};

export type AdminDashboard = {
  day: string;
  summary: {
    total: number;
    waiting: number;
    completed: number;
  };
  bookings: AdminBooking[];
};

type ErrorResponse = {
  message?: string;
};

async function readResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & ErrorResponse;

  if (!response.ok) {
    throw new Error(data.message || "เกิดข้อผิดพลาด กรุณาลองใหม่");
  }

  return data;
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const response = await fetch("/api/admin/bookings", { cache: "no-store" });
  return readResponse<AdminDashboard>(response);
}

export async function completeAdminBooking(bookingId: number): Promise<void> {
  const response = await fetch(`/api/admin/bookings/${bookingId}/complete`, {
    method: "PATCH",
  });
  await readResponse<{ message: string }>(response);
}
