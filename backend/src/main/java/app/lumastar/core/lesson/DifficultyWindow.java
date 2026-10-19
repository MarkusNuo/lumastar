package app.lumastar.core.lesson;

import app.lumastar.domain.Exercise;
import java.util.List;

/**
 * The difficulties a lesson prefers within its unit (PRD F7): harder when the last two lessons of the unit both had an
 * accuracy above {@value #HARDER_ABOVE}, easier when both were below {@value #EASIER_BELOW}.
 */
enum DifficultyWindow {
    EASIER(Exercise.MIN_DIFFICULTY, Exercise.MAX_DIFFICULTY - 1),
    USUAL(Exercise.MIN_DIFFICULTY, Exercise.MAX_DIFFICULTY),
    HARDER(Exercise.MIN_DIFFICULTY + 1, Exercise.MAX_DIFFICULTY);

    static final double HARDER_ABOVE = 0.9;
    static final double EASIER_BELOW = 0.6;
    static final int LESSONS = LessonContext.RECENT_UNIT_LESSONS;

    private final int lowest;
    private final int highest;

    DifficultyWindow(int lowest, int highest) {
        this.lowest = lowest;
        this.highest = highest;
    }

    /** @param recentAccuracies the accuracy of the last lessons of the unit, newest first */
    static DifficultyWindow after(List<Double> recentAccuracies) {
        if (recentAccuracies.size() < LESSONS) {
            return USUAL;
        }
        List<Double> lastLessons = recentAccuracies.subList(0, LESSONS);
        if (lastLessons.stream().allMatch(accuracy -> accuracy > HARDER_ABOVE)) {
            return HARDER;
        }
        if (lastLessons.stream().allMatch(accuracy -> accuracy < EASIER_BELOW)) {
            return EASIER;
        }
        return USUAL;
    }

    boolean contains(Exercise exercise) {
        return exercise.difficulty() >= lowest && exercise.difficulty() <= highest;
    }
}
