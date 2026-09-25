package app.lingora.api.onboarding;

import app.lingora.api.plan.PlanService;
import app.lingora.domain.PlanChange;
import app.lingora.domain.PlanChangeKind;
import app.lingora.domain.PlanTrigger;
import app.lingora.persistence.UserEntity;
import app.lingora.persistence.UserRepository;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The onboarding questions of PRD F1: motivation, daily goal and self-assessment. A changed daily goal changes the
 * time estimates, so an existing plan is recalculated.
 */
@Service
class OnboardingService {

    private final UserRepository users;
    private final PlanService plans;

    OnboardingService(UserRepository users, PlanService plans) {
        this.users = users;
        this.plans = plans;
    }

    @Transactional
    OnboardingResponse answer(UUID userId, OnboardingRequest request) {
        UserEntity user = users.findForUpdateById(userId).orElseThrow();
        int previousGoal = user.getDailyGoalMinutes();
        user.answerOnboarding(request.motivations(), request.dailyGoalMinutes(), request.selfAssessment());
        if (previousGoal != request.dailyGoalMinutes() && plans.hasPlan(userId)) {
            users.flush();
            plans.revise(userId, PlanTrigger.MANUAL, new PlanChange(PlanChangeKind.REPLANNED,
                    "Tagesziel geändert: %d → %d Min. pro Tag".formatted(previousGoal, request.dailyGoalMinutes()),
                    Map.of("dailyGoalMinutesBefore", previousGoal, "dailyGoalMinutes", request.dailyGoalMinutes())));
        }
        return new OnboardingResponse(user.placementStartLevel(), user.maySkipPlacement());
    }
}
