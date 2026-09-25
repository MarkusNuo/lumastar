/** UI copy of the profile tab (German, Swiss orthography). */
export const PROFILE_COPY = {
  title: 'Profil',
  loading: 'Profil wird geladen',
  xp: (xp: number) => `${xp.toLocaleString('de-CH')} XP gesammelt`,
  level: (level: string) => `Niveau ${level}`,
  noLevel: 'Niveau folgt nach dem Einstufungstest',
  comingSoon: 'Einstellungen, Export und Import kommen bald.',
  loadFailed: 'Dein Profil konnte nicht geladen werden.',
  retry: 'Nochmals versuchen',
  logout: 'Abmelden',
  logoutFailed: 'Abmelden hat nicht geklappt. Prüfe deine Verbindung und versuch es nochmals.',
} as const;
