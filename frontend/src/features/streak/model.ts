import type {
  LessonStreak,
  StreakCalendar,
  StreakCalendarDay,
  StreakDayStatus,
  StreakFreezes,
  StreakGoalResponse,
  StreakOverviewResponse,
} from '../../api/types';

/*
 * Names of the streak screen's and the streak celebration's types; they are the API's own shapes,
 * so screens and logic read like the feature rather than like the endpoints.
 */

export type { StreakDayStatus, StreakFreezes };
export type StreakDay = StreakCalendarDay;
export type StreakMonth = StreakCalendar;
export type StreakGoal = StreakGoalResponse;
export type StreakOverview = StreakOverviewResponse;

/** What the celebration after the lesson that met today's goal shows. */
export type CelebratedStreak = Pick<
  LessonStreak,
  'previous' | 'current' | 'freezeUsed' | 'goalReached'
>;
