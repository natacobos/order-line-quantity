import { useId, useRef, useState, type FormEvent } from "react";
import type { OrderLine } from "../api/types";

export type SaveResult = { ok: true; line: OrderLine } | { ok: false; error: string };

interface Props {
  line: OrderLine;
  onSave: (quantity: number) => Promise<SaveResult>;
}

type Feedback = { kind: "saved" } | { kind: "error"; message: string; invalidInput: boolean };

const QUANTITY_ERRORS: readonly string[] = ["INVALID_QUANTITY", "NOT_PACK_MULTIPLE"];

function errorMessage(code: string, packSize: number): string {
  switch (code) {
    case "INVALID_QUANTITY":
      return "Enter a whole number from 1 to 999.";
    case "NOT_PACK_MULTIPLE":
      return `Quantity must be a multiple of ${packSize}.`;
    case "ORDER_NOT_EDITABLE":
      return "This order can no longer be changed.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export function QuantityEditor({ line, onSave }: Props) {
  const inputId = useId();
  const alertId = useId();
  // A ref locks synchronously; the `saving` state only updates on the next render.
  const savingRef = useRef(false);
  const [value, setValue] = useState(String(line.quantity));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const showError = (code: string) =>
    setFeedback({
      kind: "error",
      message: errorMessage(code, line.packSize),
      invalidInput: QUANTITY_ERRORS.includes(code),
    });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;

    // An empty input has no number to send; every other rule is validated by the server.
    if (value.trim() === "") {
      showError("INVALID_QUANTITY");
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setFeedback(null);
    try {
      const result = await onSave(Number(value));
      if (result.ok) setFeedback({ kind: "saved" });
      else showError(result.error);
    } catch {
      showError("UNKNOWN");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <p>{line.description}</p>
      <label htmlFor={inputId}>Quantity</label>
      <input
        id={inputId}
        type="number"
        inputMode="numeric"
        min={line.packSize}
        max={999}
        step={line.packSize}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setFeedback(null);
        }}
        aria-invalid={feedback?.kind === "error" && feedback.invalidInput}
        aria-describedby={feedback?.kind === "error" ? alertId : undefined}
      />
      <button type="submit" disabled={saving}>
        Save
      </button>
      {feedback?.kind === "error" && (
        <p id={alertId} role="alert">
          {feedback.message}
        </p>
      )}
      {feedback?.kind === "saved" && <p role="status">Saved</p>}
    </form>
  );
}
