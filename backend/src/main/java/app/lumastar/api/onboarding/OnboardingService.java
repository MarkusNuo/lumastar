package app.lumastar.api.onboarding;

import app.lumastar.api.plan.PlanService;
import app.lumastar.api.progress.DailyProgress;
import app.lumastar.persistence.PracticeCompletion;
import app.lumastar.persistence.UserEntity;
import app.lumastar.persistence.UserRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The onboarding questions: motivation, daily goal and self-assessment. A changed daily goal changes the
 * time estimates, so an existing plan is recalculated, and a lower goal may already be met today.
 */
@Service
class OnboardingService {

    private final UserRepository users;
    private final PlanService plans;
    private final DailyProgress dailyProgress;

    OnboardingService(UserRepository users, PlanService plans, DailyProgress dailyProgress) {
        this.users = users;
        this.plans = plans;
        this.dailyProgress = dailyProgress;
    }

    @Transactional
    OnboardingResponse answer(UUID userId, OnboardingRequest request) {
        UserEntity user = users.findForUpdateById(userId).orElseThrow();
        int previousGoal = user.getDailyGoalMinutes();
        user.answerOnboarding(request.motivations(), request.dailyGoalMinutes(), request.selfAssessment());
        if (previousGoal != request.dailyGoalMinutes()) {
            users.flush();
            plans.reviseAfterDailyGoalChange(userId, previousGoal, request.dailyGoalMinutes());
            dailyProgress.evaluate(userId, PracticeCompletion.NONE);
        }
        return new OnboardingResponse(user.placementStartLevel(), user.maySkipPlacement());
    }
}
