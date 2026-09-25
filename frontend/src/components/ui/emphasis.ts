export interface EmphasisPart {
  text: string;
  strong: boolean;
}

const STRONG = /\*\*(.+?)\*\*/gu;

/** Splits "achte auf **âsht**" into plain and bold parts; unmatched asterisks stay as text. */
export function parseEmphasis(text: string): EmphasisPart[] {
  const parts: EmphasisPart[] = [];
  let last = 0;
  for (const match of text.matchAll(STRONG)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index), strong: false });
    parts.push({ text: match[1] ?? '', strong: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), strong: false });
  return parts;
}
