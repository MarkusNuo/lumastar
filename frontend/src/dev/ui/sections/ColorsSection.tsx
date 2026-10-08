import { UNIT_COLORS, unitTone } from '../../../components/ui/tones';
import { cx } from '../../../lib/cx';
import { Specimen } from '../CatalogSection';

interface Swatch {
  name: string;
  className: string;
}

// Class names are spelled out in full so Tailwind can find them.
const GROUPS: { label: string; swatches: Swatch[] }[] = [
  {
    label: 'Flächen & Text',
    swatches: [
      { name: 'bg', className: 'bg-bg' },
      { name: 'bg-deep', className: 'bg-bg-deep' },
      { name: 'surface', className: 'bg-surface' },
      { name: 'surface-raised', className: 'bg-surface-raised' },
      { name: 'border', className: 'bg-border' },
      { name: 'border-strong', className: 'bg-border-strong' },
      { name: 'fg', className: 'bg-fg' },
      { name: 'fg-muted', className: 'bg-fg-muted' },
      { name: 'fg-subtle', className: 'bg-fg-subtle' },
    ],
  },
  {
    label: 'Marke',
    swatches: [
      { name: 'primary', className: 'bg-primary' },
      { name: 'primary-edge', className: 'bg-primary-edge' },
      { name: 'primary-soft', className: 'bg-primary-soft' },
      { name: 'secondary', className: 'bg-secondary' },
      { name: 'secondary-edge', className: 'bg-secondary-edge' },
      { name: 'primary-surface', className: 'bg-primary-surface' },
    ],
  },
  {
    label: 'Feedback',
    swatches: [
      { name: 'success', className: 'bg-success' },
      { name: 'danger', className: 'bg-danger' },
      { name: 'warning', className: 'bg-warning' },
      { name: 'success-surface', className: 'bg-success-surface' },
      { name: 'danger-surface', className: 'bg-danger-surface' },
      { name: 'warning-surface', className: 'bg-warning-surface' },
    ],
  },
  {
    label: 'Belohnung & gesperrt',
    swatches: [
      { name: 'streak', className: 'bg-streak' },
      { name: 'streak-edge', className: 'bg-streak-edge' },
      { name: 'streak-core', className: 'bg-streak-core' },
      { name: 'streak-glow', className: 'bg-streak-glow' },
      { name: 'streak-surface', className: 'bg-streak-surface' },
      { name: 'xp', className: 'bg-xp' },
      { name: 'freeze', className: 'bg-freeze' },
      { name: 'freeze-surface', className: 'bg-freeze-surface' },
      { name: 'locked', className: 'bg-locked' },
      { name: 'locked-edge', className: 'bg-locked-edge' },
      { name: 'on-locked', className: 'bg-on-locked' },
    ],
  },
];

export function ColorsSection() {
  return (
    <>
      {GROUPS.map((group) => (
        <Specimen key={group.label} label={group.label}>
          <div className="grid w-full grid-cols-3 gap-3">
            {group.swatches.map((swatch) => (
              <figure key={swatch.name} className="flex flex-col gap-1.5">
                <span
                  className={cx('h-12 rounded-card-sm border-2 border-border', swatch.className)}
                />
                <figcaption className="text-micro font-bold text-fg-muted">
                  {swatch.name}
                </figcaption>
              </figure>
            ))}
          </div>
        </Specimen>
      ))}
      <Specimen label="Einheiten (Fläche + 3D-Kante)">
        <div className="grid w-full grid-cols-4 gap-3">
          {UNIT_COLORS.map((color) => (
            <figure key={color} className="flex flex-col gap-2.5">
              <span
                data-tone={unitTone(color)}
                className="grid h-12 place-items-center rounded-card-sm tone-solid text-caption font-black edge-3d"
              >
                Aa
              </span>
              <figcaption className="text-micro font-bold text-fg-muted">{color}</figcaption>
            </figure>
          ))}
        </div>
      </Specimen>
    </>
  );
}
