package app.lumastar.api.plan;

import app.lumastar.persistence.LearningPlanStore;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * The daily safety net of the "every 7 learning days" revision: lesson completions check it too, but a
 * learner who stops after the seventh learning day still gets the revision. {@code lumastar.plan.periodic-revision.cron}
 * sets the time ({@code -} switches it off), {@code lumastar.plan.periodic-revision.zone} its time zone.
 */
@Component
class PeriodicPlanRevision {

    private static final Logger LOG = LoggerFactory.getLogger(PeriodicPlanRevision.class);

    private final LearningPlanStore plans;
    private final PlanTriggers triggers;

    PeriodicPlanRevision(LearningPlanStore plans, PlanTriggers triggers) {
        this.plans = plans;
        this.triggers = triggers;
    }

    @Scheduled(cron = "${lumastar.plan.periodic-revision.cron}", zone = "${lumastar.plan.periodic-revision.zone}")
    void reviseDuePlans() {
        for (UUID learner : plans.learnersWithPlan()) {
            try {
                if (triggers.revisePeriodicallyIfDue(learner)) {
                    LOG.info("Revised the plan of learner {} after {} learning days", learner, PlanTriggers.LEARNING_DAYS);
                }
            } catch (RuntimeException e) {
                LOG.error("Periodic plan revision failed for learner {}", learner, e);
            }
        }
    }
}
