/** Mirrors the backend limit `lumastar.backup.max-archive-size` (Spring counts 1 MB as 1024² bytes). */
export const MAX_BACKUP_MB = 20;
export const MAX_BACKUP_BYTES = MAX_BACKUP_MB * 1024 * 1024;

export const FALLBACK_BACKUP_NAME = 'lumastar-export.zip';

// RFC 6266: `filename*=UTF-8''name` (RFC 8187 encoding) wins over the plain `filename=` parameter.
const EXTENDED_FILENAME = /filename\*\s*=\s*([\w!#$%&+^`{}~.-]*)'[^']*'([^;\s]+)/iu;
const PLAIN_FILENAME = /(?:^|;)\s*filename\s*=\s*(?:"((?:\\.|[^"\\])*)"|([^;]+))/iu;
// eslint-disable-next-line no-control-regex -- stripping control characters is the point
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/gu;

export function isBackupTooLarge(file: File): boolean {
  return file.size > MAX_BACKUP_BYTES;
}

/** The file name from a Content-Disposition header, reduced to a safe base name. */
export function filenameFromContentDisposition(
  header: string | null,
  fallback: string = FALLBACK_BACKUP_NAME,
): string {
  if (!header) return fallback;
  const name = safeBaseName(extendedFilename(header) ?? plainFilename(header) ?? '');
  return name === '' ? fallback : name;
}

function extendedFilename(header: string): string | undefined {
  const match = EXTENDED_FILENAME.exec(header);
  if (!match?.[2] || match[1]?.toLowerCase() !== 'utf-8') return undefined;
  try {
    return decodeURIComponent(match[2]);
  } catch {
    return undefined;
  }
}

function plainFilename(header: string): string | undefined {
  const match = PLAIN_FILENAME.exec(header);
  if (!match) return undefined;
  return match[1] !== undefined ? match[1].replace(/\\(.)/gu, '$1') : match[2]?.trim();
}

/** Drops directories, control characters and leading dots, so a header cannot pick the location. */
function safeBaseName(name: string): string {
  const base = name.split(/[/\\]/u).at(-1) ?? '';
  return base.replace(CONTROL_CHARACTERS, '').replace(/^\.+/u, '').trim();
}
