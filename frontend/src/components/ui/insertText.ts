export interface TextInsertion {
  value: string;
  /** Caret position right after the inserted text. */
  caret: number;
}

/** Replaces the selection [start, end) of `value` with `text`. */
export function insertAtSelection(
  value: string,
  start: number,
  end: number,
  text: string,
): TextInsertion {
  const from = Math.max(0, Math.min(start, end, value.length));
  const to = Math.min(value.length, Math.max(start, end));
  return { value: value.slice(0, from) + text + value.slice(to), caret: from + text.length };
}
