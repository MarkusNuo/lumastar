package app.lingora.api.lesson;

import app.lingora.core.lesson.LessonContext;
import app.lingora.persistence.ErrorAnalysisQueries;
import app.lingora.persistence.LessonProgressQueries;
import app.lingora.persistence.SkillMasteryStore;
import app.lingora.persistence.SrsCardStore;
import app.lingora.persistence.UserEntity;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;

/** Reads what the composer needs to know about the learner (PRD F7). */
@Component
class LessonContexts {

    /** Weak skill tags are judged by the answers of this period (PRD F7). */
    static final Duration RECENT_ERRORS = Duration.ofDays(14);
    /** The most overdue cards a lesson considers. */
    static final int DUE_CARDS = 50;

    private final SkillMasteryStore mastery;
    private final SrsCardStore cards;
    private final ErrorAnalysisQueries errors;
    private final LessonProgressQueries progress;

    LessonContexts(SkillMasteryStore mastery, SrsCardStore cards, ErrorAnalysisQueries errors, LessonProgressQueries progress) {
        this.mastery = mastery;
        this.cards = cards;
        this.errors = errors;
        this.progress = progress;
    }

    /** @param unitId the curriculum unit of the lesson, whose recent accuracies steer its difficulty; {@code null} for none */
    LessonContext of(UserEntity learner, Instant now, String unitId) {
        UUID userId = learner.getId();
        return new LessonContext(learner.toProfile(), mastery.effective(userId, now), cards.dueCards(userId, now, DUE_CARDS),
                errors.errorRatesBySkillTag(userId, now.minus(RECENT_ERRORS)), progress.practisedExercises(userId),
                unitId == null ? List.of() : progress.recentAccuracies(userId, unitId, LessonContext.RECENT_UNIT_LESSONS));
    }
}
