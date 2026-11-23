// Task 1 check: calls your endpoint with fresh data. Do not edit.
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/api/app";
import { createStore } from "../src/api/store";

const patch = (app: ReturnType<typeof createApp>, order: string, line: string, body: unknown) =>
  request(app).patch(`/orders/${order}/lines/${line}`).send(body as object);

describe("task 1", () => {
  it("404 when the order or the line does not exist", async () => {
    const app = createApp(createStore());
    const a = await patch(app, "SO-9999", "L1", { quantity: 6 });
    const b = await patch(app, "SO-1001", "L9", { quantity: 6 });
    expect([a.status, a.body.error, b.status, b.body.error]).toEqual([404, "NOT_FOUND", 404, "NOT_FOUND"]);
  });

  it("409 when the order is not a draft, before checking the quantity", async () => {
    const app = createApp(createStore());
    const a = await patch(app, "SO-1002", "L1", { quantity: 8 });
    const b = await patch(app, "SO-1002", "L1", { quantity: -1 });
    expect([a.status, a.body.error, b.status, b.body.error]).toEqual([409, "ORDER_NOT_EDITABLE", 409, "ORDER_NOT_EDITABLE"]);
  });

  it("422 INVALID_QUANTITY for a missing, non-whole, text or out-of-range quantity", async () => {
    const app = createApp(createStore());
    for (const body of [{}, { quantity: 6.5 }, { quantity: "12" }, { quantity: 0 }, { quantity: 1002 }, { quantity: null }]) {
      const r = await patch(app, "SO-1001", "L1", body);
      expect([r.status, r.body.error], JSON.stringify(body)).toEqual([422, "INVALID_QUANTITY"]);
    }
  });

  it("422 NOT_PACK_MULTIPLE when the quantity is not a whole number of packs", async () => {
    const app = createApp(createStore());
    const r = await patch(app, "SO-1001", "L1", { quantity: 13 });
    expect([r.status, r.body.error]).toEqual([422, "NOT_PACK_MULTIPLE"]);
  });

  it("200 with the updated line and the whole order total recalculated", async () => {
    const app = createApp(createStore());
    const r = await patch(app, "SO-1001", "L2", { quantity: 50 });
    expect(r.status).toBe(200);
    expect(r.body.lines.find((l: { id: string }) => l.id === "L2").quantity).toBe(50);
    expect(r.body.totalCents).toBe(12 * 1500 + 50 * 400);
    const again = await request(app).get("/orders/SO-1001");
    expect(again.body.totalCents).toBe(12 * 1500 + 50 * 400);
  });

  it("a rejected request changes nothing", async () => {
    const store = createStore();
    const app = createApp(store);
    const before = JSON.stringify(store.get("SO-1001"));
    const statuses = [];
    for (const quantity of [13, 0, "12"]) statuses.push((await patch(app, "SO-1001", "L1", { quantity })).status);
    expect(statuses).toEqual([422, 422, 422]);
    expect(JSON.stringify(store.get("SO-1001"))).toBe(before);
  });
});
