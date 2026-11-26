import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/api/app";
import { createStore } from "../src/api/store";

it("returns an order by id", async () => {
  const res = await request(createApp()).get("/orders/SO-1001");
  expect(res.status).toBe(200);
  expect(res.body.totalCents).toBe(26000);
});

describe("PATCH /orders/:orderId/lines/:lineId", () => {
  const patch = (app: ReturnType<typeof createApp>, orderId: string, lineId: string, body: object) =>
    request(app).patch(`/orders/${orderId}/lines/${lineId}`).send(body);

  it("updates the line and recalculates the total of the whole order", async () => {
    const app = createApp();
    const res = await patch(app, "SO-1001", "L1", { quantity: 18 });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe("SO-1001");
    expect(res.body.lines).toHaveLength(2);
    expect(res.body.lines[0].quantity).toBe(18);
    expect(res.body.lines[1].quantity).toBe(20);
    expect(res.body.totalCents).toBe(18 * 1500 + 20 * 400);

    const again = await request(app).get("/orders/SO-1001");
    expect(again.body).toEqual(res.body);
  });

  it("accepts the smallest and the largest valid pack multiples", async () => {
    const store = createStore();
    const order = store.get("SO-1001");
    if (!order) throw new Error("fixture missing");
    order.lines[0].packSize = 1;
    const app = createApp(store);

    expect((await patch(app, "SO-1001", "L1", { quantity: 1 })).status).toBe(200);
    expect((await patch(app, "SO-1001", "L1", { quantity: 999 })).status).toBe(200);
  });

  it("returns 404 when the order does not exist", async () => {
    const res = await patch(createApp(), "SO-9999", "L1", { quantity: 6 });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "NOT_FOUND" });
  });

  it("returns 404 when the line does not exist in an existing order", async () => {
    const res = await patch(createApp(), "SO-1001", "L9", { quantity: 6 });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "NOT_FOUND" });
  });

  it("returns 404 before 409 when the line is missing in a non-draft order", async () => {
    const res = await patch(createApp(), "SO-1002", "L9", { quantity: 8 });
    expect(res.status).toBe(404);
  });

  it.each([{ quantity: 8 }, { quantity: -1 }, { quantity: 5 }, {}])(
    "returns 409 for a non-draft order before looking at the body %j",
    async (body) => {
      const res = await patch(createApp(), "SO-1002", "L1", body);
      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: "ORDER_NOT_EDITABLE" });
    },
  );

  it.each([
    {},
    { quantity: null },
    { quantity: "12" },
    { quantity: true },
    { quantity: [12] },
    { quantity: 6.5 },
    { quantity: 0 },
    { quantity: -6 },
    { quantity: 1000 },
    { quantity: 1002 },
  ])("returns 422 INVALID_QUANTITY for body %j", async (body) => {
    const res = await patch(createApp(), "SO-1001", "L1", body);
    expect(res.status).toBe(422);
    expect(res.body).toEqual({ error: "INVALID_QUANTITY" });
  });

  it("returns 422 INVALID_QUANTITY when the body is a JSON array", async () => {
    const res = await patch(createApp(), "SO-1001", "L1", [12]);
    expect(res.status).toBe(422);
    expect(res.body).toEqual({ error: "INVALID_QUANTITY" });
  });

  it.each([1, 13, 999])("returns 422 NOT_PACK_MULTIPLE for quantity %d with pack size 6", async (quantity) => {
    const res = await patch(createApp(), "SO-1001", "L1", { quantity });
    expect(res.status).toBe(422);
    expect(res.body).toEqual({ error: "NOT_PACK_MULTIPLE" });
  });

  it("leaves the order exactly as before when a request is rejected", async () => {
    const store = createStore();
    const app = createApp(store);
    const before = JSON.stringify([...store]);

    await patch(app, "SO-1001", "L1", { quantity: 13 });
    await patch(app, "SO-1001", "L1", { quantity: 0 });
    await patch(app, "SO-1001", "L1", { quantity: "12" });
    await patch(app, "SO-1001", "L9", { quantity: 6 });
    await patch(app, "SO-1002", "L1", { quantity: 4 });

    expect(JSON.stringify([...store])).toBe(before);
  });

  // --- added by QA review ---

  it("updates a line that is not the first one and leaves the other lines alone", async () => {
    const app = createApp();
    const res = await patch(app, "SO-1001", "L2", { quantity: 50 });

    expect(res.status).toBe(200);
    expect(res.body.lines[0]).toMatchObject({ id: "L1", quantity: 12 });
    expect(res.body.lines[1]).toMatchObject({ id: "L2", quantity: 50 });
    expect(res.body.totalCents).toBe(12 * 1500 + 50 * 400);
  });

  it("returns 409 for every non-draft status, not only submitted", async () => {
    const store = createStore();
    const order = store.get("SO-1001");
    if (!order) throw new Error("fixture missing");
    order.status = "shipped";
    const before = JSON.stringify(order);

    const res = await patch(createApp(store), "SO-1001", "L1", { quantity: 18 });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "ORDER_NOT_EDITABLE" });
    expect(JSON.stringify(order)).toBe(before);
  });

  it.each([
    ["SO-9999", "L1"],
    ["SO-1001", "L9"],
  ])("returns 404 before looking at an invalid quantity (%s/%s)", async (orderId, lineId) => {
    for (const body of [{}, { quantity: "12" }, { quantity: 0 }, { quantity: 13 }]) {
      const res = await patch(createApp(), orderId, lineId, body);
      expect([res.status, res.body], JSON.stringify(body)).toEqual([404, { error: "NOT_FOUND" }]);
    }
  });

  it("stores the boundary quantities it accepts and keeps a later rejection from undoing them", async () => {
    const store = createStore();
    const order = store.get("SO-1001");
    if (!order) throw new Error("fixture missing");
    order.lines[0].packSize = 1;
    const app = createApp(store);

    const max = await patch(app, "SO-1001", "L1", { quantity: 999 });
    expect(max.body.lines[0].quantity).toBe(999);
    expect(max.body.totalCents).toBe(999 * 1500 + 20 * 400);

    expect((await patch(app, "SO-1001", "L1", { quantity: 1000 })).status).toBe(422);
    const after = await request(app).get("/orders/SO-1001");
    expect(after.body).toEqual(max.body);
  });
});
