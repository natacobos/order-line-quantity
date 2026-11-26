import express from "express";
import type { ErrorCode, Order } from "./types";
import { changeLineQuantity } from "./orderService";
import { createStore } from "./store";

const STATUS_BY_ERROR: Record<ErrorCode, number> = {
  NOT_FOUND: 404,
  ORDER_NOT_EDITABLE: 409,
  INVALID_QUANTITY: 422,
  NOT_PACK_MULTIPLE: 422,
};

function readQuantity(body: unknown): unknown {
  if (typeof body !== "object" || body === null || !("quantity" in body)) return undefined;
  return body.quantity;
}

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

  app.patch("/orders/:orderId/lines/:lineId", (req, res) => {
    const { orderId, lineId } = req.params;
    const result = changeLineQuantity(store, orderId, lineId, readQuantity(req.body));
    if (!result.ok) {
      res.status(STATUS_BY_ERROR[result.error]).json({ error: result.error });
      return;
    }
    res.json(result.order);
  });

  return app;
}
