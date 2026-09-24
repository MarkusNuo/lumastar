import { PathNode, type PathNodeKind, type PathNodeStatus } from '../../../components/ui/PathNode';
import { UNIT_COLORS, type UnitColor } from '../../../components/ui/tones';
import { UnitBanner } from '../../../components/ui/UnitBanner';
import { Specimen } from '../CatalogSection';

const STATUSES: { status: PathNodeStatus; label: string }[] = [
  { status: 'locked', label: 'Gesperrt' },
  { status: 'available', label: 'Verfügbar' },
  { status: 'completed', label: 'Erledigt' },
];

const KINDS: { kind: PathNodeKind; label: string }[] = [
  { kind: 'lesson', label: 'Lektion' },
  { kind: 'focus', label: 'Fokus-Lektion' },
  { kind: 'review', label: 'Wiederholung' },
  { kind: 'checkpoint', label: 'Checkpoint' },
];

const UNIT_TITLES: Record<UnitColor, string> = {
  violet: 'Begrüssung & Höflichkeit',
  teal: 'Sich vorstellen',
  sky: 'Zahlen 1–100',
  rose: 'Familie',
  amber: 'Essen & Trinken',
  lime: 'Zuhause',
  indigo: 'Bestimmter Artikel',
  coral: 'Verben jam / kam',
};

export function PathSection() {
  return (
    <>
      <Specimen label="Aktueller Knoten (pulsiert, Sprechblase)">
        <div className="flex w-full justify-around pt-14 pb-3">
          <PathNode status="current" color="violet" label="Lektion 3" />
          <PathNode status="current" kind="focus" color="coral" label="Fokus-Lektion" />
        </div>
      </Specimen>
      {STATUSES.map(({ status, label }) => (
        <Specimen key={status} label={`${label}: Lektion · Fokus · Wiederholung · Checkpoint`}>
          <div className="flex w-full items-center justify-between pb-2">
            {KINDS.map(({ kind, label: kindLabel }) => (
              <PathNode key={kind} status={status} kind={kind} color="teal" label={kindLabel} />
            ))}
          </div>
        </Specimen>
      ))}
      <Specimen label="Einheiten-Banner in allen Einheitenfarben" layout="stack">
        {UNIT_COLORS.map((color, index) => (
          <UnitBanner
            key={color}
            color={color}
            eyebrow={`Abschnitt 1 · Einheit ${index + 1}`}
            title={UNIT_TITLES[color]}
            subtitle={index === 0 ? 'Grüssen, bitten und danken' : undefined}
            onGuidebookClick={() => undefined}
          />
        ))}
      </Specimen>
    </>
  );
}
