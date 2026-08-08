import { randomUUID } from "node:crypto";
import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

const CONFIRMED_STATUS = "CONFIRMED";
const MAX_TRANSACTION_ATTEMPTS = 3;

export type BookingErrorCode =
  | "SLOT_NOT_FOUND"
  | "USER_NOT_FOUND"
  | "SLOT_FULL"
  | "DUPLICATE_BOOKING";

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
              status: CONFIRMED_STATUS,
            },
            select: { id: true },
          });

          if (existingBooking) {
            throw new BookingError(
              "DUPLICATE_BOOKING",
              "User already has a confirmed booking for this slot",
            );
          }

          const confirmedCount = await tx.booking.count({
            where: {
              slotId: input.slotId,
              status: CONFIRMED_STATUS,
            },
          });

          if (confirmedCount >= slot.capacity) {
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
    where: {
      id: bookingId,
    },
    include: {
      user: true,
      slot: true,
    },
  });
}