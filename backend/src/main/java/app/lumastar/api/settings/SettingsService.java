package app.lumastar.api.settings;

import app.lumastar.api.plan.PlanService;
import app.lumastar.api.progress.DailyProgress;
import app.lumastar.persistence.PracticeCompletion;
import app.lumastar.persistence.UserEntity;
import app.lumastar.persistence.UserRepository;
import java.time.ZoneId;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The learner's settings. A changed daily goal recalculates the plan's time estimates; a changed goal or time
 * zone can meet today's goal, so the streak is evaluated again.
 */
@Service
class SettingsService {

    private final UserRepository users;
    private final PlanService plans;
    private final DailyProgress dailyProgress;

    SettingsService(UserRepository users, PlanService plans, DailyProgress dailyProgress) {
        this.users = users;
        this.plans = plans;
        this.dailyProgress = dailyProgress;
    }

    @Transactional
    SettingsResponse update(UUID userId, SettingsRequest request) {
        UserEntity learner = users.findForUpdateById(userId).orElseThrow();
        int previousGoal = learner.getDailyGoalMinutes();
        ZoneId previousZone = learner.getTimeZone();
        ZoneId zone = ZoneId.of(request.timeZone());
        learner.changeSettings(request.dailyGoalMinutes(), request.requestRetention(), zone);
        users.flush();
        plans.reviseAfterDailyGoalChange(userId, previousGoal, request.dailyGoalMinutes());
        if (previousGoal != request.dailyGoalMinutes() || !previousZone.equals(zone)) {
            dailyProgress.evaluate(userId, PracticeCompletion.NONE);
        }
        return SettingsResponse.of(learner);
    }
}
