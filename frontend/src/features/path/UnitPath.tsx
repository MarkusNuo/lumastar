import { useNavigate } from 'react-router';
import { Mascot } from '../../components/ui/Mascot';
import { PathNode } from '../../components/ui/PathNode';
import { UnitBanner } from '../../components/ui/UnitBanner';
import { cx } from '../../lib/cx';
import { PATH_COPY } from './copy';
import type { PathUnit } from './learningPath';
import { pathSwing } from './pathLayout';

export function UnitPath({ unit }: { unit: PathUnit }) {
  const navigate = useNavigate();
  const currentIndex = unit.nodes.findIndex((node) => node.status === 'current');
  const start = () => void navigate(`/lesson/${unit.id}`);

  return (
    <section className="flex flex-col gap-8">
      <UnitBanner
        color={unit.color}
        titleAs="h3"
        eyebrow={unit.eyebrow}
        title={unit.title}
        subtitle={unit.description}
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
