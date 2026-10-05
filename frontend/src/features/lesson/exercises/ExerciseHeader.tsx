import { ArrowCounterClockwiseIcon, SealQuestionIcon } from '@phosphor-icons/react';
import type { Lang } from '../model';
import { LESSON_COPY } from '../copy';
import { promptBlocks } from './promptBlocks';

export interface ExerciseHeaderProps {
  title: string;
  /** Set when the title itself is learning content, e.g. a Gheg question. */
  titleLang?: Lang;
  retry: boolean;
  reviewed: boolean;
}

/** Title of the exercise; focused when the exercise appears so screen readers announce it. */
export function ExerciseHeader({ title, titleLang, retry, reviewed }: ExerciseHeaderProps) {
  return (
    <div className="flex flex-col gap-2">
      {(retry || !reviewed) && (
        <div className="flex flex-wrap items-center gap-2">
          {retry && (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning-surface px-2.5 py-0.5 text-micro font-black tracking-wider text-warning uppercase">
              <ArrowCounterClockwiseIcon aria-hidden="true" size={14} weight="bold" />
              {LESSON_COPY.retryBadge}
            </span>
          )}
          {!reviewed && (
            <span
              title={LESSON_COPY.unreviewed.explanation}
              className="inline-flex items-center gap-1 text-micro font-extrabold text-fg-subtle"
            >
              <SealQuestionIcon aria-hidden="true" size={14} weight="bold" />
              {LESSON_COPY.unreviewed.label}
              <span className="sr-only">: {LESSON_COPY.unreviewed.explanation}</span>
            </span>
          )}
        </div>
      )}
      <h1
        tabIndex={-1}
        data-exercise-title=""
        className="flex flex-col gap-3 text-title font-black outline-none"
      >
        {promptBlocks(title, titleLang).map((block, index) => (
          <span key={index} lang={block.lang} className="whitespace-pre-line">
            {block.text}
          </span>
        ))}
      </h1>
    </div>
  );
}
