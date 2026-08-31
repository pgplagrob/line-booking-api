import express from "express";
import "dotenv/config";
import crypto from "node:crypto";
import { prisma } from "./lib/prisma.js";
import {
  BookingError,
  cancelBooking,
  createBooking,
  getBookingById,
  getBookingsByUserId,
} from "./services/booking.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const lineChannelSecret = process.env.LINE_CHANNEL_SECRET;
const lineChannelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

if (!lineChannelSecret) {
  throw new Error("LINE_CHANNEL_SECRET is not defined");
}

if (!lineChannelAccessToken) {
  throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not defined");
}

const verifiedLineChannelSecret = lineChannelSecret;
const verifiedLineChannelAccessToken = lineChannelAccessToken;

function verifyLineSignature(
  rawBody: Buffer,
  signature: string,
): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", verifiedLineChannelSecret)
    .update(rawBody)
    .digest();

  const receivedSignature = Buffer.from(signature, "base64");

  return (
    receivedSignature.length === expectedSignature.length &&
    crypto.timingSafeEqual(receivedSignature, expectedSignature)
  );
}

async function replyLineMessage(
  replyToken: string,
  text: string,
): Promise<void> {
  const response = await fetch(
    "https://api.line.me/v2/bot/message/reply",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${verifiedLineChannelAccessToken}`,
      },
      body: JSON.stringify({
        replyToken,
        messages: [
          {
            type: "text",
            text,
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(
      `LINE Reply API failed: ${response.status} ${errorBody}`,
    );
  }
}

app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
 async (req, res) => {
    const signature = req.get("x-line-signature");

    if (
      !signature ||
      !Buffer.isBuffer(req.body) ||
      !verifyLineSignature(req.body, signature)
    ) {
      res.status(401).json({
        message: "Invalid LINE webhook signature",
      });
      return;
    }

    let body: unknown;

    try {
      body = JSON.parse(req.body.toString("utf8"));
    } catch {
      res.status(400).json({
        message: "Invalid JSON body",
      });
      return;
    }

    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      res.status(400).json({
        message: "Webhook body must be a JSON object",
      });
      return;
    }

    const { events } = body as { events?: unknown };

    if (!Array.isArray(events)) {
      res.status(400).json({
        message: "Webhook events must be an array",
      });
      return;
    }

    for (const event of events) {
      if (event === null || typeof event !== "object" || Array.isArray(event)) {
        continue;
      }

      const { type, source, message, replyToken } = event as {
        type?: unknown;
        source?: unknown;
        message?: unknown;
        replyToken?: unknown;
      };

      const validReplyToken =
        typeof replyToken === "string" ? replyToken : undefined;

      const userId =
        source !== null &&
        typeof source === "object" &&
        !Array.isArray(source) &&
        typeof (source as { userId?: unknown }).userId === "string"
          ? (source as { userId: string }).userId
          : undefined;

      const text =
        type === "message" &&
        message !== null &&
        typeof message === "object" &&
        !Array.isArray(message) &&
        (message as { type?: unknown }).type === "text" &&
        typeof (message as { text?: unknown }).text === "string"
          ? (message as { text: string }).text
          : undefined;

      console.log("LINE webhook event:",
         {
        type,
        userId,
        text,
      });
      if (type === "message" && text !== undefined && validReplyToken) {
      try {
        await replyLineMessage(validReplyToken, "Hello");
        console.log("LINE reply sent");
      }     catch (error) {
        console.error("LINE Reply API error:", error);
      }
    }

    }

    res.status(200).json({
      message: "OK",
      eventCount: events.length,
    });
  },
);

app.use(express.json());

app.get("/", (_req, res) => {
  res.status(200).json({
    message: "LINE API server is running!",
  });
});

app.get("/health/db", async (_req, res) => {
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
app.get("/slots", async (_req, res) => {
  try {
    const slots = await prisma.slot.findMany({
      orderBy: {
        startAt: "asc",
      },
      include: {
        bookings: {
          where: {
            status: "CONFIRMED",
          },
          select: {
            id: true,
          },
        },
      },
    });

    const result = slots.map(({ bookings, ...slot }) => ({
      ...slot,
      bookedCount: bookings.length,
      remaining: Math.max(slot.capacity - bookings.length, 0),
    }));

    res.status(200).json({ slots: result });
  } catch (error) {
    console.error("Get slots failed:", error);

    res.status(500).json({
      message: "Cannot get slots",
    });
  }
});
app.post("/slots", async (req, res) => {
  const body: unknown = req.body;

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    res.status(400).json({
      message: "Request body must be a JSON object",
    });
    return;
  }

  const { date, startTime, endTime, capacity } = body as {
    date?: unknown;
    startTime?: unknown;
    endTime?: unknown;
    capacity?: unknown;
  };

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

  if (
    typeof date !== "string" ||
    typeof startTime !== "string" ||
    typeof endTime !== "string" ||
    !datePattern.test(date) ||
    !timePattern.test(startTime) ||
    !timePattern.test(endTime)
  ) {
    res.status(400).json({
      message: "Use date YYYY-MM-DD and time HH:mm",
    });
    return;
  }

  if (!Number.isInteger(capacity) || Number(capacity) <= 0) {
    res.status(400).json({
      message: "capacity must be a positive integer",
    });
    return;
  }

  const startAt = new Date(`${date}T${startTime}:00+07:00`);
  const endAt = new Date(`${date}T${endTime}:00+07:00`);

  if (endAt <= startAt) {
    res.status(400).json({
      message: "endTime must be later than startTime",
    });
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

    res.status(500).json({
      message: "Cannot create slot",
    });
  }
});

app.delete("/slots/:id", async (req, res) => {
  const slotId = Number(req.params.id);

  if (!Number.isInteger(slotId) || slotId <= 0) {
    res.status(400).json({
      message: "Slot ID must be a positive integer",
    });
    return;
  }

  try {
    const slot = await prisma.slot.findUnique({
      where: {
        id: slotId,
      },
      select: {
        id: true,
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });

    if (!slot) {
      res.status(404).json({
        message: "Slot not found",
      });
      return;
    }

    if (slot._count.bookings > 0) {
      res.status(409).json({
        message: "Cannot delete a slot that has bookings",
      });
      return;
    }

    await prisma.slot.delete({
      where: {
        id: slotId,
      },
    });

    res.status(200).json({
      message: "Slot deleted successfully",
      slotId,
    });
  } catch (error) {
    console.error("Delete slot failed:", error);

    res.status(500).json({
      message: "Cannot delete slot",
    });
  }
});

app.post("/bookings", async (req, res) => {
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
        error.code === "SLOT_NOT_FOUND" || error.code === "USER_NOT_FOUND"
          ? 404
          : 409;

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

app.get("/bookings/:id", async (req, res) => {
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

app.get("/users/:userId/bookings", async (req, res) => {
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
      where: {
        id: userId,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      res.status(404).json({
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
      return;
    }

    const bookings = await getBookingsByUserId(userId);

    res.status(200).json({
      userId,
      bookings,
    });
  } catch (error) {
    console.error("Get user bookings failed:", error);

    res.status(500).json({
      code: "INTERNAL_SERVER_ERROR",
      message: "Cannot get user bookings",
    });
  }
});

app.delete("/bookings/:id", async (req, res) => {
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

async function startServer() {
  await prisma.$connect();

  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

async function shutdown(signal: string) {
  console.log(`${signal} received. Shutting down...`);

  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

startServer().catch(async (error) => {
  console.error("Cannot start server:", error);
  await prisma.$disconnect();
  process.exit(1);
});
