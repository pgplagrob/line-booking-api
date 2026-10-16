import crypto from "node:crypto";
import express from "express";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import {
  BookingError,
  createBooking,
  getAvailableSlots,
  getBookingsByUserId,
  getSlotsWithAvailability,
} from "../services/booking.js";
import { parseBookingSlotId } from "../services/line-command.js";
import { getOrCreateUser } from "../services/user.js";
import type { LineReplyMessage, BookingWithSlot, AvailableSlot } from "../types/line.js";

const lineRouter = express.Router();

function verifyLineSignature(rawBody: Buffer, signature: string): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", env.lineChannelSecret)
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
  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.lineChannelAccessToken}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [message],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`LINE Reply API failed: ${response.status} ${errorBody}`);
  }
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

function createTextMessage(text: string): LineReplyMessage {
  return {
    type: "text",
    text,
  };
}

function isQueueRequest(text: string): boolean {
  return ["คิว", "ดูคิว"].includes(text.trim());
}

function isBookingStatusRequest(text: string): boolean {
  return ["สถานะ", "ดูการจอง", "จองของฉัน"].includes(text.trim());
}

function isBookingRequest(text: string): boolean {
  return text.trim().startsWith("จอง");
}

function createAvailableSlotsFlexMessage(slots: AvailableSlot[]): LineReplyMessage {
  const slotContents = slots.slice(0, 10).flatMap((slot) => [
    { type: "separator", margin: "md" },
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
          { type: "separator", margin: "md" },
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

function createBookingStatusFlexMessage(bookings: BookingWithSlot[]): LineReplyMessage {
  const bookingContents = bookings.slice(0, 10).flatMap((booking) => [
    { type: "separator", margin: "md" },
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
      return createTextMessage(
        'ยังไม่ได้ระบุ Slot ID: พิมพ์ "คิว" เพื่อดูคิว แล้วกดปุ่มจอง หรือพิมพ์ "จอง 3"',
      );
    }

    if (lineUserId === undefined) {
      return createTextMessage("ไม่พบ LINE User ID จึงยังจองคิวไม่ได้");
    }

    return createLineBookingMessage(lineUserId, slotId);
  }

  return createTextMessage('ใช้ "คิว" เพื่อดูคิว หรือ "จอง <slotId>" เพื่อจอง');
}

lineRouter.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.get("x-line-signature");

    if (
      !signature ||
      !Buffer.isBuffer(req.body) ||
      !verifyLineSignature(req.body, signature)
    ) {
      res.status(401).json({ message: "Invalid LINE webhook signature" });
      return;
    }

    let body: unknown;

    try {
      body = JSON.parse(req.body.toString("utf8"));
    } catch {
      res.status(400).json({ message: "Invalid JSON body" });
      return;
    }

    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      res.status(400).json({ message: "Webhook body must be a JSON object" });
      return;
    }

    const { events } = body as { events?: unknown };

    if (!Array.isArray(events)) {
      res.status(400).json({ message: "Webhook events must be an array" });
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

      const validReplyToken = typeof replyToken === "string" ? replyToken : undefined;
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

      console.log("LINE webhook event:", { type, userId, text });

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

    res.status(200).json({ message: "OK", eventCount: events.length });
  },
);

export { lineRouter };
