import express from "express";
import { prisma } from "../lib/prisma.js";
import {
  BookingError,
  cancelBooking,
  completeBooking,
  createBooking,
  getBookingById,
  getBookingsByUserId,
  getSlotsWithAvailability,
  getTodayBookings,
} from "../services/booking.js";

const bookingRouter = express.Router();

bookingRouter.get("/health/db", async (_req, res) => {
  try {
    const userCount = await prisma.user.count();

    res.status(200).json({
      database: "connected",
      userCount,
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    res.status(503).json({
      database: "disconnected",
      message: "Cannot connect to database",
    });
  }
});

bookingRouter.get("/slots", async (_req, res) => {
  try {
    const slots = await getSlotsWithAvailability();
    res.status(200).json({ slots });
  } catch (error) {
    console.error("Get slots failed:", error);
    res.status(500).json({ message: "Cannot get slots" });
  }
});

bookingRouter.get("/admin/bookings", async (_req, res) => {
  try {
    const dashboard = await getTodayBookings();
    res.status(200).json(dashboard);
  } catch (error) {
    console.error("Get admin bookings failed:", error);
    res.status(500).json({ message: "Cannot get today's bookings" });
  }
});

bookingRouter.patch("/admin/bookings/:id/complete", async (req, res) => {
  const bookingId = Number(req.params.id);

  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    res.status(400).json({
      code: "INVALID_BOOKING_ID",
      message: "Booking ID must be a positive integer",
    });
    return;
  }

  try {
    const booking = await completeBooking(bookingId);
    res.status(200).json({
      message: "Booking completed successfully",
      booking,
    });
  } catch (error) {
    if (error instanceof BookingError) {
      const status = error.code === "BOOKING_NOT_FOUND" ? 404 : 409;

      res.status(status).json({
        code: error.code,
        message: error.message,
      });
      return;
    }

    console.error("Complete booking failed:", error);
    res.status(500).json({
      code: "INTERNAL_SERVER_ERROR",
      message: "Cannot complete booking",
    });
  }
});

bookingRouter.post("/slots", async (req, res) => {
  const body: unknown = req.body;

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    res.status(400).json({ message: "Request body must be a JSON object" });
    return;
  }

  const { startTime, endTime, capacity } = body as {
    startTime?: unknown;
    endTime?: unknown;
    capacity?: unknown;
  };

  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

  if (
    typeof startTime !== "string" ||
    typeof endTime !== "string" ||
    !timePattern.test(startTime) ||
    !timePattern.test(endTime)
  ) {
    res.status(400).json({ message: "Use time HH:mm" });
    return;
  }

  if (!Number.isInteger(capacity) || Number(capacity) <= 0) {
    res.status(400).json({ message: "capacity must be a positive integer" });
    return;
  }

  const bangkokDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const startAt = new Date(`${bangkokDate}T${startTime}:00+07:00`);
  const endAt = new Date(`${bangkokDate}T${endTime}:00+07:00`);

  if (endAt <= startAt) {
    res.status(400).json({ message: "endTime must be later than startTime" });
    return;
  }

  try {
    const slot = await prisma.slot.create({
      data: {
        startAt,
        endAt,
        capacity: Number(capacity),
      },
    });

    res.status(201).json({ slot });
  } catch (error) {
    console.error("Create slot failed:", error);
    res.status(500).json({ message: "Cannot create slot" });
  }
});

bookingRouter.delete("/slots/:id", async (req, res) => {
  const slotId = Number(req.params.id);

  if (!Number.isInteger(slotId) || slotId <= 0) {
    res.status(400).json({ message: "Slot ID must be a positive integer" });
    return;
  }

  try {
    const slot = await prisma.slot.findUnique({
      where: { id: slotId },
      select: {
        id: true,
        _count: { select: { bookings: true } },
      },
    });

    if (!slot) {
      res.status(404).json({ message: "Slot not found" });
      return;
    }

    if (slot._count.bookings > 0) {
      res.status(409).json({ message: "Cannot delete a slot that has bookings" });
      return;
    }

    await prisma.slot.delete({ where: { id: slotId } });

    res.status(200).json({
      message: "Slot deleted successfully",
      slotId,
    });
  } catch (error) {
    console.error("Delete slot failed:", error);
    res.status(500).json({ message: "Cannot delete slot" });
  }
});

bookingRouter.post("/bookings", async (req, res) => {
  const body: unknown = req.body;

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    res.status(400).json({
      code: "INVALID_REQUEST_BODY",
      message: "Request body must be a JSON object",
    });
    return;
  }

  const { userId, slotId, note } = body as {
    userId?: unknown;
    slotId?: unknown;
    note?: unknown;
  };

  if (!Number.isInteger(userId) || Number(userId) <= 0) {
    res.status(400).json({
      code: "INVALID_USER_ID",
      message: "userId must be a positive integer",
    });
    return;
  }

  if (!Number.isInteger(slotId) || Number(slotId) <= 0) {
    res.status(400).json({
      code: "INVALID_SLOT_ID",
      message: "slotId must be a positive integer",
    });
    return;
  }

  if (note !== undefined && typeof note !== "string") {
    res.status(400).json({
      code: "INVALID_NOTE",
      message: "note must be a string",
    });
    return;
  }

  try {
    const booking = await createBooking({
      userId: Number(userId),
      slotId: Number(slotId),
      ...(note === undefined ? {} : { note }),
    });

    res.status(201).json({ booking });
  } catch (error) {
    if (error instanceof BookingError) {
      const status =
        error.code === "SLOT_NOT_FOUND" || error.code === "USER_NOT_FOUND" ? 404 : 409;

      res.status(status).json({
        code: error.code,
        message: error.message,
      });
      return;
    }

    console.error("Create booking failed:", error);
    res.status(500).json({
      code: "INTERNAL_SERVER_ERROR",
      message: "Cannot create booking",
    });
  }
});

bookingRouter.get("/bookings/:id", async (req, res) => {
  const bookingId = Number(req.params.id);

  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    res.status(400).json({
      code: "INVALID_BOOKING_ID",
      message: "Booking ID must be a positive integer",
    });
    return;
  }

  try {
    const booking = await getBookingById(bookingId);

    if (!booking) {
      res.status(404).json({
        code: "BOOKING_NOT_FOUND",
        message: "Booking not found",
      });
      return;
    }

    res.status(200).json({ booking });
  } catch (error) {
    console.error("Get booking failed:", error);
    res.status(500).json({
      code: "INTERNAL_SERVER_ERROR",
      message: "Cannot get booking",
    });
  }
});

bookingRouter.get("/users/:userId/bookings", async (req, res) => {
  const userId = Number(req.params.userId);

  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(400).json({
      code: "INVALID_USER_ID",
      message: "User ID must be a positive integer",
    });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      res.status(404).json({
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
      return;
    }

    const bookings = await getBookingsByUserId(userId);

    res.status(200).json({ userId, bookings });
  } catch (error) {
    console.error("Get user bookings failed:", error);
    res.status(500).json({
      code: "INTERNAL_SERVER_ERROR",
      message: "Cannot get user bookings",
    });
  }
});

bookingRouter.delete("/bookings/:id", async (req, res) => {
  const bookingId = Number(req.params.id);

  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    res.status(400).json({
      code: "INVALID_BOOKING_ID",
      message: "Booking ID must be a positive integer",
    });
    return;
  }

  try {
    const booking = await cancelBooking(bookingId);

    res.status(200).json({
      message: "Booking cancelled successfully",
      booking,
    });
  } catch (error) {
    if (error instanceof BookingError) {
      const status = error.code === "BOOKING_NOT_FOUND" ? 404 : 409;

      res.status(status).json({
        code: error.code,
        message: error.message,
      });
      return;
    }

    console.error("Cancel booking failed:", error);
    res.status(500).json({
      code: "INTERNAL_SERVER_ERROR",
      message: "Cannot cancel booking",
    });
  }
});

export { bookingRouter };
