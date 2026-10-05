import { TargetIcon } from '@phosphor-icons/react';
import { PathNode, type PathNodeKind, type PathNodeStatus } from '../../../components/ui/PathNode';
import { UNIT_COLORS, type UnitColor } from '../../../components/ui/tones';
import { UnitBanner } from '../../../components/ui/UnitBanner';
import { PATH_COPY } from '../../../features/path/copy';
import { buildLearningPath, FOCUS_COLOR } from '../../../features/path/learningPath';
import { PlanTeaser } from '../../../features/path/PlanTeaser';
import { UnitPath } from '../../../features/path/UnitPath';
import { SAMPLE_PATH } from '../../../features/plan/samplePlan';
import { Specimen } from '../CatalogSection';

const SAMPLE_UNITS = buildLearningPath(SAMPLE_PATH).flatMap((stage) => stage.units);
const CURRENT_UNIT = SAMPLE_UNITS.find((unit) => unit.id === 'a1_u06_home');

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
      <Specimen label="Plan oben auf dem Lernpfad" layout="stack">
        <PlanTeaser path={SAMPLE_PATH} />
      </Specimen>
      {CURRENT_UNIT && (
        <Specimen label="Aktuelle Einheit: erledigt · als Nächstes · gesperrt" layout="stack">
          <UnitPath unit={CURRENT_UNIT} />
        </Specimen>
      )}
      <Specimen label="Banner: übersprungen · Fokus-Lektion · bald verfügbar" layout="stack">
        <UnitBanner
          color="amber"
          eyebrow="A1.2 · Einheit 1"
          title="Essen & Trinken"
          badge={PATH_COPY.badges.skipped}
          subtitle="Im Einstufungstest schon sicher (85 %)"
        />
        <UnitBanner
          color={FOCUS_COLOR}
          icon={TargetIcon}
          eyebrow={PATH_COPY.focusEyebrow}
          title="Bestimmter Artikel üben"
          subtitle="Fehlerquote 45 % bei Bestimmter Artikel"
        />
        <UnitBanner
          color="violet"
          locked
          eyebrow="B1.1 · Einheit 1"
          title="Wie es früher war"
          badge={PATH_COPY.badges.comingSoon}
        />
      </Specimen>
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
