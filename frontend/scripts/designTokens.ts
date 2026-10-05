// Reads colour tokens from src/styles/tokens.css for build-time files that cannot use CSS
// variables: the web manifest, the theme-color meta tag and the generated app icons.
import { readFileSync } from 'node:fs';

export const TOKENS_FILE = new URL('../src/styles/tokens.css', import.meta.url);

/** Returns a lookup `name => value` for the `--color-<name>` tokens; unknown names throw. */
export function readColorTokens(tokensFile: URL = TOKENS_FILE): (name: string) => string {
  const css = readFileSync(tokensFile, 'utf8');
  const tokens = new Map(
    [...css.matchAll(/--color-([a-z0-9-]+):\s*([^;]+);/g)].map(
      ([, name = '', value = '']) => [name, value.trim()] as const,
    ),
  );
  const lookup = (name: string): string => {
    const value = tokens.get(name);
    if (value === undefined) throw new Error(`Unknown colour token --color-${name}`);
    // Aliases such as `var(--color-primary)` resolve to the colour they point to.
    const alias = /^var\(--color-([a-z0-9-]+)\)$/.exec(value)?.[1];
    return alias ? lookup(alias) : value;
  };
  return lookup;
}
