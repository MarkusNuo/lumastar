import {
  AirplaneTiltIcon,
  BriefcaseIcon,
  CellSignalFullIcon,
  CellSignalHighIcon,
  CellSignalLowIcon,
  CellSignalMediumIcon,
  CellSignalNoneIcon,
  CoffeeIcon,
  HeartIcon,
  LightbulbIcon,
  PersonSimpleRunIcon,
  PersonSimpleWalkIcon,
  RocketLaunchIcon,
  TreeIcon,
  type Icon,
} from '@phosphor-icons/react';
import type { Motivation, OnboardingOptions, SelfAssessment } from '../../api/types';
import { ONBOARDING_COPY } from './copy';

/** One answer card of an onboarding question; labels come from the API. */
export interface ChoiceOption<Value extends string | number> {
  value: Value;
  label: string;
  description?: string;
  icon: Icon;
}

const MOTIVATION_ICONS: Record<Motivation, Icon> = {
  family: HeartIcon,
  travel: AirplaneTiltIcon,
  work: BriefcaseIcon,
  heritage: TreeIcon,
  interest: LightbulbIcon,
};

// Ordered from the smallest to the largest goal / from no knowledge to a lot.
const DAILY_GOAL_ICONS: readonly Icon[] = [
  CoffeeIcon,
  PersonSimpleWalkIcon,
  PersonSimpleRunIcon,
  RocketLaunchIcon,
];
const SELF_ASSESSMENT_ICONS: readonly Icon[] = [
  CellSignalNoneIcon,
  CellSignalLowIcon,
  CellSignalMediumIcon,
  CellSignalHighIcon,
  CellSignalFullIcon,
];

function byRank(icons: readonly Icon[], index: number): Icon {
  return icons[Math.min(index, icons.length - 1)] ?? RocketLaunchIcon;
}

export function motivationOptions(options: OnboardingOptions): ChoiceOption<Motivation>[] {
  return options.motivations.map(({ value, label }) => ({
    value,
    label,
    icon: MOTIVATION_ICONS[value],
  }));
}

export function dailyGoalOptions(options: OnboardingOptions): ChoiceOption<number>[] {
  const copy = ONBOARDING_COPY.dailyGoal;
  return options.dailyGoalMinutes.map((minutes, index) => {
    const name = copy.names[minutes];
    return {
      value: minutes,
      label: name ?? copy.minutes(minutes),
      description: name ? copy.minutes(minutes) : undefined,
      icon: byRank(DAILY_GOAL_ICONS, index),
    };
  });
}

export function selfAssessmentOptions(options: OnboardingOptions): ChoiceOption<SelfAssessment>[] {
  return options.selfAssessments.map(({ value, label }, index) => ({
    value,
    label,
    icon: byRank(SELF_ASSESSMENT_ICONS, index),
  }));
}
