import { describe, expect, it } from 'vitest';
import { filenameFromContentDisposition, isBackupTooLarge, MAX_BACKUP_BYTES } from './backupFile';

describe('filenameFromContentDisposition', () => {
  it.each([
    ['attachment; filename="lumastar-export-2026-09-25.zip"', 'lumastar-export-2026-09-25.zip'],
    ['attachment; filename=lumastar-export-2026-09-25.zip', 'lumastar-export-2026-09-25.zip'],
    ['attachment;filename="backup; alt.zip"', 'backup; alt.zip'],
    ['attachment; filename="say \\"hi\\".zip"', 'say "hi".zip'],
    [
      'attachment; filename="lumastar.zip"; filename*=UTF-8\'\'lumastar-%C3%BCbung.zip',
      'lumastar-übung.zip',
    ],
    ["attachment; filename*=utf-8'de'sich%C3%A4rung.zip", 'sichärung.zip'],
  ])('reads %s', (header, expected) => {
    expect(filenameFromContentDisposition(header)).toBe(expected);
  });

  it('keeps only the base name, so the server cannot choose a folder', () => {
    expect(filenameFromContentDisposition('attachment; filename="../../etc/passwd"')).toBe(
      'passwd',
    );
    // Unquoted, because a backslash in a quoted string only escapes the next character.
    expect(filenameFromContentDisposition('attachment; filename=C:\\Temp\\x.zip')).toBe('x.zip');
    expect(filenameFromContentDisposition('attachment; filename=".hidden.zip"')).toBe('hidden.zip');
  });

  it('falls back to lumastar-export.zip without a usable name', () => {
    expect(filenameFromContentDisposition(null)).toBe('lumastar-export.zip');
    expect(filenameFromContentDisposition('attachment')).toBe('lumastar-export.zip');
    expect(filenameFromContentDisposition('attachment; filename=""')).toBe('lumastar-export.zip');
    expect(filenameFromContentDisposition("attachment; filename*=UTF-8''%E0%A4%A")).toBe(
      'lumastar-export.zip',
    );
  });

  it('ignores the extended name in a charset it cannot decode', () => {
    expect(
      filenameFromContentDisposition(
        'attachment; filename="plain.zip"; filename*=ISO-8859-1\'\'%E4.zip',
      ),
    ).toBe('plain.zip');
  });
});

describe('isBackupTooLarge', () => {
  const fileOfSize = (size: number) => {
    const file = new File(['PK'], 'lumastar-export.zip', { type: 'application/zip' });
    Object.defineProperty(file, 'size', { value: size });
    return file;
  };

  it('accepts files up to 20 MB and rejects larger ones', () => {
    expect(MAX_BACKUP_BYTES).toBe(20 * 1024 * 1024);
    expect(isBackupTooLarge(fileOfSize(MAX_BACKUP_BYTES))).toBe(false);
    expect(isBackupTooLarge(fileOfSize(MAX_BACKUP_BYTES + 1))).toBe(true);
  });
});
