/*
 * A deliberately tiny Markdown subset for texts Lingora generates itself (e.g. learner_summary.md):
 * ATX headings, paragraphs and nested bullet lists. Everything else stays plain text, and nothing is
 * ever interpreted as HTML.
 */

export interface MarkdownListItem {
  text: string;
  children: MarkdownListItem[];
}

export type MarkdownBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: MarkdownListItem[] };

const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/u;
const LIST_ITEM = /^(\s*)[-*+]\s+(.*)$/u;
/** Spaces per nesting level, as CommonMark renderers indent bullet lists. */
const INDENT = 2;

export function parseMarkdown(source: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let list: MarkdownListItem[] | null = null;

  const closeParagraph = () => {
    if (paragraph.length > 0) blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
    paragraph = [];
  };
  const closeList = () => {
    if (list) blocks.push({ type: 'list', items: list });
    list = null;
  };

  for (const line of source.replace(/\r\n?/gu, '\n').split('\n')) {
    const heading = HEADING.exec(line);
    const item = LIST_ITEM.exec(line);
    if (heading) {
      closeParagraph();
      closeList();
      blocks.push({ type: 'heading', level: heading[1]?.length ?? 1, text: heading[2] ?? '' });
    } else if (item) {
      closeParagraph();
      list ??= [];
      appendItem(list, Math.floor((item[1]?.length ?? 0) / INDENT), item[2] ?? '');
    } else if (line.trim() === '') {
      closeParagraph();
      closeList();
    } else if (list) {
      // A continuation line belongs to the last item, as in a hard-wrapped list.
      appendContinuation(list, line.trim());
    } else {
      paragraph.push(line.trim());
    }
  }
  closeParagraph();
  closeList();
  return blocks;
}

/** Nests the item under the last item of each shallower level; skipped levels collapse. */
function appendItem(items: MarkdownListItem[], depth: number, text: string): void {
  let siblings = items;
  for (let level = 0; level < depth; level++) {
    const parent = siblings.at(-1);
    if (!parent) break;
    siblings = parent.children;
  }
  siblings.push({ text, children: [] });
}

function appendContinuation(items: MarkdownListItem[], text: string): void {
  let last = items.at(-1);
  while (last && last.children.length > 0) last = last.children.at(-1);
  if (last) last.text = `${last.text} ${text}`;
}
