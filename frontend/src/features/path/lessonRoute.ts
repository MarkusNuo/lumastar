/** The lesson player of a curriculum or focus unit. */
export function lessonRoute(unitId: string): string {
  return `/lesson/${encodeURIComponent(unitId)}`;
}

/** Starts the plan's next lesson; "Jetzt üben" on a reminder leads here. */
export const NEXT_LESSON_ROUTE = '/weiter';
