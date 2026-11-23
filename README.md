# Change the quantity of an order line

Our team writes a short spec before building a feature. `SPEC.md` is the spec for this one: a buyer
changes how many units of a product they want in a draft wholesale order. Your job is to build it from
the spec: the API endpoint (Node.js and Express) and a small React screen, both in TypeScript.

You may use your usual AI tool; we will watch how you use it. Please think out loud.

## Start

```
npm install
npm test
```

`npm test` should show 1 passed test.

## Files

- `SPEC.md`: what to build. Read it first.
- `src/api/app.ts`: the Express app. `src/api/store.ts`: sample orders. `src/api/types.ts`: types.
- `src/ui/QuantityEditor.tsx`: the screen.
- `tests/`: your tests, if you want to write some.

## Tasks: 15 minutes in total (in any order)

1. **The endpoint (about 9 minutes).** Implement `PATCH /orders/{orderId}/lines/{lineId}` in
   `src/api/app.ts`, following the table and acceptance criteria in `SPEC.md`.
2. **The screen (about 6 minutes).** Build `QuantityEditor` following the "Screen" part of `SPEC.md`.

Keep TypeScript strict: no `any` and no `@ts-ignore`.
If you are still on one task two minutes after its time, move to the next one.

At 15 minutes we stop. Then run:

```
npm run check
```

Do not edit the `check` folder.
