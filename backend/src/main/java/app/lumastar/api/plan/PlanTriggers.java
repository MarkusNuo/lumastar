package app.lumastar.api.plan;

import app.lumastar.core.plan.FocusRequest;
import app.lumastar.domain.FocusUnitId;
import app.lumastar.domain.LearningPlan;
import app.lumastar.domain.LearningPlan.PlanUnit;
import app.lumastar.domain.PlanChange;
import app.lumastar.domain.PlanChangeKind;
import app.lumastar.domain.PlanTrigger;
import app.lumastar.domain.PlanUnitStatus;
import app.lumastar.domain.SkillTag;
import app.lumastar.persistence.LearningPlanStore;
import app.lumastar.persistence.LearningPlanStore.StoredPlan;
import app.lumastar.persistence.LessonProgressQueries;
import app.lumastar.persistence.LivePlans;
import app.lumastar.persistence.UserEntity;
import app.lumastar.persistence.UserRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * When the plan is revised: after a checkpoint, every {@value #LEARNING_DAYS} learning days, and when a lesson
 * suggests a focus lesson for a tag without an open focus unit. Re-placements and daily goal changes revise
 * the plan themselves. Every revision starts its history with a German reason.
 */
@Service
public class PlanTriggers {

    /** Distinct days with at least one completed lesson since the last revision. */
    public static final int LEARNING_DAYS = 7;

    private final PlanService plans;
    private final LearningPlanStore store;
    private final LivePlans livePlans;
    private final LessonProgressQueries lessons;
    private final UserRepository users;

    PlanTriggers(PlanService plans, LearningPlanStore store, LivePlans livePlans, LessonProgressQueries lessons,
                 UserRepository users) {
        this.plans = plans;
        this.store = store;
        this.livePlans = livePlans;
        this.lessons = lessons;
        this.users = users;
    }

    /** After a completed lesson; nothing happens before the first plan. */
    @Transactional
    public void afterLesson(UUID userId, Optional<FocusRequest> focus) {
        Optional<StoredPlan> current = store.current(userId);
        if (current.isEmpty()) {
            return;
        }
        UserEntity learner = users.findById(userId).orElseThrow();
        List<PlanChange> causes = new ArrayList<>();
        int learningDays = lessons.learningDaysSince(userId, current.get().validFrom(), learner.getTimeZone());
        if (learningDays >= LEARNING_DAYS) {
            causes.add(periodic(learningDays));
        }
        List<FocusRequest> requests = focus
                .filter(request -> openFocusUnit(userId, current.get(), request.tag()).isEmpty())
                .map(List::of)
                .orElse(List.of());
        if (!causes.isEmpty() || !requests.isEmpty()) {
            plans.revise(userId, learningDays >= LEARNING_DAYS ? PlanTrigger.PERIODIC : PlanTrigger.LESSON, causes, requests);
        }
    }

    /** After a checkpoint, passed or not; the learner's level is already updated. */
    @Transactional
    public void afterCheckpoint(UUID userId, PlanChange cause, Optional<FocusRequest> focus) {
        plans.revise(userId, PlanTrigger.CHECKPOINT, List.of(cause), focus.map(List::of).orElse(List.of()));
    }

    /** The daily safety net: revises the plan if {@value #LEARNING_DAYS} learning days have passed without a revision. */
    @Transactional
    public boolean revisePeriodicallyIfDue(UUID userId) {
        Optional<StoredPlan> current = store.current(userId);
        if (current.isEmpty()) {
            return false;
        }
        UserEntity learner = users.findById(userId).orElseThrow();
        int learningDays = lessons.learningDaysSince(userId, current.get().validFrom(), learner.getTimeZone());
        if (learningDays < LEARNING_DAYS) {
            return false;
        }
        plans.revise(userId, PlanTrigger.PERIODIC, List.of(periodic(learningDays)), List.of());
        return true;
    }

    /** The open focus unit of the tag in the current plan, e.g. to offer it after a lesson. */
    @Transactional(readOnly = true)
    public Optional<String> openFocusUnit(UUID userId, SkillTag tag) {
        return store.current(userId).flatMap(current -> openFocusUnit(userId, current, tag));
    }

    private Optional<String> openFocusUnit(UUID userId, StoredPlan current, SkillTag tag) {
        UserEntity learner = users.findById(userId).orElseThrow();
        LearningPlan live = livePlans.live(userId, current, learner.getCurrentLevel());
        return live.units()
                .filter(unit -> unit.status() != PlanUnitStatus.COMPLETED)
                .map(PlanUnit::unitId)
                .filter(unitId -> FocusUnitId.parse(unitId).map(id -> id.tag().equals(tag)).orElse(false))
                .findFirst();
    }

    private static PlanChange periodic(int learningDays) {
        return new PlanChange(PlanChangeKind.REPLANNED, "Regelmässige Anpassung nach %d Lerntagen".formatted(learningDays),
                Map.of("learningDays", learningDays));
    }
}
