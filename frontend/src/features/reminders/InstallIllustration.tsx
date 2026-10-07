import { cx } from '../../lib/cx';
import { REMINDER_COPY } from './copy';

const copy = REMINDER_COPY.states.install;

/**
 * Own artwork: an iPhone with Safari's toolbar, the pulsing share button and the share sheet's
 * "Zum Home-Bildschirm" entry. Colours come from the tokens through Tailwind's fill and stroke
 * utilities.
 */
export function InstallIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 196"
      role="img"
      aria-label={copy.illustration}
      className={cx('mx-auto w-full max-w-64', className)}
    >
      {/* Phone */}
      <rect
        x="52"
        y="4"
        width="136"
        height="188"
        rx="24"
        className="fill-surface stroke-border-strong"
        strokeWidth="3"
      />
      <rect x="60" y="14" width="120" height="168" rx="16" className="fill-bg" />
      <rect x="104" y="18" width="32" height="6" rx="3" className="fill-surface-raised" />

      {/* The app behind the sheet: a few path nodes */}
      <circle cx="120" cy="46" r="10" className="fill-primary-edge" />
      <circle cx="120" cy="43" r="10" className="fill-primary" />
      <circle cx="100" cy="72" r="10" className="fill-locked-edge" />
      <circle cx="100" cy="69" r="10" className="fill-locked" />

      {/* Share sheet with the "Zum Home-Bildschirm" entry */}
      <rect
        x="66"
        y="88"
        width="108"
        height="50"
        rx="10"
        className="fill-surface-raised stroke-border"
        strokeWidth="2"
      />
      <rect
        x="72"
        y="104"
        width="96"
        height="26"
        rx="7"
        className="fill-secondary-surface stroke-secondary"
        strokeWidth="2"
      />
      <text x="80" y="120.5" fontSize="8.5" fontWeight="800" className="fill-fg">
        {copy.addToHomeScreen}
      </text>
      <g
        transform="translate(158 117)"
        className="stroke-secondary"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      >
        <rect x="-5" y="-5" width="10" height="10" rx="2.5" />
        <path d="M0 -2.5v5M-2.5 0h5" />
      </g>
      <rect x="78" y="94" width="40" height="4" rx="2" className="fill-border-strong" />

      {/* Safari toolbar */}
      <path
        d="M60 150h120v16a16 16 0 0 1-16 16H76a16 16 0 0 1-16-16Z"
        className="fill-surface-raised"
      />
      <g
        className="stroke-fg-subtle"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M77 160l-4 4 4 4" />
        <path d="M91 160l4 4-4 4" />
        <path d="M143 159.5a4 4 0 0 1 4-1.5h6v12h-6a4 4 0 0 0-4 1.5zM143 159.5a4 4 0 0 0-4-1.5h-6v12h6a4 4 0 0 1 4 1.5z" />
        <rect x="160" y="159" width="9" height="9" rx="2" />
        <rect x="163" y="156" width="9" height="9" rx="2" />
      </g>

      {/* The share button, highlighted */}
      <circle
        cx="117"
        cy="164"
        r="12"
        className="origin-center fill-secondary/25 [transform-box:fill-box] motion-safe:animate-pulse-ring"
      />
      <circle cx="117" cy="164" r="11" className="fill-secondary" />
      <g
        transform="translate(117 165)"
        className="stroke-on-secondary"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M-4.5 -2.5h-1.5v7.5h12v-7.5h-1.5" />
        <path d="M0 -8v8M-3 -5l3-3 3 3" />
      </g>
      <path
        d="M117 152v-10"
        className="stroke-secondary"
        strokeWidth="2"
        strokeDasharray="2 3"
        strokeLinecap="round"
      />
    </svg>
  );
}
