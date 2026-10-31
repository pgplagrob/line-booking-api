export const CONFIRMED_STATUS = "CONFIRMED";
export const COMPLETED_STATUS = "COMPLETED";
export const CANCELLED_STATUS = "CANCELLED";

export const CAPACITY_OCCUPYING_STATUSES = [CONFIRMED_STATUS, COMPLETED_STATUS];

export function occupiesSlotCapacity(status: string) {
  return status === CONFIRMED_STATUS || status === COMPLETED_STATUS;
}

export function summarizeBookings(bookings: Array<{ status: string }>) {
  return {
    total: bookings.filter((booking) => booking.status !== CANCELLED_STATUS).length,
    waiting: bookings.filter((booking) => booking.status === CONFIRMED_STATUS).length,
    completed: bookings.filter((booking) => booking.status === COMPLETED_STATUS).length,
  };
}
