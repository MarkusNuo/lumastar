import type { Icon } from '@phosphor-icons/react';
import { useId } from 'react';
import type { SkillEstimate } from '../../../api/types';
import { ProgressBar, type ProgressBarTone } from '../../../components/ui/ProgressBar';
import type { Tone } from '../../../components/ui/tones';
import { formatShare } from '../../../lib/formatPercent';

export interface SkillListProps {
  title: string;
  icon: Icon;
  tone: Extract<Tone, 'success' | 'warning'>;
  skills: SkillEstimate[];
}

const barTone: Record<SkillListProps['tone'], ProgressBarTone> = {
  success: 'success',
  warning: 'xp',
};

/** Top strengths or weaknesses of a placement with their estimated mastery. */
export function SkillList({ title, icon: TitleIcon, tone, skills }: SkillListProps) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      data-tone={tone}
      className="flex flex-col gap-3 rounded-card border-2 border-tone-border bg-tone-surface p-4 text-left"
    >
      <h2
        id={titleId}
        className="flex items-center gap-2 text-label font-black tracking-wide text-tone-text uppercase"
      >
        <TitleIcon aria-hidden="true" size={20} weight="fill" />
        {title}
      </h2>
      <ul className="flex flex-col gap-3">
        {skills.map((skill) => (
          <li key={skill.skillTag} className="flex flex-col gap-1.5">
            <span className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 text-body font-extrabold text-fg">{skill.label}</span>
              <span className="shrink-0 text-label font-black text-fg-muted tabular-nums">
                {formatShare(skill.mastery)}
              </span>
            </span>
            <ProgressBar
              label={skill.label}
              value={Math.round(skill.mastery * 100)}
              valueText={formatShare(skill.mastery)}
              tone={barTone[tone]}
              className="h-2.5"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
