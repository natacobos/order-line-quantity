export type OrderStatus = "draft" | "submitted" | "shipped";

export interface OrderLine {
  id: string;
  sku: string;
  description: string;
  packSize: number; // products are sold in packs: quantity must be a multiple of this
  unitPriceCents: number;
  quantity: number;
}

export interface Order {
  id: string;
  customer: string;
  status: OrderStatus;
  lines: OrderLine[];
  totalCents: number; // sum of quantity x unitPriceCents for every line
}

export type ErrorCode = "NOT_FOUND" | "ORDER_NOT_EDITABLE" | "INVALID_QUANTITY" | "NOT_PACK_MULTIPLE";
