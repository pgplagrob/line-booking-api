import assert from "node:assert/strict";
import test from "node:test";
import {
  CANCELLED_STATUS,
  COMPLETED_STATUS,
  CONFIRMED_STATUS,
  occupiesSlotCapacity,
  summarizeBookings,
} from "./booking-status.js";

test("confirmed and completed bookings occupy Slot capacity", () => {
  assert.equal(occupiesSlotCapacity(CONFIRMED_STATUS), true);
  assert.equal(occupiesSlotCapacity(COMPLETED_STATUS), true);
  assert.equal(occupiesSlotCapacity(CANCELLED_STATUS), false);
});

test("daily summary separates waiting, completed, and cancelled bookings", () => {
  const summary = summarizeBookings([
    { status: CONFIRMED_STATUS },
    { status: CONFIRMED_STATUS },
    { status: COMPLETED_STATUS },
    { status: CANCELLED_STATUS },
  ]);

  assert.deepEqual(summary, {
    total: 3,
    waiting: 2,
    completed: 1,
  });
});
