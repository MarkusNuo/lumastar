package app.lingora.api.lesson;

import app.lingora.api.error.ApiProblemException;
import java.util.UUID;
import org.springframework.http.HttpStatus;

/** The expected errors of the lesson API with their stable problem codes. */
final class LessonProblems {

    private LessonProblems() {
    }

    static ApiProblemException unitNotFound(String unitId) {
        return new ApiProblemException(HttpStatus.NOT_FOUND, "unit_not_found", "There is no unit '%s'.".formatted(unitId));
    }

    static ApiProblemException unitWithoutContent(String unitId) {
        return new ApiProblemException(HttpStatus.CONFLICT, "unit_without_content",
                "Unit '%s' has no exercises yet.".formatted(unitId));
    }

    static ApiProblemException lessonNotFound(UUID sessionId) {
        return new ApiProblemException(HttpStatus.NOT_FOUND, "lesson_not_found", "There is no lesson %s.".formatted(sessionId));
    }

    static ApiProblemException lessonCompleted(UUID sessionId) {
        return new ApiProblemException(HttpStatus.CONFLICT, "lesson_completed",
                "Lesson %s is completed and takes no more answers.".formatted(sessionId));
    }

    static ApiProblemException lessonIncomplete(int unanswered) {
        return new ApiProblemException(HttpStatus.CONFLICT, "lesson_incomplete",
                "%d exercise(s) of the lesson have not been answered yet.".formatted(unanswered));
    }

    static ApiProblemException exerciseNotInLesson(String exerciseId) {
        return new ApiProblemException(HttpStatus.UNPROCESSABLE_CONTENT, "exercise_not_in_lesson",
                "Exercise '%s' is not part of this lesson.".formatted(exerciseId));
    }

    static ApiProblemException alreadyAnswered(String exerciseId) {
        return new ApiProblemException(HttpStatus.CONFLICT, "exercise_already_answered",
                "Exercise '%s' has been answered; send a repetition with retry = true.".formatted(exerciseId));
    }

    static ApiProblemException retryBeforeFirstAttempt(String exerciseId) {
        return new ApiProblemException(HttpStatus.CONFLICT, "retry_before_first_attempt",
                "Exercise '%s' has not been answered yet, so it cannot be retried.".formatted(exerciseId));
    }

    static ApiProblemException answerTypeMismatch(String detail) {
        return new ApiProblemException(HttpStatus.UNPROCESSABLE_CONTENT, "answer_type_mismatch", detail + ".");
    }
}
