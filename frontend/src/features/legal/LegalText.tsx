import { splitPlaceholders } from './legalDocument';

/** Running text of a legal page with its open placeholders highlighted. */
export function LegalText({ text }: { text: string }) {
  return splitPlaceholders(text).map((part, index) =>
    // The parts of one text never reorder, so their position is a stable key.
    part.kind === 'placeholder' ? (
      <mark
        key={index}
        className="rounded-xs bg-warning-surface [box-decoration-break:clone] px-1 text-warning"
      >
        {part.text}
      </mark>
    ) : (
      part.text
    ),
  );
}
