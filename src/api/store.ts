import type { Order } from "./types";

// In-memory data. createStore() gives each test its own fresh copy.
export function createStore(): Map<string, Order> {
  const orders: Order[] = [
    {
      id: "SO-1001",
      customer: "Northside Sports (wholesale)",
      status: "draft",
      lines: [
        { id: "L1", sku: "BALL-5", description: "Training ball, size 5", packSize: 6, unitPriceCents: 1500, quantity: 12 },
        { id: "L2", sku: "SOCK-M", description: "Running socks, M", packSize: 10, unitPriceCents: 400, quantity: 20 },
      ],
      totalCents: 12 * 1500 + 20 * 400,
    },
    {
      id: "SO-1002",
      customer: "Lakeview Outdoor (wholesale)",
      status: "submitted",
      lines: [{ id: "L1", sku: "CAP-1", description: "Team cap", packSize: 4, unitPriceCents: 900, quantity: 8 }],
      totalCents: 8 * 900,
    },
  ];
  return new Map(orders.map((o) => [o.id, o]));
}
