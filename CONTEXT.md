# LINE Booking Context

Glossary for the LINE-based queue booking system.

## Language

**LINE User ID**:
The stable LINE Messaging API identifier for a person chatting with the official account. It is stored on `User.lineUserId` and is distinct from the database `User.id`.
_Avoid_: LINE id, userId when referring to the LINE value

**Slot**:
A bookable time window with a start time, end time, and capacity.
_Avoid_: Time, appointment time

**Booking**:
A user's confirmed reservation for one Slot.
_Avoid_: Reservation, queue item

**Booking Command**:
The LINE text command `จอง <slotId>` that chooses a Slot and immediately attempts to create a Booking.
_Avoid_: Slot selection, choose time

**Booking Notification**:
A LINE message about a Booking lifecycle event, such as confirmation, a pre-appointment reminder, or cancellation. It is distinct from a Reply Message to the user's current webhook event.
_Avoid_: Reply when referring to a proactive notification

**LINE Push Message**:
A message sent through LINE Messaging API to a LINE User ID without using a `replyToken`.
_Avoid_: Push when the LINE API message type or delivery mechanism is unclear

**Reminder**:
A Booking Notification sent before the Slot begins.
_Avoid_: Alert when referring to a scheduled pre-appointment message
