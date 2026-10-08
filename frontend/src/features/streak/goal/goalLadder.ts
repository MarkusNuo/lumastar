/**
 * The streak goal ladder (DECISIONS #98): 10, 20, 30, 50, 75, 100, 150, 200, 250, 300, 365, then
 * every 100 days more. The backend only lists the next goals once one is reached; before that the
 * learner may switch to any rung above the current streak, so the screen needs the ladder itself.
 */
const YEAR = 365;
const LADDER = [10, 20, 30, 50, 75, 100, 150, 200, 250, 300, YEAR] as const;
const STEP_AFTER_LADDER = 100;
const CHOICES = 3;

function* rungs(): Generator<number> {
  yield* LADDER;
  for (let rung = YEAR + STEP_AFTER_LADDER; ; rung += STEP_AFTER_LADDER) {
    yield rung;
  }
}

/** The goals a learner can switch to: the first rungs above the streak, without the current goal. */
export function goalChoices(streak: number, target: number, count = CHOICES): number[] {
  const choices: number[] = [];
  for (const rung of rungs()) {
    if (choices.length === count) break;
    if (rung > streak && rung !== target) choices.push(rung);
  }
  return choices;
}
