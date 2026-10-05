/** `text` as a literal part of a regular expression, e.g. a unit title or a level like "A1.2". */
export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}
