package app.lingora.api.lesson;

import app.lingora.config.EngineProperties;
import app.lingora.core.evaluation.AnswerEvaluator;
import app.lingora.core.evaluation.InvalidAnswerException;
import app.lingora.core.evaluation.UnsupportedAnswerException;
import app.lingora.core.lesson.LessonComposer;
import app.lingora.core.lesson.XpCalculator;
import app.lingora.core.lesson.XpCalculator.FirstAttempt;
import app.lingora.core.lesson.XpCalculator.LessonXp;
import app.lingora.domain.Answer;
import app.lingora.domain.EvaluationResult;
import app.lingora.domain.Exercise;
import app.lingora.domain.FocusUnitId;
import app.lingora.domain.Item;
import app.lingora.domain.LearningPlan.PlanUnit;
import app.lingora.domain.Level;
import app.lingora.domain.Outcome;
import app.lingora.domain.Rating;
import app.lingora.domain.SkillMastery;
import app.lingora.domain.SrsCard;
import app.lingora.domain.Unit;
import app.lingora.persistence.AttemptEntity;
import app.lingora.persistence.AttemptRepository;
import app.lingora.persistence.ContentCatalog;
import app.lingora.persistence.LearningPlanStore;
import app.lingora.persistence.LessonSessionEntity;
import app.lingora.persistence.LessonSessionRepository;
import app.lingora.persistence.SkillMasteryStore;
import app.lingora.persistence.SrsCardStore;
import app.lingora.persistence.UserEntity;
import app.lingora.persistence.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Lesson flow of PRD F5: compose and start a lesson, evaluate and record every answer together with the mastery of its
 * skill tags (PRD 8.2), finish with XP (F9). A focus unit of the plan (PRD F3) is played like a unit made of all lesson
 * exercises carrying its skill tag at or below the learner's level. Every first answer reviews the FSRS cards of its
 * items (PRD F8); retries at the end of a lesson do not.
 */
@Service
class LessonService {

    private static final int ACCURACY_SCALE = 3;

    private final ContentCatalog catalog;
    private final LessonSessionRepository sessions;
    private final AttemptRepository attempts;
    private final UserRepository users;
    private final LearningPlanStore plans;
    private final SkillMasteryStore mastery;
    private final LessonComposer composer;
    private final AnswerEvaluator evaluator;
    private final CardReviews cardReviews;
    private final SrsCardStore cards;
    private final String engineId;
    private final Clock clock;

    LessonService(ContentCatalog catalog, LessonSessionRepository sessions, AttemptRepository attempts, UserRepository users,
                  LearningPlanStore plans, SkillMasteryStore mastery, LessonComposer composer, AnswerEvaluator evaluator,
                  CardReviews cardReviews, SrsCardStore cards, EngineProperties engineProperties, Clock clock) {
        this.catalog = catalog;
        this.sessions = sessions;
        this.attempts = attempts;
        this.users = users;
        this.plans = plans;
        this.mastery = mastery;
        this.composer = composer;
        this.evaluator = evaluator;
        this.cardReviews = cardReviews;
        this.cards = cards;
        this.engineId = engineProperties.engine().id();
        this.clock = clock;
    }

    @Transactional
    LessonResponse start(UserEntity learner, String unitId) {
        Optional<FocusUnitId> focus = FocusUnitId.parse(unitId);
        if (focus.isPresent()) {
            return startFocus(learner, unitId, focus.get());
        }
        Unit unit = catalog.activeUnit(unitId).orElseThrow(() -> LessonProblems.unitNotFound(unitId));
        if (unit.isSkeleton()) {
            throw LessonProblems.unitWithoutContent(unitId);
        }
        Instant now = clock.instant();
        List<Exercise> exercises = compose(learner, unit, now);
        LessonSessionEntity session = sessions.save(new LessonSessionEntity(learner.getId(), unit.id(), unit.level(),
                exercises.stream().map(Exercise::id).toList(), engineId, now));
        return new LessonResponse(session.getId(), unit.id(), exercises.stream().map(LessonExercise::of).toList());
    }

    /** A focus unit of the current plan, played with the exercises of its skill tag up to the learner's level. */
    private LessonResponse startFocus(UserEntity learner, String unitId, FocusUnitId focus) {
        Level level = learner.getCurrentLevel();
        PlanUnit planned = plans.current(learner.getId())
                .flatMap(stored -> stored.plan().unit(unitId))
                .filter(unit -> level != null)
                .orElseThrow(() -> LessonProblems.unitNotFound(unitId));
        List<Exercise> pool = catalog.lessonExercisesWithSkillTag(focus.tag(), level);
        if (pool.isEmpty()) {
            throw LessonProblems.unitWithoutContent(unitId);
        }
        // The composer takes a unit; curriculum unit ids have no dots, so the tag's dots become underscores.
        Unit unit = new Unit(unitId.replace('.', '_'), level, planned.title(), null, List.of(), List.of(focus.tag()), null,
                null, planned.lessonCount(), List.of(), List.of(), pool);
        Instant now = clock.instant();
        List<Exercise> exercises = compose(learner, unit, now);
        LessonSessionEntity session = sessions.save(LessonSessionEntity.focus(learner.getId(), focus.tag(), level,
                exercises.stream().map(Exercise::id).toList(), engineId, now));
        return new LessonResponse(session.getId(), unitId, exercises.stream().map(LessonExercise::of).toList());
    }

    private List<Exercise> compose(UserEntity learner, Unit unit, Instant now) {
        SkillMastery current = mastery.effective(learner.getId(), now);
        return composer.compose(unit, learner.toProfile(), current, List.of(), List.of());
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
        // The app repeats a wrong exercise until it is answered correctly; more retries would inflate the mastery.
        if (request.isRetry() && attempts.existsBySessionIdAndExerciseIdAndOutcomeNot(sessionId, exerciseId, Outcome.WRONG)) {
            throw LessonProblems.retryAfterCorrectAnswer(exerciseId);
        }
        Exercise exercise = catalog.exercises(List.of(exerciseId)).get(exerciseId);
        Answer answer = request.answer().toDomain(request.responseTime());
        EvaluationResult result = evaluate(exercise, answer);
        int position = Math.toIntExact(attempts.countBySessionId(sessionId)) + 1;
        Instant answeredAt = clock.instant();
        AttemptEntity attempt = attempts.saveAndFlush(new AttemptEntity(userId, sessionId, position, exercise,
                request.isRetry(), request.answer().toJson(), request.responseTime(), result, engineId, answeredAt));
        mastery.recordAnswer(userId, exercise.skillTags(), result.outcome(), request.isRetry(), answeredAt);
        Rating rating = result.rating();
        if (!request.isRetry()) {
            rating = cardReviews.review(userId, exercise, answer, result.outcome(), attempt.getId(), answeredAt);
            attempt.rate(rating);
        }
        return AttemptResponse.of(exerciseId, result, rating);
    }

    /** Idempotent: a completed lesson returns its stored result and awards no XP again. */
    @Transactional
    LessonResultResponse complete(UUID userId, UUID sessionId) {
        LessonSessionEntity session = lockedSession(userId, sessionId);
        if (!session.isFinished()) {
            finish(userId, session);
        }
        List<Item> items = learnedItems(session);
        Map<String, SrsCard> itemCards = cards.cards(userId, items.stream().map(Item::id).toList());
        return LessonResultResponse.of(session, items, itemCards, cards.learnedWords(userId), users.xpTotalOf(userId));
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

    private EvaluationResult evaluate(Exercise exercise, Answer answer) {
        try {
            return evaluator.evaluate(exercise, answer);
        } catch (UnsupportedAnswerException e) {
            throw LessonProblems.answerTypeMismatch(e.getMessage());
        } catch (InvalidAnswerException e) {
            throw LessonProblems.invalidAnswer(e.getMessage());
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
}
