/**
 * Summarises the review progress: only the author sets `reviewed: true` (PRD chapter 4), so the flag
 * is reported per file and in total instead of being checked. Counts every entry of the parsed files.
 */
export function summarizeReviewed(content, report) {
  const total = { exercises: emptyCount(), items: emptyCount() };
  for (const doc of [...content.units, content.placement].filter(Boolean)) {
    const exercises = countReviewed(doc.data?.exercises);
    const items = countReviewed(doc.data?.items);
    report.summarize(doc.path, describe({ exercises, items }));
    addTo(total.exercises, exercises);
    addTo(total.items, items);
  }
  report.summarizeTotal(`Total: ${describe(total)}.`);
}

function countReviewed(entries) {
  const list = Array.isArray(entries) ? entries : [];
  return { reviewed: list.filter((entry) => entry?.reviewed === true).length, all: list.length };
}

function describe({ exercises, items }) {
  return `reviewed ${exercises.reviewed} / ${exercises.all} exercises, ${items.reviewed} / ${items.all} items`;
}

function emptyCount() {
  return { reviewed: 0, all: 0 };
}

function addTo(sum, count) {
  sum.reviewed += count.reviewed;
  sum.all += count.all;
}
