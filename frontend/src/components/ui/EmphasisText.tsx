import { parseEmphasis } from './emphasis';

export interface EmphasisTextProps {
  /** Plain text; words wrapped in `**` are set in bold. Never interpreted as HTML. */
  text: string;
  strongClassName?: string;
}

export function EmphasisText({ text, strongClassName }: EmphasisTextProps) {
  return (
    <>
      {parseEmphasis(text).map((part, index) =>
        part.strong ? (
          // The parts of a text never reorder, so their position is a stable key.
          <strong key={index} className={strongClassName}>
            {part.text}
          </strong>
        ) : (
          part.text
        ),
      )}
    </>
  );
}
