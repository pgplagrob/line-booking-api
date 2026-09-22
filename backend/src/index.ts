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
import { getOrCreateUser } from "./services/user.js";

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

type LineFlexContainer = {
  type: "bubble" | "carousel";
  [key: string]: unknown;
};

type LineReplyMessage =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "flex";
      altText: string;
      contents: LineFlexContainer;
    };

type AvailableSlot = {
  id: number;
  startAt: Date;
  endAt: Date;
  capacity: number;
  createdAt: Date;
  updatedAt: Date;
  bookedCount: number;
  remaining: number;
};

type BookingWithSlot = {
  id: number;
  bookingCode: string;
  status: string;
  slot: {
    startAt: Date;
    endAt: Date;
  };
};

function createTextMessage(text: string): LineReplyMessage {
  return {
    type: "text",
    text,
  };
}

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
  message: LineReplyMessage,
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
        messages: [message],
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

function isQueueRequest(text: string): boolean {
  return ["คิว", "ดูคิว"].includes(text.trim());
}

function isBookingStatusRequest(text: string): boolean {
  return ["สถานะ", "ดูการจอง", "จองของฉัน"].includes(text.trim());
}

function parseBookingSlotId(text: string): number | undefined {
  const match = /^จอง\s+(\d+)$/u.exec(text.trim());
  const rawSlotId = match?.[1];

  if (rawSlotId === undefined) {
    return undefined;
  }

  const slotId = Number(rawSlotId);

  return Number.isInteger(slotId) && slotId > 0 ? slotId : undefined;
}

function isBookingRequest(text: string): boolean {
  return text.trim().startsWith("จอง");
}

function formatSlotTime(slot: { startAt: Date; endAt: Date }): string {
  const start = slot.startAt.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
  const end = slot.endAt.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });

  return `${start} - ${end}`;
}

async function getSlotsWithAvailability(): Promise<AvailableSlot[]> {
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

  return slots
    .map(({ bookings, ...slot }) => ({
      ...slot,
      bookedCount: bookings.length,
      remaining: Math.max(slot.capacity - bookings.length, 0),
    }));
}

async function getAvailableSlots(): Promise<AvailableSlot[]> {
  const slots = await getSlotsWithAvailability();

  return slots.filter((slot) => slot.remaining > 0);
}

function createAvailableSlotsFlexMessage(
  slots: AvailableSlot[],
): LineReplyMessage {
  const slotContents = slots.slice(0, 10).flatMap((slot) => [
    {
      type: "separator",
      margin: "md",
    },
    {
      type: "box",
      layout: "vertical",
      margin: "md",
      spacing: "sm",
      contents: [
        {
          type: "text",
          text: `Slot ID ${slot.id}`,
          weight: "bold",
          size: "md",
        },
        {
          type: "text",
          text: formatSlotTime(slot),
          size: "sm",
          color: "#555555",
        },
        {
          type: "text",
          text: `เหลือ ${slot.remaining} ที่`,
          size: "sm",
          color: "#555555",
        },
        {
          type: "button",
          style: "primary",
          height: "sm",
          margin: "sm",
          action: {
            type: "message",
            label: "จองคิว",
            text: `จอง ${slot.id}`,
          },
        },
      ],
    },
  ]);

  return {
    type: "flex",
    altText: "คิวที่ว่าง",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "คิวที่ว่าง",
            weight: "bold",
            size: "lg",
          },
          {
            type: "text",
            text: 'กด "จองคิว" ในเวลาที่ต้องการ',
            size: "sm",
            color: "#666666",
            wrap: true,
            margin: "sm",
          },
          ...slotContents,
        ],
      },
    },
  };
}

function createBookingConfirmationFlexMessage(booking: {
  id: number;
  bookingCode: string;
  slot: {
    startAt: Date;
    endAt: Date;
  };
}): LineReplyMessage {
  return {
    type: "flex",
    altText: "จองคิวสำเร็จ",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "จองคิวสำเร็จ",
            weight: "bold",
            size: "lg",
          },
          {
            type: "separator",
            margin: "md",
          },
          {
            type: "box",
            layout: "vertical",
            margin: "md",
            spacing: "sm",
            contents: [
              {
                type: "text",
                text: `เวลา: ${formatSlotTime(booking.slot)}`,
                wrap: true,
              },
              {
                type: "text",
                text: `รหัสการจอง: ${booking.bookingCode}`,
                wrap: true,
                size: "sm",
                color: "#555555",
              },
              {
                type: "text",
                text: `Ref: ${booking.id}`,
                size: "xs",
                color: "#999999",
              },
            ],
          },
        ],
      },
    },
  };
}

function createBookingStatusFlexMessage(
  bookings: BookingWithSlot[],
): LineReplyMessage {
  const bookingContents = bookings.slice(0, 10).flatMap((booking) => [
    {
      type: "separator",
      margin: "md",
    },
    {
      type: "box",
      layout: "vertical",
      margin: "md",
      spacing: "sm",
      contents: [
        {
          type: "text",
          text: `เวลา: ${formatSlotTime(booking.slot)}`,
          weight: "bold",
          size: "sm",
          wrap: true,
        },
        {
          type: "text",
          text: `สถานะ: ${booking.status}`,
          size: "sm",
          color: booking.status === "CONFIRMED" ? "#1DB446" : "#999999",
        },
        {
          type: "text",
          text: `รหัสการจอง: ${booking.bookingCode}`,
          size: "xs",
          color: "#555555",
          wrap: true,
        },
        {
          type: "text",
          text: `Ref: ${booking.id}`,
          size: "xs",
          color: "#999999",
        },
      ],
    },
  ]);

  return {
    type: "flex",
    altText: "สถานะการจอง",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "สถานะการจอง",
            weight: "bold",
            size: "lg",
          },
          ...bookingContents,
        ],
      },
    },
  };
}

function getBookingErrorMessage(error: BookingError): string {
  if (error.code === "SLOT_NOT_FOUND") {
    return "ไม่พบ Slot นี้ กรุณาตรวจสอบรหัสอีกครั้ง";
  }

  if (error.code === "DUPLICATE_BOOKING") {
    return "คุณจอง Slot นี้ไว้แล้ว";
  }

  if (error.code === "SLOT_FULL") {
    return "Slot นี้เต็มแล้ว กรุณาเลือกเวลาอื่น";
  }

  if (error.code === "USER_NOT_FOUND") {
    return "ไม่พบข้อมูลผู้ใช้ กรุณาลองใหม่อีกครั้ง";
  }

  return "ระบบขัดข้องชั่วคราว กรุณาลองใหม่ภายหลัง";
}

async function createLineBookingMessage(
  lineUserId: string,
  slotId: number,
): Promise<LineReplyMessage> {
  const user = await getOrCreateUser(lineUserId);

  try {
    const booking = await createBooking({
      userId: user.id,
      slotId,
    });

    return createBookingConfirmationFlexMessage(booking);
  } catch (error) {
    if (error instanceof BookingError) {
      return createTextMessage(getBookingErrorMessage(error));
    }

    throw error;
  }
}

async function getLineBookingStatusMessage(
  lineUserId: string | undefined,
): Promise<LineReplyMessage> {
  if (lineUserId === undefined) {
    return createTextMessage("ไม่พบ LINE User ID จึงยังดูสถานะการจองไม่ได้");
  }

  const user = await getOrCreateUser(lineUserId);
  const bookings = await getBookingsByUserId(user.id);

  if (bookings.length === 0) {
    return createTextMessage("ยังไม่พบการจองของคุณ");
  }

  return createBookingStatusFlexMessage(bookings);
}

async function getLineReplyMessage(
  text: string,
  lineUserId: string | undefined,
): Promise<LineReplyMessage> {
  if (isQueueRequest(text)) {
    const slots = await getAvailableSlots();

    if (slots.length === 0) {
      return createTextMessage("ตอนนี้ยังไม่มีคิวว่าง");
    }

    return createAvailableSlotsFlexMessage(slots);
  }

  if (isBookingStatusRequest(text)) {
    return getLineBookingStatusMessage(lineUserId);
  }

  if (isBookingRequest(text)) {
    const slotId = parseBookingSlotId(text);

    if (slotId === undefined) {
      return createTextMessage('ใช้รูปแบบ "จอง <slotId>" เช่น จอง 3');
    }

    if (lineUserId === undefined) {
      return createTextMessage("ไม่พบ LINE User ID จึงยังจองคิวไม่ได้");
    }

    return createLineBookingMessage(lineUserId, slotId);
  }

  return createTextMessage('ใช้ "คิว" เพื่อดูคิว หรือ "จอง <slotId>" เพื่อจอง');
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
          const replyMessage = await getLineReplyMessage(text, userId);

          await replyLineMessage(validReplyToken, replyMessage);
          console.log("LINE reply sent");
        } catch (error) {
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
    const slots = await getSlotsWithAvailability();

    res.status(200).json({ slots });
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
