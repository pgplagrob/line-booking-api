import { randomUUID } from "node:crypto";
import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import {
  CANCELLED_STATUS,
  CAPACITY_OCCUPYING_STATUSES,
  COMPLETED_STATUS,
  CONFIRMED_STATUS,
  summarizeBookings,
} from "./booking-status.js";
const MAX_TRANSACTION_ATTEMPTS = 3;

export type BookingErrorCode =
  | "SLOT_NOT_FOUND"
  | "USER_NOT_FOUND"
  | "SLOT_FULL"
  | "DUPLICATE_BOOKING"
  | "BOOKING_NOT_FOUND"
  | "BOOKING_ALREADY_CANCELLED"
  | "BOOKING_ALREADY_COMPLETED";

export class BookingError extends Error {
  constructor(
    public readonly code: BookingErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "BookingError";
  }
}

type CreateBookingInput = {
  userId: number;
  slotId: number;
  note?: string;
};

function isTransactionConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

export async function createBooking(input: CreateBookingInput) {
  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const slot = await tx.slot.findUnique({
            where: { id: input.slotId },
            select: { id: true, capacity: true },
          });

          if (!slot) {
            throw new BookingError("SLOT_NOT_FOUND", "Slot not found");
          }

          const user = await tx.user.findUnique({
            where: { id: input.userId },
            select: { id: true },
          });

          if (!user) {
            throw new BookingError("USER_NOT_FOUND", "User not found");
          }

          const existingBooking = await tx.booking.findFirst({
            where: {
              userId: input.userId,
              slotId: input.slotId,
              status: { in: CAPACITY_OCCUPYING_STATUSES },
            },
            select: { id: true },
          });

          if (existingBooking) {
            throw new BookingError(
              "DUPLICATE_BOOKING",
              "User already has a confirmed booking for this slot",
            );
          }

          const occupiedCount = await tx.booking.count({
            where: {
              slotId: input.slotId,
              status: { in: CAPACITY_OCCUPYING_STATUSES },
            },
          });

          if (occupiedCount >= slot.capacity) {
            throw new BookingError("SLOT_FULL", "Slot is fully booked");
          }

          return tx.booking.create({
            data: {
              bookingCode: randomUUID(),
              userId: input.userId,
              slotId: input.slotId,
              status: CONFIRMED_STATUS,
              ...(input.note === undefined ? {} : { note: input.note }),
            },
            include: {
              user: true,
              slot: true,
            },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5_000,
          timeout: 10_000,
        },
      );
    } catch (error) {
      const shouldRetry =
        isTransactionConflict(error) && attempt < MAX_TRANSACTION_ATTEMPTS;

      if (!shouldRetry) {
        throw error;
      }
    }
  }

  throw new Error("Could not create booking after transaction retries");
}

export async function getBookingById(bookingId: number) {
  return prisma.booking.findUnique({
    where: { id: bookingId },
    include: { user: true, slot: true },
  });
}

export async function getBookingsByUserId(userId: number) {
  return prisma.booking.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { slot: true },
  });
}

export async function cancelBooking(bookingId: number) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, status: true },
  });

  if (!booking) {
    throw new BookingError("BOOKING_NOT_FOUND", "Booking not found");
  }

  if (booking.status === CANCELLED_STATUS) {
    throw new BookingError(
      "BOOKING_ALREADY_CANCELLED",
      "Booking has already been cancelled",
    );
  }

  if (booking.status === COMPLETED_STATUS) {
    throw new BookingError(
      "BOOKING_ALREADY_COMPLETED",
      "A completed booking cannot be cancelled",
    );
  }

  return prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: CANCELLED_STATUS,
      cancelledAt: new Date(),
    },
    include: {
      user: true,
      slot: true,
    },
  });
}

export async function completeBooking(bookingId: number) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, status: true },
  });

  if (!booking) {
    throw new BookingError("BOOKING_NOT_FOUND", "Booking not found");
  }

  if (booking.status === CANCELLED_STATUS) {
    throw new BookingError(
      "BOOKING_ALREADY_CANCELLED",
      "A cancelled booking cannot be completed",
    );
  }

  if (booking.status === COMPLETED_STATUS) {
    throw new BookingError(
      "BOOKING_ALREADY_COMPLETED",
      "Booking has already been completed",
    );
  }

  return prisma.booking.update({
    where: { id: bookingId },
    data: { status: COMPLETED_STATUS },
    include: {
      user: true,
      slot: true,
    },
  });
}

export async function getTodayBookings() {
  const bangkokDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const dayStart = new Date(`${bangkokDate}T00:00:00+07:00`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1_000);

  const bookings = await prisma.booking.findMany({
    where: {
      slot: {
        startAt: {
          gte: dayStart,
          lt: dayEnd,
        },
      },
    },
    orderBy: {
      slot: {
        startAt: "asc",
      },
    },
    include: {
      user: true,
      slot: true,
    },
  });

  return {
    day: bangkokDate,
    summary: summarizeBookings(bookings),
    bookings,
  };
}

export async function getSlotsWithAvailability() {
  const slots = await prisma.slot.findMany({
    orderBy: { startAt: "asc" },
    include: {
      bookings: {
        where: { status: { in: CAPACITY_OCCUPYING_STATUSES } },
        select: { id: true },
      },
    },
  });

  return slots.map(({ bookings, ...slot }) => ({
    ...slot,
    bookedCount: bookings.length,
    remaining: Math.max(slot.capacity - bookings.length, 0),
  }));
}

export async function getAvailableSlots() {
  const slots = await getSlotsWithAvailability();

  return slots.filter((slot) => slot.remaining > 0);
}
