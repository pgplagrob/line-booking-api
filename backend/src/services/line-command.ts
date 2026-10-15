export function parseBookingSlotId(text: string): number | undefined {
  const match = /^จอง\s*(\d+)$/u.exec(text.trim());
  const rawSlotId = match?.[1];

  if (rawSlotId === undefined) {
    return undefined;
  }

  const slotId = Number(rawSlotId);
  return Number.isInteger(slotId) && slotId > 0 ? slotId : undefined;
}
