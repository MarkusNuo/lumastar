package app.lingora.core.plan;

import app.lingora.domain.LearnerProfile;
import app.lingora.domain.LearningPlan;
import app.lingora.domain.LearningPlan.PlanStage;
import app.lingora.domain.LearningPlan.PlanUnit;
import app.lingora.domain.Level;
import app.lingora.domain.PlanUnitStatus;
import app.lingora.domain.SkillMastery;
import app.lingora.domain.SkillTag;
import app.lingora.domain.SkillTagErrorRate;
import app.lingora.domain.Stage;
import app.lingora.domain.Unit;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Phase 1 learning plan (PRD F3): every stage from the current level up to C2.3 with its units in curriculum order.
 * <ul>
 *   <li>A unit whose skill tags all have a mastery of at least {@value #MASTERED} is {@code skipped}; it stays
 *       repeatable. All other units are {@code planned}.</li>
 *   <li>{@link #revise} regenerates the plan and keeps the progress of the previous plan: completed units stay
 *       completed with their lessons and reason (a skip reason no longer applies), and the unit in progress stays in
 *       progress, mastered or not. It shortens a unit still to do, the one in progress included, by one lesson (to at
 *       least one) when some of its skill tags are mastered, and inserts focus units for requested and weak tags (see
 *       {@link FocusPlanner}).</li>
 *   <li>Estimates: see {@link PlanEstimates} and {@link EstimateRules}.</li>
 * </ul>
 * The mastery passed in decides what counts as mastered; callers pass the {@link ProvenMastery}. A unit without a
 * lesson estimate in the curriculum is planned with {@value #DEFAULT_LESSONS_PER_UNIT} lessons.
 */
public final class RuleBasedPlanGenerator implements PlanGenerator {

    public static final String ID = "rule_based_v1";
    public static final double MASTERED = 0.8;
    public static final int DEFAULT_LESSONS_PER_UNIT = 4;
    static final String SKIPPED_REASON = "Bereits beherrscht";

    private final List<Stage> curriculum;
    private final SkillTagLabels labels;
    private final Clock clock;
    private final EstimateRules estimateRules;

    public RuleBasedPlanGenerator(List<Stage> curriculum, Map<SkillTag, String> skillTagLabels, Clock clock) {
        this(curriculum, skillTagLabels, clock, EstimateRules.DEFAULT);
    }

    RuleBasedPlanGenerator(List<Stage> curriculum, Map<SkillTag, String> skillTagLabels, Clock clock,
                           EstimateRules estimateRules) {
        this.curriculum = List.copyOf(curriculum);
        this.labels = new SkillTagLabels(skillTagLabels);
        this.clock = clock;
        this.estimateRules = estimateRules;
    }

    @Override
    public LearningPlan generate(LearnerProfile profile, SkillMastery mastery) {
        return plan(profile, curriculumFrom(currentLevel(profile), mastery));
    }

    @Override
    public LearningPlan revise(LearningPlan plan, LearnerProfile profile, SkillMastery mastery,
                               List<SkillTagErrorRate> errorRates, List<FocusRequest> focusRequests) {
        List<PlanStage> stages = curriculumFrom(currentLevel(profile), mastery).stream()
                .map(stage -> new PlanStage(stage.level(), stage.units().stream()
                        .map(unit -> shortenIfPartlyMastered(withProgress(unit, plan), mastery))
                        .toList()))
                .toList();
        return plan(profile, new FocusPlanner(labels).insert(stages, plan, errorRates, focusRequests));
    }

    private LearningPlan plan(LearnerProfile profile, List<PlanStage> stages) {
        Instant now = clock.instant().truncatedTo(ChronoUnit.SECONDS);
        LocalDate today = LocalDate.ofInstant(now, clock.getZone());
        return new LearningPlan(now, ID, currentLevel(profile), stages,
                PlanEstimates.of(stages, currentLevel(profile), profile.dailyGoalMinutes(), today, estimateRules));
    }

    private List<PlanStage> curriculumFrom(Level level, SkillMastery mastery) {
        return curriculum.stream()
                .filter(stage -> !level.isAbove(stage.level()))
                .map(stage -> new PlanStage(stage.level(), stage.units().stream().map(unit -> planUnit(unit, mastery)).toList()))
                .toList();
    }

    private static PlanUnit planUnit(Unit unit, SkillMastery mastery) {
        int lessons = unit.estimatedLessons() == null ? DEFAULT_LESSONS_PER_UNIT : unit.estimatedLessons();
        boolean mastered = !unit.skillTags().isEmpty() && unit.skillTags().stream().allMatch(tag -> isMastered(tag, mastery));
        return mastered
                ? new PlanUnit(unit.id(), unit.title(), PlanUnitStatus.SKIPPED, lessons, SKIPPED_REASON)
                : new PlanUnit(unit.id(), unit.title(), PlanUnitStatus.PLANNED, lessons, null);
    }

    /** Completed stays completed as it was done; the unit in progress stays in progress, even if mastered by now. */
    private static PlanUnit withProgress(PlanUnit unit, LearningPlan previous) {
        Optional<PlanUnit> before = previous.unit(unit.unitId());
        if (before.isEmpty()) {
            return unit;
        }
        PlanUnit earlier = before.get();
        if (earlier.status() == PlanUnitStatus.COMPLETED) {
            String reason = SKIPPED_REASON.equals(earlier.reason()) ? null : earlier.reason();
            return new PlanUnit(unit.unitId(), unit.title(), PlanUnitStatus.COMPLETED, earlier.estimatedLessons(), reason);
        }
        if (earlier.status() == PlanUnitStatus.IN_PROGRESS) {
            return new PlanUnit(unit.unitId(), unit.title(), PlanUnitStatus.IN_PROGRESS, unit.estimatedLessons(), null);
        }
        return unit;
    }

    private PlanUnit shortenIfPartlyMastered(PlanUnit unit, SkillMastery mastery) {
        if (unit.status().isDone() || unit.lessonCount() == 1) {
            return unit;
        }
        List<SkillTag> tags = unitTags(unit.unitId());
        List<SkillTag> mastered = tags.stream().filter(tag -> isMastered(tag, mastery)).toList();
        if (mastered.isEmpty()) {
            return unit;
        }
        return new PlanUnit(unit.unitId(), unit.title(), unit.status(), unit.lessonCount() - 1,
                "Verkürzt: " + labels.join(mastered) + " bereits beherrscht");
    }

    private List<SkillTag> unitTags(String unitId) {
        return curriculum.stream()
                .flatMap(stage -> stage.units().stream())
                .filter(unit -> unit.id().equals(unitId))
                .findFirst()
                .map(Unit::skillTags)
                .orElseGet(List::of);
    }

    private static boolean isMastered(SkillTag tag, SkillMastery mastery) {
        SkillMastery.Entry entry = mastery.entries().get(tag);
        return entry != null && entry.mastery() >= MASTERED;
    }

    private static Level currentLevel(LearnerProfile profile) {
        if (profile.currentLevel() == null) {
            throw new IllegalArgumentException("A plan needs the learner's level; place the learner first");
        }
        return profile.currentLevel();
    }
}
