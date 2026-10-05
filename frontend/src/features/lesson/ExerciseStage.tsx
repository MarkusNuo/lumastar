import { motion } from 'motion/react';
import { useEffect, useRef, type ReactNode } from 'react';
import { springs } from '../../styles/motion';
import type { LessonExercise } from './model';

export interface ExerciseStageProps {
  exercise: LessonExercise;
  /** Read-only and out of the tab order, e.g. while the answer is being sent. */
  inert?: boolean;
  children: ReactNode;
}

/** Slides a new task in and moves the screen-reader focus to it. */
export function ExerciseStage({ exercise, inert = false, children }: ExerciseStageProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Screen readers start at the new task, unless the exercise put the cursor into its input.
  useEffect(() => {
    const active = document.activeElement;
    if (active && active !== document.body && contentRef.current?.contains(active)) return;
    contentRef.current
      ?.querySelector<HTMLElement>('[data-exercise-title]')
      ?.focus({ preventScroll: true });
  }, []);

  return (
    <motion.div
      ref={contentRef}
      inert={inert}
      data-exercise-id={exercise.id}
      data-exercise-type={exercise.type}
      initial={{ opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      transition={springs.snappy}
      className="flex-1 pt-2 pb-8"
    >
      {children}
    </motion.div>
  );
}
