package app.lingora.api.plan;

import app.lingora.core.plan.PlanProgress;
import app.lingora.domain.FocusUnitId;
import app.lingora.domain.LearningPlan;
import app.lingora.domain.Level;
import app.lingora.persistence.ContentCatalog;
import app.lingora.persistence.LearningPlanStore;
import app.lingora.persistence.LearningPlanStore.StoredPlan;
import app.lingora.persistence.LessonProgressQueries;
import app.lingora.persistence.LessonProgressQueries.FocusLesson;
import app.lingora.persistence.UnitEntity;
import app.lingora.persistence.UnitRepository;
import java.time.Instant;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * The stored plan with the learner's progress since (PRD 12.3). A curriculum unit counts its completed lessons; a
 * focus unit counts the completed focus lessons on its skill tag since it was inserted into the plan. A focus unit
 * is playable when lesson exercises with its tag exist at or below the learner's level.
 */
@Component
class LivePlans {

    private final LessonProgressQueries lessons;
    private final LearningPlanStore plans;
    private final UnitRepository units;
    private final ContentCatalog catalog;

    LivePlans(LessonProgressQueries lessons, LearningPlanStore plans, UnitRepository units, ContentCatalog catalog) {
        this.lessons = lessons;
        this.plans = plans;
        this.units = units;
        this.catalog = catalog;
    }

    record Progress(Map<String, Integer> lessonsCompleted, Set<String> playable) {
    }

    @Transactional(readOnly = true)
    Progress progress(UUID userId, StoredPlan stored, Level learnerLevel) {
        Map<String, Integer> completed = new HashMap<>(lessons.completedLessonsByUnit(userId));
        Set<String> playable = units.findByRetiredAtIsNullOrderByPosition().stream()
                .filter(UnitEntity::hasContent)
                .map(UnitEntity::getId)
                .collect(Collectors.toCollection(HashSet::new));
        List<FocusUnitId> focusUnits = stored.plan().units()
                .map(unit -> FocusUnitId.parse(unit.unitId()))
                .flatMap(Optional::stream)
                .toList();
        if (!focusUnits.isEmpty()) {
            Map<String, Instant> insertedAt = plans.focusInsertions(userId);
            List<FocusLesson> focusLessons = lessons.completedFocusLessons(userId);
            for (FocusUnitId focus : focusUnits) {
                Instant since = insertedAt.getOrDefault(focus.id(), stored.validFrom());
                completed.put(focus.id(), (int) focusLessons.stream()
                        .filter(lesson -> lesson.skillTags().contains(focus.tag()) && !lesson.startedAt().isBefore(since))
                        .count());
                if (learnerLevel != null && !catalog.lessonExercisesWithSkillTag(focus.tag(), learnerLevel).isEmpty()) {
                    playable.add(focus.id());
                }
            }
        }
        return new Progress(completed, playable);
    }

    @Transactional(readOnly = true)
    LearningPlan live(UUID userId, StoredPlan stored, Level learnerLevel) {
        Progress progress = progress(userId, stored, learnerLevel);
        return PlanProgress.apply(stored.plan(), progress.lessonsCompleted(), progress.playable());
    }
}
