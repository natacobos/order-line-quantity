// @vitest-environment jsdom
// Task 2 check: renders your QuantityEditor. Do not edit.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuantityEditor, type SaveResult } from "../src/ui/QuantityEditor";
import type { OrderLine } from "../src/api/types";

afterEach(cleanup);
const line: OrderLine = { id: "L1", sku: "BALL-5", description: "Training ball, size 5", packSize: 6, unitPriceCents: 1500, quantity: 12 };

function setup(result: SaveResult) {
  let finish: (r: SaveResult) => void = () => {};
  const onSave = vi.fn(() => new Promise<SaveResult>((resolve) => (finish = resolve)));
  render(<QuantityEditor line={line} onSave={onSave} />);
  const input = screen.getByLabelText(/quantity/i) as HTMLInputElement;
  const button = screen.getByRole("button", { name: /save/i }) as HTMLButtonElement;
  return { onSave, input, button, finish: () => act(async () => finish(result)) };
}

describe("task 2", () => {
  it("starts at the current quantity, sends the typed number and disables Save while saving", async () => {
    const s = setup({ ok: true, line: { ...line, quantity: 18 } });
    expect(s.input.value).toBe("12");
    fireEvent.change(s.input, { target: { value: "18" } });
    fireEvent.click(s.button);
    expect(s.onSave).toHaveBeenCalledWith(18);
    expect(s.button.disabled).toBe(true);
    await s.finish();
    expect(s.button.disabled).toBe(false);
  });

  it("shows the spec's message for each error code", async () => {
    const cases: [string, RegExp][] = [
      ["NOT_PACK_MULTIPLE", /multiple of 6/i],
      ["INVALID_QUANTITY", /whole number from 1 to 999/i],
      ["ORDER_NOT_EDITABLE", /can no longer be changed/i],
      ["SOMETHING_ELSE", /something went wrong/i],
    ];
    for (const [error, text] of cases) {
      const s = setup({ ok: false, error });
      fireEvent.change(s.input, { target: { value: "13" } });
      fireEvent.click(s.button);
      await s.finish();
      expect(screen.getByRole("alert").textContent ?? "").toMatch(text);
      cleanup();
    }
  });

  it("shows Saved on success, with no error", async () => {
    const s = setup({ ok: false, error: "INVALID_QUANTITY" });
    fireEvent.click(s.button);
    await s.finish();
    cleanup();
    const t = setup({ ok: true, line: { ...line, quantity: 24 } });
    fireEvent.change(t.input, { target: { value: "24" } });
    fireEvent.click(t.button);
    await t.finish();
    expect(screen.getByRole("status").textContent ?? "").toMatch(/saved/i);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
