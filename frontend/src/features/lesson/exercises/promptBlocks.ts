import type { Lang } from '../model';

export interface PromptBlock {
  text: string;
  /** Absent for UI copy such as "Fülle die Lücke". */
  lang?: Lang;
}

/** Reading prompts end with a German question after a blank line (content convention). */
const QUESTION_MARKER = 'Frage:';

/**
 * Splits a prompt into its paragraphs. A reading text in Gheg keeps its language, the German
 * "Frage: …" after it gets its own, so screen readers pronounce each part correctly.
 */
export function promptBlocks(text: string, lang?: Lang): PromptBlock[] {
  return text
    .split(/\n\s*\n/u)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
    .map((paragraph) => ({
      text: paragraph,
      lang: paragraph.startsWith(QUESTION_MARKER) ? 'de' : lang,
    }));
}
