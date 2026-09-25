/**
 * Copies text to the clipboard. Resolves false when the Clipboard API is missing (it only exists in
 * secure contexts, so not over plain http on the home network) or the browser refuses, so the
 * caller can offer manual copying instead.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  const clipboard = clipboardApi();
  if (!clipboard) return false;
  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** False where copying can only happen by hand. */
export function canUseClipboard(): boolean {
  return clipboardApi() !== undefined;
}

function clipboardApi(): Clipboard | undefined {
  // Typed as always present, but browsers leave it out in insecure contexts.
  return navigator.clipboard;
}
