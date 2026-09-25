import { LightningIcon } from '@phosphor-icons/react';
import type { Profile } from '../../api/types';
import { parseLevel } from '../../app/learnerStats';
import { LevelBadge } from '../../components/ui/LevelBadge';
import { Mascot } from '../../components/ui/Mascot';
import { cx } from '../../lib/cx';
import { PROFILE_COPY } from './copy';

const chip = 'inline-flex items-center gap-2 rounded-full tone-outline text-label font-extrabold';

/** Who is learning: mascot, name, level and all XP collected so far. */
export function ProfileHeader({ profile }: { profile: Profile }) {
  const level = profile.currentLevel ? parseLevel(profile.currentLevel) : undefined;

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <Mascot expression="happy" size="lg" />
      <p className="max-w-full text-headline font-black wrap-break-word">{profile.displayName}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <span data-tone="neutral" className={cx(chip, 'bg-surface py-1 pr-4 pl-1.5')}>
          {/* The chip text names the level; the badge only decorates it. */}
          <span aria-hidden="true" className="inline-flex">
            <LevelBadge
              level={level?.level ?? 'A0'}
              sublevel={level?.sublevel}
              locked={!level}
              size="sm"
            />
          </span>
          {profile.currentLevel ? PROFILE_COPY.level(profile.currentLevel) : PROFILE_COPY.noLevel}
        </span>
        <span data-tone="xp" className={cx(chip, 'px-4 py-2')}>
          <LightningIcon aria-hidden="true" size={20} weight="fill" />
          {PROFILE_COPY.xp(profile.xpTotal)}
        </span>
      </div>
    </div>
  );
}
