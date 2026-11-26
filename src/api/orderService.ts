import type { ErrorCode, Order } from "./types";

export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 999;

export type ChangeQuantityResult = { ok: true; order: Order } | { ok: false; error: ErrorCode };

const reject = (error: ErrorCode): ChangeQuantityResult => ({ ok: false, error });

function isValidQuantity(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= MIN_QUANTITY && value <= MAX_QUANTITY;
}

function calculateTotalCents(order: Order): number {
  return order.lines.reduce((total, line) => total + line.quantity * line.unitPriceCents, 0);
}

// Checks run in the order defined by SPEC.md and stop at the first failure.
// Nothing is written until every check has passed, so a rejection changes nothing.
export function changeLineQuantity(
  store: Map<string, Order>,
  orderId: string,
  lineId: string,
  quantity: unknown,
): ChangeQuantityResult {
  const order = store.get(orderId);
  const line = order?.lines.find((candidate) => candidate.id === lineId);
  if (!order || !line) return reject("NOT_FOUND");
  if (order.status !== "draft") return reject("ORDER_NOT_EDITABLE");
  if (!isValidQuantity(quantity)) return reject("INVALID_QUANTITY");
  if (quantity % line.packSize !== 0) return reject("NOT_PACK_MULTIPLE");

  line.quantity = quantity;
  order.totalCents = calculateTotalCents(order);
  return { ok: true, order };
}
