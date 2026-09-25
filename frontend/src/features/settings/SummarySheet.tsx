import { CopyIcon } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { useId, useRef, type RefObject } from 'react';
import { Button } from '../../components/ui/Button';
import { fieldClass } from '../../components/ui/fieldStyles';
import { LoadFailed, LoadingBlock } from '../../components/ui/LoadState';
import { MarkdownView } from '../../components/ui/MarkdownView';
import { Sheet, SheetHeader } from '../../components/ui/Sheet';
import { canUseClipboard } from '../../lib/clipboard';
import { cx } from '../../lib/cx';
import { PROFILE_COPY } from './copy';
import { summaryQuery } from './profileApi';

/** Formatted for reading, or plain text to copy by hand when the clipboard is not available. */
export type SummarySheetView = { kind: 'formatted' } | { kind: 'plain'; text: string };

export interface SummarySheetProps {
  view: SummarySheetView | null;
  copying: boolean;
  onCopy: (text: string) => void;
  onClose: () => void;
}

const copy = PROFILE_COPY.summary;

const scrollArea = 'min-h-0 flex-1 overflow-y-auto overscroll-contain';

export function SummarySheet({ view, copying, onCopy, onClose }: SummarySheetProps) {
  const titleId = useId();
  const textRef = useRef<HTMLTextAreaElement>(null);

  return (
    <Sheet
      open={view !== null}
      onClose={onClose}
      aria-labelledby={titleId}
      initialFocusRef={view?.kind === 'plain' ? textRef : undefined}
      className="flex max-h-[88dvh] flex-col gap-4"
    >
      <SheetHeader titleId={titleId} title={copy.title} onClose={onClose} />
      {view?.kind === 'plain' ? (
        <PlainSummary
          text={view.text}
          textRef={textRef}
          copying={copying}
          onCopy={onCopy}
          onDone={onClose}
        />
      ) : (
        <FormattedSummary copying={copying} onCopy={onCopy} />
      )}
    </Sheet>
  );
}

function FormattedSummary({ copying, onCopy }: Pick<SummarySheetProps, 'copying' | 'onCopy'>) {
  const summary = useQuery(summaryQuery);

  if (summary.data === undefined) {
    return summary.isError ? (
      <LoadFailed
        message={copy.loadFailed}
        retrying={summary.isFetching}
        onRetry={() => void summary.refetch()}
      />
    ) : (
      <LoadingBlock label={copy.loading} className="h-40" />
    );
  }

  const text = summary.data;
  return (
    <>
      <div className={cx(scrollArea, 'rounded-card-sm border-2 border-border bg-bg p-4')}>
        <MarkdownView source={text} />
      </div>
      <Button size="lg" fullWidth icon={CopyIcon} loading={copying} onClick={() => onCopy(text)}>
        {copy.copy}
      </Button>
    </>
  );
}

interface PlainSummaryProps extends Pick<SummarySheetProps, 'copying' | 'onCopy'> {
  text: string;
  textRef: RefObject<HTMLTextAreaElement | null>;
  onDone: () => void;
}

function PlainSummary({ text, textRef, copying, onCopy, onDone }: PlainSummaryProps) {
  const hintId = useId();

  return (
    <>
      <p id={hintId} className="text-label text-fg-muted">
        {copy.manualCopy}
      </p>
      <textarea
        ref={textRef}
        readOnly
        value={text}
        rows={10}
        aria-label={copy.textLabel}
        aria-describedby={hintId}
        spellCheck={false}
        onFocus={(event) => event.currentTarget.select()}
        className={cx(fieldClass, scrollArea, 'resize-none rounded-card-sm p-3 text-caption')}
      />
      <div className="flex flex-col gap-3">
        {/* A second try works where only the lost tap gesture blocked copying (e.g. Safari). */}
        {canUseClipboard() && (
          <Button
            size="lg"
            fullWidth
            icon={CopyIcon}
            loading={copying}
            onClick={() => onCopy(text)}
          >
            {copy.copy}
          </Button>
        )}
        <Button variant="neutral" size="lg" fullWidth onClick={onDone}>
          {copy.done}
        </Button>
      </div>
    </>
  );
}
