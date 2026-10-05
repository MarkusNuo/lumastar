/** The lesson player of a curriculum or focus unit. */
export function lessonRoute(unitId: string): string {
  return `/lesson/${encodeURIComponent(unitId)}`;
}
