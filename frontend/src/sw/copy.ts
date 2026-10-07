/** Copy the service worker shows itself (German, Swiss orthography). */
export const WORKER_COPY = {
  /** For a reminder whose push message came without text. */
  fallback: { title: 'Lingora', body: 'Zeit für eine kurze Lektion.' },
  snoozeFailed: {
    title: 'Verschieben hat nicht geklappt',
    body: 'Tippe hier, um jetzt zu üben.',
  },
} as const;
