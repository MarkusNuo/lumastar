package app.lumastar.api.plan;

import app.lumastar.content.ContentSeeded;
import app.lumastar.persistence.LearningPlanStore;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Once the seed has added or retired units, revises every plan, so that learners see new units on their path at once
 * rather than at the next revision. The next start finds no new units and leaves the plans alone. A learner whose
 * revision fails keeps the plan; the other learners and the startup go on.
 */
@Component
class CoursePlanRevision {

    private static final Logger LOG = LoggerFactory.getLogger(CoursePlanRevision.class);

    private final LearningPlanStore plans;
    private final PlanService planService;

    CoursePlanRevision(LearningPlanStore plans, PlanService planService) {
        this.plans = plans;
        this.planService = planService;
    }

    @EventListener
    void reviseAfterSeed(ContentSeeded seeded) {
        if (!seeded.summary().unitsChanged()) {
            return;
        }
        List<UUID> learners = plans.learnersWithPlan();
        int revised = 0;
        for (UUID learner : learners) {
            try {
                if (planService.reviseForChangedCourse(learner).isPresent()) {
                    revised++;
                }
            } catch (RuntimeException e) {
                LOG.error("Plan revision for the changed course failed for learner {}", learner, e);
            }
        }
        LOG.info("Course units changed: revised the plans of {} of {} learners", revised, learners.size());
    }
}
