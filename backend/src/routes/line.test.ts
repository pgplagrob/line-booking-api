import assert from "node:assert/strict";
import test from "node:test";
import { parseBookingSlotId } from "../services/line-command.js";

test("accepts a LINE booking command without a space before the Slot ID", () => {
  assert.equal(parseBookingSlotId("จอง3"), 3);
});

test("accepts the documented LINE booking command with a space", () => {
  assert.equal(parseBookingSlotId("จอง 3"), 3);
});

test("rejects a booking command without a Slot ID", () => {
  assert.equal(parseBookingSlotId("จอง"), undefined);
});
