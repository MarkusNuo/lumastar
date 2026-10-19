package app.lumastar.core.placement;

import app.lumastar.domain.Level;
import app.lumastar.domain.PlacementState;
import java.util.EnumMap;
import java.util.Map;
import java.util.Optional;

/**
 * The placement staircase, replayed from the answers of a test. It starts at the start level; two answers in a row
 * that count as correct move one stage up, one wrong answer moves one stage down (never below A0). It comes to an end
 * <ul>
 *   <li>when it is <b>stable</b>: the direction has changed {@value #STABLE_REVERSALS} times at the same boundary
 *       between two stages; the learner is placed on the lower stage of that pair,</li>
 *   <li>at the <b>floor</b>: {@value #STEPS_IN_A_ROW} wrong answers in a row at A0, placed on A0,</li>
 *   <li>at the <b>ceiling</b>: {@value #STEPS_IN_A_ROW} correct answers in a row at C2.3, placed on C2.3.</li>
 * </ul>
 * Without such an end (the item limit or the item bank ran out) the learner is placed on the last stage confirmed
 * with two correct answers in a row, but never above the current stage, since wrong answers after the confirmation
 * outweigh it; without any confirmation on the current stage.
 */
final class Staircase {

    static final int STEPS_IN_A_ROW = 2;
    static final int STABLE_REVERSALS = 3;

    private enum Direction { UP, DOWN }

    private Level current;
    private int correctInARow;
    private int wrongInARowAtFloor;
    private Level lastConfirmed;
    private Direction lastMove;
    private final Map<Level, Integer> reversalsByLowerStage = new EnumMap<>(Level.class);
    private Level stableLowerStage;
    private boolean floorReached;
    private boolean ceilingReached;

    private Staircase(Level start) {
        current = start;
    }

    static Staircase replay(PlacementState state) {
        Staircase staircase = new Staircase(state.startLevel());
        state.steps().forEach(step -> staircase.answer(step.outcome().isAccepted()));
        return staircase;
    }

    /** The stage the next item tests. */
    Level current() {
        return current;
    }

    boolean hasEnded() {
        return stableLowerStage != null || floorReached || ceilingReached;
    }

    Level placement() {
        if (stableLowerStage != null) {
            return stableLowerStage;
        }
        if (floorReached) {
            return Level.lowest();
        }
        if (ceilingReached) {
            return Level.highest();
        }
        return lastConfirmed == null || lastConfirmed.isAbove(current) ? current : lastConfirmed;
    }

    private void answer(boolean correct) {
        if (correct) {
            wrongInARowAtFloor = 0;
            correctInARow++;
            if (correctInARow == STEPS_IN_A_ROW) {
                correctInARow = 0;
                lastConfirmed = current;
                current.next().ifPresentOrElse(this::moveTo, () -> ceilingReached = true);
            }
            return;
        }
        correctInARow = 0;
        Optional<Level> lower = current.previous();
        if (lower.isPresent()) {
            moveTo(lower.get());
        } else if (++wrongInARowAtFloor == STEPS_IN_A_ROW) {
            floorReached = true;
        }
    }

    private void moveTo(Level target) {
        Direction direction = target.isAbove(current) ? Direction.UP : Direction.DOWN;
        Level lowerStage = direction == Direction.UP ? current : target;
        if (lastMove != null && lastMove != direction
                && reversalsByLowerStage.merge(lowerStage, 1, Integer::sum) == STABLE_REVERSALS) {
            stableLowerStage = lowerStage;
        }
        lastMove = direction;
        current = target;
    }
}
