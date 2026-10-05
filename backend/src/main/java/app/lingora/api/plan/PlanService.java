package app.lingora.api.plan;

import app.lingora.core.plan.FocusRequest;
import app.lingora.core.plan.PlanChanges;
import app.lingora.core.plan.PlanGenerator;
import app.lingora.core.plan.PlanGeneratorFactory;
import app.lingora.core.plan.ProvenMastery;
import app.lingora.domain.LearnerProfile;
import app.lingora.domain.LearningPlan;
import app.lingora.domain.PlanChange;
import app.lingora.domain.PlanChangeKind;
import app.lingora.domain.PlanTrigger;
import app.lingora.domain.SkillMastery;
import app.lingora.domain.SkillTag;
import app.lingora.domain.SkillTagErrorRate;
import app.lingora.persistence.ContentCatalog;
import app.lingora.persistence.ErrorAnalysisQueries;
import app.lingora.persistence.LearningPlanStore;
import app.lingora.persistence.LearningPlanStore.StoredPlan;
import app.lingora.persistence.LessonProgressQueries;
import app.lingora.persistence.LivePlans;
import app.lingora.persistence.SkillMasteryStore;
import app.lingora.persistence.UserEntity;
import app.lingora.persistence.UserRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The learning plan of PRD F3. {@link #revise} is the single entry point for every (re)calculation: after the
 * placement test, after a re-placement, after a change of the daily goal, after checkpoints and every 7 learning days.
 */
@Service
public class PlanService {

    private final UserRepository users;
    private final LearningPlanStore plans;
    private final LivePlans livePlans;
    private final ContentCatalog catalog;
    private final SkillMasteryStore mastery;
    private final ErrorAnalysisQueries errors;
    private final LessonProgressQueries lessons;
    private final PlanGeneratorFactory generators;
    private final Clock clock;

    PlanService(UserRepository users, LearningPlanStore plans, LivePlans livePlans, ContentCatalog catalog,
                SkillMasteryStore mastery, ErrorAnalysisQueries errors, LessonProgressQueries lessons,
                PlanGeneratorFactory generators, Clock clock) {
        this.users = users;
        this.plans = plans;
        this.livePlans = livePlans;
        this.catalog = catalog;
        this.mastery = mastery;
        this.errors = errors;
        this.lessons = lessons;
        this.generators = generators;
        this.clock = clock;
    }

    /**
     * Stores a new plan version: the first plan if there is none yet, otherwise the current plan revised with the
     * progress, mastery and error rates of the learner. The learner must be placed.
     *
     * @param cause the first entry of the plan history for this version, e.g. "Neueinstufung: A1.2 → A2.1"; the
     *              changes found between the two versions follow it
     */
    @Transactional
    public StoredPlan revise(UUID userId, PlanTrigger trigger, PlanChange cause) {
        return revise(userId, trigger, List.of(cause), List.of()).orElseThrow();
    }

    /**
     * Like {@link #revise(UUID, PlanTrigger, PlanChange)} with several causes, and with focus units lessons asked for
     * (PRD F7). A request is a cause only if the new version inserts a focus unit for its tag; without any cause, no
     * version is stored.
     *
     * @param causes the first entries of the plan history for this version
     * @return the new version, empty if there was no cause
     */
    @Transactional
    public Optional<StoredPlan> revise(UUID userId, PlanTrigger trigger, List<PlanChange> causes,
                                       List<FocusRequest> focusRequests) {
        UserEntity learner = users.findForUpdateById(userId).orElseThrow();
        Instant now = clock.instant();
        LearnerProfile profile = learner.toProfile();
        SkillMastery provenMastery = ProvenMastery.of(mastery.effective(userId, now), lessons.lessonsPerSkillTag(userId));
        Map<SkillTag, String> labels = catalog.skillTagLabels();
        PlanGenerator generator = generators.create(catalog.curriculumOutline(), labels);

        Optional<StoredPlan> previous = plans.current(userId);
        LearningPlan before = previous.map(stored -> livePlans.live(userId, stored, profile.currentLevel())).orElse(null);
        List<SkillTagErrorRate> errorRates = practisableErrorRates(userId, profile, now);
        LearningPlan plan = before == null
                ? generator.generate(profile, provenMastery)
                : generator.revise(before, profile, provenMastery, errorRates, focusRequests);

        List<PlanChange> changes = new ArrayList<>(causes);
        changes.addAll(PlanChanges.requestedFocus(before, plan, focusRequests, labels));
        if (changes.isEmpty()) {
            return Optional.empty();
        }
        StoredPlan stored = plans.save(userId, plan, now);
        changes.addAll(PlanChanges.between(before, plan, labels, errorRates));
        plans.logChanges(userId, stored.id(), trigger, changes, now);
        return Optional.of(stored);
    }

    /** The time estimates depend on the daily goal (PRD F3): a changed goal recalculates an existing plan. */
    @Transactional
    public void reviseAfterDailyGoalChange(UUID userId, int goalBefore, int goalAfter) {
        if (goalBefore == goalAfter || !hasPlan(userId)) {
            return;
        }
        revise(userId, PlanTrigger.MANUAL, new PlanChange(PlanChangeKind.REPLANNED,
                "Tagesziel geändert: %d → %d Min. pro Tag".formatted(goalBefore, goalAfter),
                Map.of("dailyGoalMinutesBefore", goalBefore, "dailyGoalMinutes", goalAfter)));
    }

    /**
     * Recent error rates of the tags with lesson exercises up to the learner's level: of its own accord, the plan inserts
     * no focus units above it, e.g. for the errors that led to a re-placement downwards.
     */
    private List<SkillTagErrorRate> practisableErrorRates(UUID userId, LearnerProfile profile, Instant now) {
        Set<SkillTag> practisable = catalog.lessonSkillTags(profile.currentLevel());
        return errors.errorRatesBySkillTag(userId, now.minus(SkillTagErrorRate.RECENT_PERIOD)).stream()
                .filter(rate -> practisable.contains(rate.tag()))
                .toList();
    }

    @Transactional(readOnly = true)
    public boolean hasPlan(UUID userId) {
        return plans.current(userId).isPresent();
    }
}
