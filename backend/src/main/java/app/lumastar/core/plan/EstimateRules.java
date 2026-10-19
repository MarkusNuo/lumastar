package app.lumastar.core.plan;

import app.lumastar.domain.CefrBand;
import app.lumastar.domain.Level;
import java.util.Arrays;

/**
 * The constants of the plan's time estimates: the minutes of a lesson and, per CEFR band, the guided learning
 * hours it takes from zero to the end of that band. The default hours are upper-middle values of Cambridge's
 * guided-learning-hour ranges; they keep a plan with few written lessons (B1–C2 are a skeleton in the MVP) from
 * promising C2 within months.
 */
public record EstimateRules(int minutesPerLesson, int a1Hours, int a2Hours, int b1Hours, int b2Hours, int c1Hours,
                            int c2Hours) {

    public static final EstimateRules DEFAULT = new EstimateRules(4, 90, 190, 375, 550, 750, 1100);

    private static final int STAGES_PER_BAND = 3;

    public EstimateRules {
        if (minutesPerLesson <= 0) {
            throw new IllegalArgumentException("minutesPerLesson must be positive");
        }
        int[] hours = {a1Hours, a2Hours, b1Hours, b2Hours, c1Hours, c2Hours};
        for (int i = 0; i < hours.length; i++) {
            if (hours[i] < (i == 0 ? 0 : hours[i - 1])) {
                throw new IllegalArgumentException("the cumulative hours must not decrease: " + Arrays.toString(hours));
            }
        }
    }

    /** The guided learning minutes from the start of {@code level} to the end of {@code band}; 0 if already there. */
    long minutesFrom(Level level, CefrBand band) {
        double hours = cumulativeHours(band) - hoursReached(level);
        return Math.max(0, Math.round(hours * 60));
    }

    /** The hours up to the start of a stage: its band's hours are split in thirds by sub-stage (A1.1, A1.2, A1.3). */
    private double hoursReached(Level level) {
        if (level.band() == CefrBand.A0) {
            return 0;
        }
        int before = cumulativeHours(CefrBand.values()[level.band().ordinal() - 1]);
        long stagesBefore = Arrays.stream(Level.values()).filter(stage -> stage.band() == level.band() && level.isAbove(stage)).count();
        return before + (cumulativeHours(level.band()) - before) * stagesBefore / (double) STAGES_PER_BAND;
    }

    private int cumulativeHours(CefrBand band) {
        return switch (band) {
            case A0 -> 0;
            case A1 -> a1Hours;
            case A2 -> a2Hours;
            case B1 -> b1Hours;
            case B2 -> b2Hours;
            case C1 -> c1Hours;
            case C2 -> c2Hours;
        };
    }
}
