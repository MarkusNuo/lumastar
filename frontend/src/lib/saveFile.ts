/** Revoking the object URL right after the click can cancel the download in some browsers. */
const REVOKE_DELAY_MS = 60_000;

/** Hands a downloaded blob to the browser as a file with the given name. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}
