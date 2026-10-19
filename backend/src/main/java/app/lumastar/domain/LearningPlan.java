package app.lumastar.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.TreeMap;
import java.util.stream.Stream;

/**
 * Personal path from the start level up to C2, as exported in {@code learning_plan.json} (PRD F3, 8.3).
 * {@code estimates} holds per CEFR band the date by which its last stage is expected to be done, in band order.
 */
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
        estimates = Collections.unmodifiableMap(new TreeMap<>(estimates));
        Require.distinct(stages.stream().flatMap(stage -> stage.units().stream()).map(PlanUnit::unitId).toList(),
                "unit ids of the plan");
    }

    /** All units in path order. */
    public Stream<PlanUnit> units() {
        return stages.stream().flatMap(stage -> stage.units().stream());
    }

    public Optional<PlanUnit> unit(String unitId) {
        return units().filter(unit -> unit.unitId().equals(unitId)).findFirst();
    }

    public record PlanStage(Level level, List<PlanUnit> units) {

        public PlanStage {
            Objects.requireNonNull(level, "level");
            units = List.copyOf(units);
        }
    }

    /** {@code estimatedLessons} and {@code reason} are {@code null} when not applicable. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record PlanUnit(String unitId, String title, PlanUnitStatus status, Integer estimatedLessons, String reason) {

        public PlanUnit {
            Require.notBlank(unitId, "unitId");
            Require.notBlank(title, "title");
            Objects.requireNonNull(status, "status");
            Require.that(estimatedLessons == null || estimatedLessons > 0, "estimatedLessons of %s must be positive", unitId);
        }

        /** The lessons the unit takes; a unit without an estimate counts as one lesson. */
        public int lessonCount() {
            return estimatedLessons == null ? 1 : estimatedLessons;
        }

        @JsonIgnore
        public boolean isFocus() {
            return FocusUnitId.isFocus(unitId);
        }

        public PlanUnit withStatus(PlanUnitStatus newStatus) {
            return new PlanUnit(unitId, title, newStatus, estimatedLessons, reason);
        }
    }
}
