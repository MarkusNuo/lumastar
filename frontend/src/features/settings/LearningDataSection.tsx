import {
  ArticleIcon,
  DownloadSimpleIcon,
  SparkleIcon,
  UploadSimpleIcon,
} from '@phosphor-icons/react';
import { useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { ActionList, ActionRow } from '../../components/ui/ActionList';
import { Callout } from '../../components/ui/Callout';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PROFILE_COPY } from './copy';
import { problemMessage, type ProblemMessage } from './importProblems';
import { SummarySheet, type SummarySheetView } from './SummarySheet';
import { useBackupDownload } from './useBackupDownload';
import { useBackupImport } from './useBackupImport';
import { useCopySummary } from './useCopySummary';

const copy = PROFILE_COPY.learningData;

/** "Lerndaten" (PRD F11): the AI summary, and the backup as ZIP export and import. */
export function LearningDataSection() {
  const [sheet, setSheet] = useState<SummarySheetView | null>(null);
  const summary = useCopySummary({ onManualCopy: (text) => setSheet({ kind: 'plain', text }) });
  const download = useBackupDownload();
  const backup = useBackupImport();

  // One message at a time: starting an action clears what an earlier one reported.
  const start = (action: () => void) => () => {
    summary.reset();
    download.reset();
    backup.reset();
    action();
  };

  const problem = backup.problem ?? failure(download.failed, summary.failed);

  return (
    <>
      <ActionList title={copy.title}>
        <ActionRow
          icon={SparkleIcon}
          tone="primary"
          label={copy.copySummary.label}
          description={copy.copySummary.description}
          loading={summary.isPending && sheet === null}
          onClick={start(() => summary.copy())}
        />
        <ActionRow
          icon={ArticleIcon}
          tone="secondary"
          label={copy.viewSummary.label}
          description={copy.viewSummary.description}
          onClick={start(() => setSheet({ kind: 'formatted' }))}
        />
        <ActionRow
          icon={DownloadSimpleIcon}
          tone="unit-sky"
          label={copy.download.label}
          description={copy.download.description}
          loading={download.isPending}
          onClick={start(download.download)}
        />
        <ActionRow
          icon={UploadSimpleIcon}
          tone="warning"
          label={copy.import.label}
          description={copy.import.description}
          loading={backup.isPending}
          onClick={start(backup.choose)}
        />
      </ActionList>
      <input
        {...backup.fileInput}
        type="file"
        accept=".zip,application/zip"
        hidden
        aria-label={copy.import.fileLabel}
      />
      {problem && <ProblemCallout key={problem.message} problem={problem} />}

      <SummarySheet
        view={sheet}
        copying={summary.isPending}
        onCopy={(text) => summary.copy(text)}
        onClose={() => setSheet(null)}
      />
      <ConfirmDialog
        open={backup.confirming}
        title={PROFILE_COPY.backup.confirm.title}
        text={PROFILE_COPY.backup.confirm.text(backup.fileName)}
        cancelLabel={PROFILE_COPY.backup.confirm.cancel}
        confirmLabel={PROFILE_COPY.backup.confirm.replace}
        mascot="thinking"
        onCancel={backup.cancel}
        onConfirm={backup.confirm}
      />
    </>
  );
}

function failure(downloadFailed: boolean, summaryFailed: boolean): ProblemMessage | null {
  if (downloadFailed) return problemMessage(PROFILE_COPY.backup.downloadFailed);
  if (summaryFailed) return problemMessage(PROFILE_COPY.summary.loadFailed);
  return null;
}

function ProblemCallout({ problem }: { problem: ProblemMessage }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  // The rows sit low on the screen, so the message could appear behind the bottom navigation.
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [reduceMotion]);

  return (
    <div ref={ref} className="scroll-mb-[calc(var(--spacing-nav)+var(--safe-bottom)+1rem)]">
      <Callout tone="danger">
        <p>{problem.message}</p>
        {problem.details.length > 0 && (
          <details className="mt-2 text-caption text-fg-muted">
            <summary className="cursor-pointer font-extrabold text-fg">
              {PROFILE_COPY.backup.details}
            </summary>
            <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-4 wrap-anywhere">
              {problem.details.map((line, index) => (
                // The lines never reorder, so their position is a stable key.
                <li key={index}>{line}</li>
              ))}
            </ul>
          </details>
        )}
      </Callout>
    </div>
  );
}
