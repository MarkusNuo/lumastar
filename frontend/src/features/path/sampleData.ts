import type { TopBarProps } from '../../app/TopBar';
import type { PathNodeKind, PathNodeStatus } from '../../components/ui/PathNode';
import type { UnitColor } from '../../components/ui/tones';

/*
 * Placeholder data so the M0 shell can be judged visually. It is replaced by the learner and
 * learning-plan API in M3 and deliberately contains no learning content.
 */

export interface SamplePathNode {
  id: string;
  kind: PathNodeKind;
  status: PathNodeStatus;
  label: string;
}

export interface SampleUnit {
  id: string;
  color: UnitColor;
  eyebrow: string;
  title: string;
  subtitle: string;
  nodes: SamplePathNode[];
}

export const SAMPLE_LEARNER: TopBarProps = {
  level: 'A1',
  sublevel: 2,
  streakDays: 12,
  streakActive: true,
  xp: 1240,
  dailyGoalProgress: 0.6,
};

export const SAMPLE_UNITS: SampleUnit[] = [
  {
    id: 'a1_u1',
    color: 'violet',
    eyebrow: 'Abschnitt 1 · Einheit 1',
    title: 'Begrüssung & Höflichkeit',
    subtitle: 'Grüssen, bitten und danken',
    nodes: [
      { id: 'n1', kind: 'lesson', status: 'completed', label: 'Lektion 1' },
      { id: 'n2', kind: 'lesson', status: 'completed', label: 'Lektion 2' },
      { id: 'n3', kind: 'lesson', status: 'current', label: 'Lektion 3' },
      { id: 'n4', kind: 'focus', status: 'locked', label: 'Fokus-Lektion' },
      { id: 'n5', kind: 'lesson', status: 'locked', label: 'Lektion 4' },
      { id: 'n6', kind: 'review', status: 'locked', label: 'Wiederholung' },
      { id: 'n7', kind: 'checkpoint', status: 'locked', label: 'Checkpoint A1.2' },
    ],
  },
  {
    id: 'a1_u2',
    color: 'teal',
    eyebrow: 'Abschnitt 1 · Einheit 2',
    title: 'Sich vorstellen',
    subtitle: 'Name, Herkunft und Wohnort',
    nodes: [
      { id: 'n8', kind: 'lesson', status: 'locked', label: 'Lektion 1' },
      { id: 'n9', kind: 'lesson', status: 'locked', label: 'Lektion 2' },
      { id: 'n10', kind: 'lesson', status: 'locked', label: 'Lektion 3' },
      { id: 'n11', kind: 'lesson', status: 'locked', label: 'Lektion 4' },
    ],
  },
];
