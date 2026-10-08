import { ArrowLeftIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { FocusScreen } from '../../components/ui/FocusScreen';
import { IconButton } from '../../components/ui/IconButton';
import { STREAK_COPY } from './copy';

const copy = STREAK_COPY.screen;

export interface StreakScreenProps {
  onBack: () => void;
  children: ReactNode;
}

/** The frame of the streak screen: a way back and the title, without the app navigation. */
export function StreakScreen({ onBack, children }: StreakScreenProps) {
  return (
    <FocusScreen
      header={
        <>
          <IconButton icon={ArrowLeftIcon} label={copy.back} variant="ghost" onClick={onBack} />
          <h1 className="min-w-0 text-title font-black">{copy.title}</h1>
        </>
      }
      className="gap-4 pt-2 pb-[calc(var(--safe-bottom)+2rem)]"
    >
      {children}
    </FocusScreen>
  );
}
