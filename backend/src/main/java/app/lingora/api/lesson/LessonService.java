package app.lingora.api.lesson;

import app.lingora.config.EngineProperties;
import app.lingora.core.evaluation.AnswerEvaluator;
import app.lingora.core.evaluation.UnsupportedAnswerException;
import app.lingora.core.lesson.LessonComposer;
import app.lingora.core.lesson.XpCalculator;
import app.lingora.core.lesson.XpCalculator.FirstAttempt;
import app.lingora.core.lesson.XpCalculator.LessonXp;
import app.lingora.domain.EvaluationResult;
import app.lingora.domain.Exercise;
import app.lingora.domain.Item;
import app.lingora.domain.LearnerProfile;
import app.lingora.domain.SkillMastery;
import app.lingora.domain.Unit;
import app.lingora.persistence.AttemptEntity;
import app.lingora.persistence.AttemptRepository;
import app.lingora.persistence.ContentCatalog;
import app.lingora.persistence.LessonSessionEntity;
import app.lingora.persistence.LessonSessionRepository;
import app.lingora.persistence.UserEntity;
import app.lingora.persistence.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Lesson flow of PRD F5: compose and start a lesson, evaluate and record every answer, finish with XP (F9). Mastery,
 * FSRS reviews and profile documents build on the recorded attempts in later milestones.
 */
@Service
class LessonService {

    private static final int ACCURACY_SCALE = 3;
    private static final SkillMastery NOT_TRACKED_YET = new SkillMastery(Map.of());

    private final ContentCatalog catalog;
    private final LessonSessionRepository sessions;
    private final AttemptRepository attempts;
    private final UserRepository users;
    private final LessonComposer composer;
    private final AnswerEvaluator evaluator;
    private final String engineId;
    private final Clock clock;

    LessonService(ContentCatalog catalog, LessonSessionRepository sessions, AttemptRepository attempts, UserRepository users,
                  LessonComposer composer, AnswerEvaluator evaluator, EngineProperties engineProperties, Clock clock) {
        this.catalog = catalog;
        this.sessions = sessions;
        this.attempts = attempts;
        this.users = users;
        this.composer = composer;
        this.evaluator = evaluator;
        this.engineId = engineProperties.engine().id();
        this.clock = clock;
    }

    @Transactional
    LessonResponse start(UserEntity learner, String unitId) {
        Unit unit = catalog.activeUnit(unitId).orElseThrow(() -> LessonProblems.unitNotFound(unitId));
        if (unit.isSkeleton()) {
            throw LessonProblems.unitWithoutContent(unitId);
        }
        List<Exercise> exercises = composer.compose(unit, profileOf(learner), NOT_TRACKED_YET, List.of(), List.of());
        LessonSessionEntity session = sessions.save(new LessonSessionEntity(learner.getId(), unit.id(), unit.level(),
                exercises.stream().map(Exercise::id).toList(), engineId, clock.instant()));
        return new LessonResponse(session.getId(), unit.id(), exercises.stream().map(LessonExercise::of).toList());
    }

    @Transactional
    AttemptResponse submitAttempt(UUID userId, UUID sessionId, AttemptRequest request) {
        LessonSessionEntity session = lockedSession(userId, sessionId);
        if (session.isFinished()) {
            throw LessonProblems.lessonCompleted(sessionId);
        }
        String exerciseId = request.exerciseId();
        if (!session.contains(exerciseId)) {
            throw LessonProblems.exerciseNotInLesson(exerciseId);
        }
        boolean answeredBefore = attempts.existsBySessionIdAndExerciseId(sessionId, exerciseId);
        if (answeredBefore && !request.isRetry()) {
            throw LessonProblems.alreadyAnswered(exerciseId);
        }
        if (!answeredBefore && request.isRetry()) {
            throw LessonProblems.retryBeforeFirstAttempt(exerciseId);
        }
        Exercise exercise = catalog.exercises(List.of(exerciseId)).get(exerciseId);
        EvaluationResult result = evaluate(exercise, request);
        int position = Math.toIntExact(attempts.countBySessionId(sessionId)) + 1;
        attempts.save(new AttemptEntity(userId, sessionId, position, exercise, request.isRetry(), request.answer().toJson(),
                request.responseTime(), result, engineId, clock.instant()));
        return AttemptResponse.of(exerciseId, result);
    }

    /** Idempotent: a completed lesson returns its stored result and awards no XP again. */
    @Transactional
    LessonResultResponse complete(UUID userId, UUID sessionId) {
        LessonSessionEntity session = lockedSession(userId, sessionId);
        if (!session.isFinished()) {
            finish(userId, session);
        }
        return LessonResultResponse.of(session, learnedItems(session), users.xpTotalOf(userId));
    }

    private void finish(UUID userId, LessonSessionEntity session) {
        List<AttemptEntity> firstAttempts = attempts.findBySessionIdAndRetryFalseOrderByPosition(session.getId());
        int unanswered = session.getExerciseIds().size() - firstAttempts.size();
        if (unanswered > 0) {
            throw LessonProblems.lessonIncomplete(unanswered);
        }
        LessonXp xp = XpCalculator.calculate(firstAttempts.stream()
                .map(attempt -> new FirstAttempt(attempt.countsAsCorrect(), attempt.responseTime()))
                .toList());
        int correct = (int) firstAttempts.stream().filter(AttemptEntity::countsAsCorrect).count();
        BigDecimal accuracy = BigDecimal.valueOf(correct)
                .divide(BigDecimal.valueOf(firstAttempts.size()), ACCURACY_SCALE, RoundingMode.HALF_UP);
        session.finish(clock.instant(), correct, accuracy, xp);
        users.addXp(userId, xp.total());
    }

    private EvaluationResult evaluate(Exercise exercise, AttemptRequest request) {
        try {
            return evaluator.evaluate(exercise, request.answer().toDomain(request.responseTime()));
        } catch (UnsupportedAnswerException e) {
            throw LessonProblems.answerTypeMismatch(e.getMessage());
        }
    }

    private LessonSessionEntity lockedSession(UUID userId, UUID sessionId) {
        return sessions.findForUpdateByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> LessonProblems.lessonNotFound(sessionId));
    }

    /** The items of the lesson's exercises, in the order the exercises were played. */
    private List<Item> learnedItems(LessonSessionEntity session) {
        Map<String, Exercise> exercises = catalog.exercises(session.getExerciseIds());
        List<String> itemIds = session.getExerciseIds().stream()
                .flatMap(exerciseId -> exercises.get(exerciseId).itemIds().stream())
                .distinct()
                .toList();
        return catalog.items(Set.copyOf(itemIds)).stream()
                .sorted(Comparator.comparingInt(item -> itemIds.indexOf(item.id())))
                .toList();
    }

    private static LearnerProfile profileOf(UserEntity learner) {
        return new LearnerProfile(learner.getId(), learner.getDisplayName(), Set.of(), learner.getDailyGoalMinutes(),
                learner.getCurrentLevel(), learner.getXpTotal());
    }
}
