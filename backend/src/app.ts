import express from "express";
import { bookingRouter } from "./routes/booking.js";
import { lineRouter } from "./routes/line.js";

export function createApp() {
  const app = express();

  app.use(express.json());

  app.get("/", (_req, res) => {
    res.status(200).json({
      message: "LINE API server is running!",
    });
  });

  app.use(bookingRouter);
  app.use(lineRouter);

  return app;
}
