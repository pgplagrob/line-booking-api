export type LineFlexContainer = {
  type: "bubble" | "carousel";
  [key: string]: unknown;
};

export type LineReplyMessage =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "flex";
      altText: string;
      contents: LineFlexContainer;
    };

export type AvailableSlot = {
  id: number;
  startAt: Date;
  endAt: Date;
  capacity: number;
  createdAt: Date;
  updatedAt: Date;
  bookedCount: number;
  remaining: number;
};

export type BookingWithSlot = {
  id: number;
  bookingCode: string;
  status: string;
  slot: {
    startAt: Date;
    endAt: Date;
  };
};
