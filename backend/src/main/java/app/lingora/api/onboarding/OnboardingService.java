package app.lingora.api.onboarding;

import app.lingora.persistence.UserEntity;
import app.lingora.persistence.UserRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The onboarding questions of PRD F1: motivation, daily goal and self-assessment. */
@Service
class OnboardingService {

    private final UserRepository users;

    OnboardingService(UserRepository users) {
        this.users = users;
    }

    @Transactional
    OnboardingResponse answer(UUID userId, OnboardingRequest request) {
        UserEntity user = users.findForUpdateById(userId).orElseThrow();
        user.answerOnboarding(request.motivations(), request.dailyGoalMinutes(), request.selfAssessment());
        return new OnboardingResponse(user.placementStartLevel(), user.maySkipPlacement());
    }
}
