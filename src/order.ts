import type { Note, Severity } from "./types";

const RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, suggestion: 4 };

export function orderNotes(notes: Note[]): Note[] {
  return [...notes].sort(
    (a, b) =>
      RANK[a.severity] - RANK[b.severity] ||
      (a.anchor?.box?.y ?? Number.POSITIVE_INFINITY) -
        (b.anchor?.box?.y ?? Number.POSITIVE_INFINITY) ||
      b.confidence - a.confidence,
  );
}
