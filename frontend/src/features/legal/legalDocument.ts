/** A section of a legal page; «[…]» in a text marks a placeholder the operator still fills in. */
export interface LegalSection {
  heading: string;
  paragraphs?: readonly string[];
  list?: readonly string[];
}

export interface LegalDocument {
  title: string;
  intro: string;
  sections: readonly LegalSection[];
}

export type LegalPart = { kind: 'text'; text: string } | { kind: 'placeholder'; text: string };

const PLACEHOLDER = /(«\[[^\]]+\]»)/;

/** Splits a text into plain parts and the placeholders that still need the operator's data. */
export function splitPlaceholders(text: string): LegalPart[] {
  return text
    .split(PLACEHOLDER)
    .filter((part) => part !== '')
    .map((part) =>
      PLACEHOLDER.test(part) ? { kind: 'placeholder', text: part } : { kind: 'text', text: part },
    );
}
