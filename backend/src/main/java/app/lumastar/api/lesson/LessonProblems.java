package app.lumastar.api.lesson;

import app.lumastar.api.error.ApiProblemException;
import app.lumastar.domain.Level;
import app.lumastar.domain.SkillTag;
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

    static ApiProblemException nothingToPractise(SkillTag tag) {
        return new ApiProblemException(HttpStatus.CONFLICT, "no_practice_exercises",
                "No lesson exercise at or below the learner's level practises '%s'.".formatted(tag.id()));
    }

    static ApiProblemException checkpointNotFound(Level level) {
        return new ApiProblemException(HttpStatus.NOT_FOUND, "checkpoint_not_found",
                "The current plan has no stage %s.".formatted(level.code()));
    }

    static ApiProblemException checkpointLocked(Level level) {
        return new ApiProblemException(HttpStatus.CONFLICT, "checkpoint_locked",
                "The checkpoint %s opens once every unit of the stage with exercises is completed or skipped."
                        .formatted(level.code()));
    }

    static ApiProblemException checkpointPassed(Level level) {
        return new ApiProblemException(HttpStatus.CONFLICT, "checkpoint_passed",
                "The checkpoint %s has been passed already.".formatted(level.code()));
    }

    static ApiProblemException nothingDue() {
        return new ApiProblemException(HttpStatus.CONFLICT, "no_reviews_due",
                "No item is due for review that an exercise at or below the learner's level practises.");
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

    static ApiProblemException retryAfterCorrectAnswer(String exerciseId) {
        return new ApiProblemException(HttpStatus.CONFLICT, "exercise_already_correct",
                "Exercise '%s' has already been answered correctly in this lesson.".formatted(exerciseId));
    }

    static ApiProblemException answerTypeMismatch(String detail) {
        return new ApiProblemException(HttpStatus.UNPROCESSABLE_CONTENT, "answer_type_mismatch", detail + ".");
    }

    static ApiProblemException invalidAnswer(String detail) {
        return new ApiProblemException(HttpStatus.UNPROCESSABLE_CONTENT, "invalid_answer", detail + ".");
    }
}
