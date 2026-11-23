import type { OrderLine } from "../api/types";

export type SaveResult = { ok: true; line: OrderLine } | { ok: false; error: string };

interface Props {
  line: OrderLine;
  onSave: (quantity: number) => Promise<SaveResult>;
}

// Task 2: build this component as described in SPEC.md.
export function QuantityEditor({ line }: Props) {
  return <div>{line.description}</div>;
}
