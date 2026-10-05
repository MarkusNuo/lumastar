import { TargetIcon } from '@phosphor-icons/react';
import { useId } from 'react';
import { useNavigate } from 'react-router';
import { Mascot } from '../../components/ui/Mascot';
import { PathNode } from '../../components/ui/PathNode';
import { UnitBanner } from '../../components/ui/UnitBanner';
import { cx } from '../../lib/cx';
import { PATH_COPY } from './copy';
import type { PathUnitModel } from './learningPath';
import { lessonRoute } from './lessonRoute';
import { pathSwing } from './pathLayout';

/** One unit of the learning path: its banner and a winding row of lesson nodes. */
export function UnitPath({ unit }: { unit: PathUnitModel }) {
  const navigate = useNavigate();
  const currentIndex = unit.nodes.findIndex((node) => node.status === 'current');
  const start = () => void navigate(lessonRoute(unit.id));
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-8">
      <UnitBanner
        color={unit.color}
        locked={!unit.playable}
        icon={unit.focus ? TargetIcon : undefined}
        badge={unit.badge && PATH_COPY.badges[unit.badge]}
        titleAs="h3"
        titleId={titleId}
        eyebrow={unit.eyebrow}
        title={unit.title}
        subtitle={unit.reason}
      />
      <ol className="flex flex-col items-center gap-6 py-2">
        {unit.nodes.map((node, index) => (
          <li
            key={node.id}
            style={{ '--swing': pathSwing(index) }}
            className={cx(
              'relative flex w-full justify-center',
              node.status === 'current' && 'pt-12',
            )}
          >
            <PathNode
              status={node.status}
              kind={node.kind}
              color={unit.color}
              label={node.label}
              bubbleLabel={PATH_COPY.start}
              onClick={node.status === 'locked' ? undefined : start}
              className="translate-x-[calc(var(--swing)*var(--spacing-path-swing))]"
            />
            {currentIndex >= 0 && index === currentIndex + 1 && (
              <Mascot
                expression="encouraging"
                size="lg"
                className="absolute top-1/2 left-2 -translate-y-1/2"
              />
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
