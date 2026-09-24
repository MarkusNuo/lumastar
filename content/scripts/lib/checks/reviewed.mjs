import { at } from '../report.mjs';
import { exercisesOf, itemsOf } from '../walk.mjs';

/** Generated content is never marked as reviewed; only the author sets `reviewed: true` (PRD chapter 4). */
export function checkReviewedFlags(content, report) {
  const entries = [
    ...[...itemsOf(content)].map(({ doc, item, pointer }) => ({ doc, entry: item, pointer })),
    ...[...exercisesOf(content)].map(({ doc, exercise, pointer }) => ({ doc, entry: exercise, pointer })),
  ];
  for (const { doc, entry, pointer } of entries.filter(({ entry }) => entry.reviewed !== false)) {
    report.error(doc.path, at(`${pointer}/reviewed`, entry.id), 'reviewed must be false for generated content.');
  }
}
