// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { OrderLine } from "../src/api/types";
import { QuantityEditor, type SaveResult } from "../src/ui/QuantityEditor";

afterEach(cleanup);

const line: OrderLine = {
  id: "L1",
  sku: "BALL-5",
  description: "Training ball, size 5",
  packSize: 6,
  unitPriceCents: 1500,
  quantity: 12,
};

function setup() {
  let resolve: (result: SaveResult) => void = () => {};
  let reject: (reason: Error) => void = () => {};
  const onSave = vi.fn(
    (_quantity: number) =>
      new Promise<SaveResult>((res, rej) => {
        resolve = res;
        reject = rej;
      }),
  );
  render(<QuantityEditor line={line} onSave={onSave} />);
  const input = screen.getByLabelText<HTMLInputElement>("Quantity");
  const button = screen.getByRole<HTMLButtonElement>("button", { name: "Save" });
  const type = (value: string) => fireEvent.change(input, { target: { value } });
  return {
    onSave,
    input,
    button,
    type,
    resolve: (result: SaveResult) => act(async () => resolve(result)),
    reject: () => act(async () => reject(new Error("network down"))),
  };
}

const saved = (quantity: number): SaveResult => ({ ok: true, line: { ...line, quantity } });

describe("QuantityEditor", () => {
  it("renders a labelled number input starting at the current quantity", () => {
    const { input, button } = setup();
    expect(input.type).toBe("number");
    expect(input.value).toBe("12");
    expect(button.disabled).toBe(false);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("calls onSave with the typed quantity as a number", () => {
    const { onSave, type, button } = setup();
    type("18");
    fireEvent.click(button);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(18);
  });

  it("disables Save while saving so the buyer cannot send twice", async () => {
    const { onSave, button, input, resolve } = setup();
    fireEvent.click(button);
    expect(button.disabled).toBe(true);

    fireEvent.click(button);
    fireEvent.submit(input);
    expect(onSave).toHaveBeenCalledTimes(1);

    await resolve(saved(12));
    expect(button.disabled).toBe(false);
  });

  it.each([
    ["INVALID_QUANTITY", "Enter a whole number from 1 to 999."],
    ["NOT_PACK_MULTIPLE", "Quantity must be a multiple of 6."],
    ["ORDER_NOT_EDITABLE", "This order can no longer be changed."],
    ["NOT_FOUND", "Something went wrong. Please try again."],
    ["SOMETHING_ELSE", "Something went wrong. Please try again."],
  ])("shows the message for %s", async (error, message) => {
    const { button, resolve } = setup();
    fireEvent.click(button);
    await resolve({ ok: false, error });
    expect(screen.getByRole("alert").textContent).toBe(message);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows Saved with no error on success", async () => {
    const { button, type, resolve } = setup();
    type("24");
    fireEvent.click(button);
    await resolve(saved(24));
    expect(screen.getByRole("status").textContent).toBe("Saved");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("replaces a previous error with Saved after a successful retry", async () => {
    const { button, type, resolve } = setup();
    type("13");
    fireEvent.click(button);
    await resolve({ ok: false, error: "NOT_PACK_MULTIPLE" });
    expect(screen.getByRole("alert")).toBeTruthy();

    type("18");
    fireEvent.click(button);
    expect(screen.queryByRole("alert")).toBeNull();
    await resolve(saved(18));
    expect(screen.getByRole("status").textContent).toBe("Saved");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("replaces a previous Saved with the error of a failed retry", async () => {
    const { button, resolve } = setup();
    fireEvent.click(button);
    await resolve(saved(12));
    fireEvent.click(button);
    await resolve({ ok: false, error: "ORDER_NOT_EDITABLE" });
    expect(screen.getByRole("alert").textContent).toBe("This order can no longer be changed.");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows the invalid quantity message without calling onSave when the input is empty", () => {
    const { onSave, type, button } = setup();
    type("");
    fireEvent.click(button);
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toBe("Enter a whole number from 1 to 999.");
    expect(button.disabled).toBe(false);
  });

  it("shows the generic message and re-enables Save when onSave rejects", async () => {
    const { button, reject } = setup();
    fireEvent.click(button);
    await reject();
    expect(screen.getByRole("alert").textContent).toBe("Something went wrong. Please try again.");
    expect(button.disabled).toBe(false);
  });

  // --- added by QA review ---

  it("sends a decimal exactly as typed instead of truncating it", () => {
    const { onSave, type, button } = setup();
    type("12.5");
    fireEvent.click(button);
    expect(onSave).toHaveBeenCalledWith(12.5);
  });

  it("re-enables Save after an error result so the buyer can retry", async () => {
    const { onSave, type, button, resolve } = setup();
    type("13");
    fireEvent.click(button);
    await resolve({ ok: false, error: "NOT_PACK_MULTIPLE" });
    expect(button.disabled).toBe(false);

    type("18");
    fireEvent.click(button);
    expect(onSave).toHaveBeenCalledTimes(2);
    expect(onSave).toHaveBeenLastCalledWith(18);
  });

  it("hides a previous Saved while the next save is still pending", async () => {
    const { button, resolve } = setup();
    fireEvent.click(button);
    await resolve(saved(12));
    expect(screen.getByRole("status")).toBeTruthy();

    fireEvent.click(button);
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("clears the local empty-input error once a valid quantity is saved", async () => {
    const { onSave, type, button, resolve } = setup();
    type("");
    fireEvent.click(button);
    expect(screen.getByRole("alert")).toBeTruthy();

    type("18");
    fireEvent.click(button);
    expect(onSave).toHaveBeenCalledWith(18);
    await resolve(saved(18));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("Saved");
  });
});

describe("QuantityEditor after QA fixes", () => {
  it("steps the input in whole packs", () => {
    const { input } = setup();
    input.stepUp();
    expect(input.value).toBe("18");
    input.stepDown();
    input.stepDown();
    expect(input.value).toBe("6");
  });

  it("sends only once when two submits happen before a re-render", () => {
    const { onSave, input } = setup();
    act(() => {
      fireEvent.submit(input);
      fireEvent.submit(input);
    });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("clears Saved as soon as the buyer edits the quantity again", async () => {
    const { button, type, resolve } = setup();
    fireEvent.click(button);
    await resolve(saved(12));
    type("18");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("marks the input invalid only for quantity errors and links it to the alert", async () => {
    const first = setup();
    fireEvent.click(first.button);
    await first.resolve({ ok: false, error: "NOT_PACK_MULTIPLE" });
    expect(first.input.getAttribute("aria-invalid")).toBe("true");
    expect(first.input.getAttribute("aria-describedby")).toBe(screen.getByRole("alert").id);
    cleanup();

    const second = setup();
    fireEvent.click(second.button);
    await second.resolve({ ok: false, error: "ORDER_NOT_EDITABLE" });
    expect(second.input.getAttribute("aria-invalid")).toBe("false");
  });
});
