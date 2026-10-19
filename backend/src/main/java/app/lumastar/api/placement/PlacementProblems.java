package app.lumastar.api.placement;

import app.lumastar.api.error.ApiProblemException;
import java.util.UUID;
import org.springframework.http.HttpStatus;

/** The expected errors of the placement API with their stable problem codes. */
final class PlacementProblems {

    private PlacementProblems() {
    }

    static ApiProblemException onboardingIncomplete() {
        return new ApiProblemException(HttpStatus.CONFLICT, "onboarding_incomplete",
                "Answer the onboarding questions (PUT /api/onboarding) before the placement test.");
    }

    static ApiProblemException noItems() {
        return new ApiProblemException(HttpStatus.CONFLICT, "placement_unavailable", "There are no placement items.");
    }

    static ApiProblemException notSkippable() {
        return new ApiProblemException(HttpStatus.CONFLICT, "placement_not_skippable",
                "Only a learner who knows no Gheg yet may skip the first placement test.");
    }

    static ApiProblemException testNotFound(UUID testId) {
        return new ApiProblemException(HttpStatus.NOT_FOUND, "placement_not_found",
                "There is no placement test %s.".formatted(testId));
    }

    static ApiProblemException testNotInProgress(UUID testId) {
        return new ApiProblemException(HttpStatus.CONFLICT, "placement_finished",
                "Placement test %s is over and takes no more answers.".formatted(testId));
    }

    static ApiProblemException testWithoutResult(UUID testId) {
        return new ApiProblemException(HttpStatus.CONFLICT, "placement_not_finished",
                "Placement test %s has no result; it is still running or was abandoned.".formatted(testId));
    }

    static ApiProblemException unexpectedItem(String exerciseId) {
        return new ApiProblemException(HttpStatus.UNPROCESSABLE_CONTENT, "unexpected_placement_item",
                "Item '%s' is not the item the test is waiting for.".formatted(exerciseId));
    }

    static ApiProblemException answerTypeMismatch(String detail) {
        return new ApiProblemException(HttpStatus.UNPROCESSABLE_CONTENT, "answer_type_mismatch", detail + ".");
    }
}
