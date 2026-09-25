import { useMemo } from 'react';
import { cx } from '../../lib/cx';
import { parseMarkdown, type MarkdownListItem } from '../../lib/markdown';
import { EmphasisText } from './EmphasisText';

export interface MarkdownViewProps {
  /** Headings, paragraphs, bullet lists and **bold**; rendered as text, never as HTML. */
  source: string;
  /**
   * Level of the surrounding heading: a Markdown `#` becomes the next level below it, so the
   * document outline stays intact inside a sheet or card.
   */
  parentHeadingLevel?: number;
  className?: string;
}

type HeadingTag = 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

const HEADING_TAGS: readonly HeadingTag[] = ['h2', 'h3', 'h4', 'h5', 'h6'];

const headingClass: Record<HeadingTag, string> = {
  h2: 'text-title font-black',
  h3: 'text-lead font-black',
  h4: 'text-body font-black',
  h5: 'text-label font-black',
  h6: 'text-label font-extrabold text-fg-muted',
};

export function MarkdownView({ source, parentHeadingLevel = 2, className }: MarkdownViewProps) {
  const blocks = useMemo(() => parseMarkdown(source), [source]);

  return (
    <div className={cx('flex flex-col gap-3 text-body text-fg', className)}>
      {blocks.map((block, index) => {
        // Blocks never reorder, so their position is a stable key.
        switch (block.type) {
          case 'heading': {
            const Tag = headingTag(parentHeadingLevel + block.level);
            return (
              <Tag key={index} className={headingClass[Tag]}>
                <EmphasisText text={block.text} />
              </Tag>
            );
          }
          case 'paragraph':
            return (
              <p key={index} className="text-fg-muted">
                <EmphasisText text={block.text} strongClassName="text-fg" />
              </p>
            );
          case 'list':
            return <BulletList key={index} items={block.items} depth={0} />;
        }
      })}
    </div>
  );
}

function headingTag(level: number): HeadingTag {
  return HEADING_TAGS[Math.min(Math.max(level, 2), 6) - 2] ?? 'h6';
}

function BulletList({ items, depth }: { items: MarkdownListItem[]; depth: number }) {
  return (
    <ul
      className={cx(
        'flex flex-col gap-1.5 pl-5',
        depth === 0
          ? 'list-disc marker:text-secondary'
          : 'mt-1.5 list-[circle] text-fg-muted marker:text-fg-subtle',
      )}
    >
      {items.map((item, index) => (
        <li key={index} className="pl-1">
          <EmphasisText text={item.text} strongClassName="font-black text-fg" />
          {item.children.length > 0 && <BulletList items={item.children} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  );
}
