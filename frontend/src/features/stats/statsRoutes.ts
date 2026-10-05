export const STATS_ROUTES = {
  home: '/statistik',
  /** A full-screen practice lesson on one skill tag ("Gezielt üben"). */
  practice: '/statistik/ueben/:skillTag',
} as const;

export function practiceRoute(skillTag: string): string {
  return `/statistik/ueben/${encodeURIComponent(skillTag)}`;
}
