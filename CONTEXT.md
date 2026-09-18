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
