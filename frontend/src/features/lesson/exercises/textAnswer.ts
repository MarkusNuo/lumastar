import type { KeyboardEvent } from 'react';
import type { AnswerStatus } from '../../../components/ui/fieldStyles';
import type { Answer, Outcome, Verdict } from '../model';

/** A blank field is no answer yet, so "Prüfen" stays disabled. */
export function toTextAnswer(text: string): Answer | null {
  return text.trim() === '' ? null : { kind: 'text', text };
}

/** Enter checks the answer (handled by the player), so it never adds a line break. */
export function preventLineBreak(event: KeyboardEvent) {
  if (event.key === 'Enter') event.preventDefault();
}

const STATUS: Record<Outcome, AnswerStatus> = {
  correct: 'correct',
  almost_correct: 'almost',
  correct_standard_form: 'standard',
  wrong: 'wrong',
};

/** Colour of a typed answer after checking, matching the feedback sheet. */
export function textStatus(verdict: Verdict | undefined): AnswerStatus | undefined {
  return verdict && STATUS[verdict.outcome];
}
