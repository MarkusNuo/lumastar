import 'react';

declare module 'react' {
  // Module augmentation has to extend the interface, so a Record type is not an option here.
  // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
  interface CSSProperties {
    /** Allows passing CSS custom properties (e.g. `--swing`) through the style prop. */
    [customProperty: `--${string}`]: string | number | undefined;
  }
}
