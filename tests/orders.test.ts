import request from "supertest";
import { expect, it } from "vitest";
import { createApp } from "../src/api/app";

it("returns an order by id", async () => {
  const res = await request(createApp()).get("/orders/SO-1001");
  expect(res.status).toBe(200);
  expect(res.body.totalCents).toBe(26000);
});

// Add your own tests here if you want to.
