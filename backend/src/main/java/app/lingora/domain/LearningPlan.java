package app.lingora.domain;

import com.fasterxml.jackson.annotation.JsonValue;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Personal path from the start level up to C2, as exported in {@code learning_plan.json} (PRD F3, 8.3). */
public record LearningPlan(
        Instant generatedAt,
        String generatedBy,
        Level startLevel,
        List<PlanStage> stages,
        Map<CefrBand, LocalDate> estimates) {

    public LearningPlan {
        Objects.requireNonNull(generatedAt, "generatedAt");
        Require.notBlank(generatedBy, "generatedBy");
        Objects.requireNonNull(startLevel, "startLevel");
        stages = List.copyOf(stages);
        estimates = Map.copyOf(estimates);
    }

    public record PlanStage(Level level, List<PlanUnit> units) {

        public PlanStage {
            Objects.requireNonNull(level, "level");
            units = List.copyOf(units);
        }
    }

    /** {@code estimatedLessons} and {@code reason} are {@code null} when not applicable. */
    public record PlanUnit(String unitId, String title, Status status, Integer estimatedLessons, String reason) {

        public PlanUnit {
            Require.notBlank(unitId, "unitId");
            Require.notBlank(title, "title");
            Objects.requireNonNull(status, "status");
        }
    }

    public enum Status implements Coded {
        PLANNED("planned"),
        IN_PROGRESS("in_progress"),
        COMPLETED("completed"),
        /** Already mastered (mastery ≥ 0.8); it stays repeatable. */
        SKIPPED("skipped");

        private final String code;

        Status(String code) {
            this.code = code;
        }

        @JsonValue
        @Override
        public String code() {
            return code;
        }
    }
}
