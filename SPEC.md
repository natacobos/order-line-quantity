# Spec: change the quantity of an order line

## Story

A shop that buys from us wholesale is preparing an order. While the order is still a draft, their buyer
can change how many units of a product they want. Products are sold in packs (for example, balls come in
packs of 6), so the quantity must be a whole number of packs.

## API (Task 1)

`PATCH /orders/{orderId}/lines/{lineId}` with body `{ "quantity": <number> }`

Check in this order and stop at the first failure:

| # | When | Status | Body |
|---|---|---|---|
| 1 | The order or the line does not exist | 404 | `{ "error": "NOT_FOUND" }` |
| 2 | The order status is not `draft` | 409 | `{ "error": "ORDER_NOT_EDITABLE" }` |
| 3 | `quantity` is missing, not a whole number, or outside 1 to 999 (a string like `"12"` is not valid) | 422 | `{ "error": "INVALID_QUANTITY" }` |
| 4 | `quantity` is not a multiple of the line's `packSize` | 422 | `{ "error": "NOT_PACK_MULTIPLE" }` |
| 5 | Everything is valid | 200 | the whole updated order |

Acceptance criteria:
- On success, the line has the new quantity and `totalCents` is recalculated for the whole order.
- A rejected request changes nothing: the order looks exactly as before.

## Screen (Task 2)

`QuantityEditor` in `src/ui/QuantityEditor.tsx` lets the buyer change one line.

- A number input labelled **Quantity**, starting at the line's current quantity, and a **Save** button.
- Clicking **Save** calls `onSave` with the typed quantity as a number.
- While `onSave` has not finished, the **Save** button is disabled, so the buyer cannot send twice.
- If `onSave` returns `{ ok: false, error }`, show this message in an element with `role="alert"`:
  - `INVALID_QUANTITY`: "Enter a whole number from 1 to 999."
  - `NOT_PACK_MULTIPLE`: "Quantity must be a multiple of {packSize}." (with the line's pack size, for example 6)
  - `ORDER_NOT_EDITABLE`: "This order can no longer be changed."
  - any other code: "Something went wrong. Please try again."
- If it returns `{ ok: true }`, show "Saved" in an element with `role="status"`, and no error.
