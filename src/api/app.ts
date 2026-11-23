import express from "express";
import type { Order } from "./types";
import { createStore } from "./store";

export function createApp(store: Map<string, Order> = createStore()) {
  const app = express();
  app.use(express.json());

  app.get("/orders/:orderId", (req, res) => {
    const order = store.get(req.params.orderId);
    if (!order) {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }
    res.json(order);
  });

  // Task 1: implement this endpoint as described in SPEC.md.
  app.patch("/orders/:orderId/lines/:lineId", (_req, res) => {
    res.status(501).json({ error: "NOT_IMPLEMENTED" });
  });

  return app;
}
