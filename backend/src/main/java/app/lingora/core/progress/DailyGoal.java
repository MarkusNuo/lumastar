package app.lingora.core.progress;

import java.time.Duration;
import java.util.List;

/** The daily goal ring of PRD F9: whole minutes practised on one day against the learner's goal. */
public record DailyGoal(int minutes, int goalMinutes) {

    /** The goals a learner can choose (PRD F1), in minutes per day. */
    public static final List<Integer> OPTIONS = List.of(5, 10, 15, 20);

    public DailyGoal {
        if (minutes < 0 || goalMinutes <= 0) {
            throw new IllegalArgumentException("minutes (%d) must not be negative and the goal (%d) must be positive"
                    .formatted(minutes, goalMinutes));
        }
    }

    public static DailyGoal of(Duration practised, int goalMinutes) {
        return new DailyGoal(PracticeTime.minutes(practised), goalMinutes);
    }

    public boolean met() {
        return minutes >= goalMinutes;
    }
}
