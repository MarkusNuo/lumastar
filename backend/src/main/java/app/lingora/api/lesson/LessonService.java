package app.lingora.api.lesson;

import app.lingora.api.plan.CheckpointStatuses;
import app.lingora.api.plan.CheckpointStatuses.StageCheckpoint;
import app.lingora.api.plan.PlanTriggers;
import app.lingora.api.progress.DailyProgress;
import app.lingora.config.EngineProperties;
import app.lingora.core.evaluation.AnswerEvaluator;
import app.lingora.core.evaluation.InvalidAnswerException;
import app.lingora.core.evaluation.UnsupportedAnswerException;
import app.lingora.core.lesson.FocusSuggestion;
import app.lingora.core.lesson.FocusSuggestion.FirstAnswer;
import app.lingora.core.lesson.LessonComposer;
import app.lingora.core.lesson.XpCalculator;
import app.lingora.core.lesson.XpCalculator.FirstAttempt;
import app.lingora.core.lesson.XpCalculator.LessonXp;
import app.lingora.core.plan.CheckpointRule;
import app.lingora.core.plan.FocusRequest;
import app.lingora.domain.Answer;
import app.lingora.domain.CheckpointStatus;
import app.lingora.domain.EvaluationResult;
import app.lingora.domain.Exercise;
import app.lingora.domain.FocusUnitId;
import app.lingora.domain.Item;
import app.lingora.domain.LearningPlan.PlanUnit;
import app.lingora.domain.Level;
import app.lingora.domain.Outcome;
import app.lingora.domain.Rating;
import app.lingora.domain.SkillTag;
import app.lingora.domain.Stage;
import app.lingora.domain.SrsCard;
import app.lingora.domain.Unit;
import app.lingora.persistence.AttemptEntity;
import app.lingora.persistence.AttemptRepository;
import app.lingora.persistence.ContentCatalog;
import app.lingora.persistence.LearningPlanStore;
import app.lingora.persistence.LessonSessionEntity;
import app.lingora.persistence.LessonSessionRepository;
import app.lingora.persistence.PracticeCompletion;
import app.lingora.persistence.SessionKind;
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
 * skill tags (PRD 8.2), finish with XP and the daily goal and streak (F9). Lessons of a unit, focus lessons on a weak
 * skill tag (PRD F3), review lessons of the due items (PRD F8), the checkpoints at the end of a stage (PRD chapter 5)
 * and practice lessons on a chosen skill tag (PRD F10) share this flow. Every first answer reviews the FSRS cards of
 * its items; retries at the end of a lesson do not. A completed lesson may suggest a focus lesson (PRD F7) and revise
 * the plan (PRD F3); a completed checkpoint may move the learner up.
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
    private final LessonContexts contexts;
    private final PlanTriggers planTriggers;
    private final CheckpointStatuses checkpoints;
    private final CheckpointCompletion checkpointCompletion;
    private final DailyProgress dailyProgress;
    private final String engineId;
    private final Clock clock;

    LessonService(ContentCatalog catalog, LessonSessionRepository sessions, AttemptRepository attempts, UserRepository users,
                  LearningPlanStore plans, SkillMasteryStore mastery, LessonComposer composer, AnswerEvaluator evaluator,
                  CardReviews cardReviews, SrsCardStore cards, LessonContexts contexts, PlanTriggers planTriggers,
                  CheckpointStatuses checkpoints, CheckpointCompletion checkpointCompletion, DailyProgress dailyProgress,
                  EngineProperties engineProperties, Clock clock) {
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
        this.contexts = contexts;
        this.planTriggers = planTriggers;
        this.checkpoints = checkpoints;
        this.checkpointCompletion = checkpointCompletion;
        this.dailyProgress = dailyProgress;
        this.engineId = engineProperties.engine().id();
        this.clock = clock;
    }

    @Transactional
    LessonResponse start(UserEntity learner, StartLessonRequest request) {
        return request.isPractice()
                ? startPractice(learner, SkillTag.of(request.skillTag()))
                : start(learner, request.unitId());
    }

    private LessonResponse start(UserEntity learner, String unitId) {
        Optional<FocusUnitId> focus = FocusUnitId.parse(unitId);
        if (focus.isPresent()) {
            return startFocus(learner, unitId, focus.get());
        }
        Unit unit = catalog.activeUnit(unitId).orElseThrow(() -> LessonProblems.unitNotFound(unitId));
        if (unit.isSkeleton()) {
            throw LessonProblems.unitWithoutContent(unitId);
        }
        Instant now = clock.instant();
        List<Exercise> exercises = composer.compose(unit, contexts.of(learner, now, unit.id()));
        LessonSessionEntity session = sessions.save(new LessonSessionEntity(learner.getId(), unit.id(), unit.level(),
                ids(exercises), engineId, now));
        return LessonResponse.of(session, unit.id(), exercises);
    }

    /** A focus unit of the current plan, played with {@link ContentCatalog#focusExercises the exercises of its tag}. */
    private LessonResponse startFocus(UserEntity learner, String unitId, FocusUnitId focus) {
        Level level = learner.getCurrentLevel();
        PlanUnit planned = plans.current(learner.getId())
                .flatMap(stored -> stored.plan().unit(unitId))
                .filter(unit -> level != null)
                .orElseThrow(() -> LessonProblems.unitNotFound(unitId));
        List<Exercise> pool = catalog.focusExercises(focus.tag(), level);
        if (pool.isEmpty()) {
            throw LessonProblems.unitWithoutContent(unitId);
        }
        // The composer takes a unit; curriculum unit ids have no dots, so the tag's dots become underscores.
        Unit unit = new Unit(unitId.replace('.', '_'), level, planned.title(), null, List.of(), List.of(focus.tag()), null,
                null, planned.lessonCount(), List.of(), List.of(), pool);
        Instant now = clock.instant();
        List<Exercise> exercises = composer.composeFocus(unit, contexts.of(learner, now, null));
        LessonSessionEntity session = sessions.save(LessonSessionEntity.focus(learner.getId(), focus.tag(), level,
                ids(exercises), engineId, now));
        return LessonResponse.of(session, unitId, exercises);
    }

    /** A practice lesson of the exercises with the tag at or below the learner's level (PRD F10 "Gezielt üben"). */
    private LessonResponse startPractice(UserEntity learner, SkillTag tag) {
        Level level = learner.getCurrentLevel();
        List<Exercise> pool = level == null ? List.of() : catalog.lessonExercisesWithSkillTag(tag, level);
        if (pool.isEmpty()) {
            throw LessonProblems.nothingToPractise(tag);
        }
        String unitId = LessonResponse.practiceUnitId(tag);
        String title = catalog.skillTagLabels().getOrDefault(tag, tag.id());
        Unit unit = new Unit(unitId.replace('.', '_'), level, title, null, List.of(), List.of(tag), null, null, null,
                List.of(), List.of(), pool);
        Instant now = clock.instant();
        List<Exercise> exercises = composer.composeFocus(unit, contexts.of(learner, now, null));
        LessonSessionEntity session = sessions.save(LessonSessionEntity.practice(learner.getId(), tag, level,
                ids(exercises), engineId, now));
        return LessonResponse.of(session, unitId, exercises);
    }

    /** A lesson of the due items (PRD F8); it starts exactly when the review summary counts cards due now. */
    @Transactional
    LessonResponse startReview(UserEntity learner) {
        Instant now = clock.instant();
        List<Exercise> exercises = composer.composeReview(contexts.of(learner, now, null));
        if (exercises.isEmpty()) {
            throw LessonProblems.nothingDue();
        }
        LessonSessionEntity session = sessions.save(LessonSessionEntity.review(learner.getId(), learner.getCurrentLevel(),
                ids(exercises), engineId, now));
        return LessonResponse.of(session, LessonResponse.REVIEW_UNIT_ID, exercises);
    }

    /** The checkpoint of a stage of the plan, once it is available, made of the exercises of the stage's units. */
    @Transactional
    LessonResponse startCheckpoint(UserEntity learner, Level level) {
        StageCheckpoint checkpoint = checkpoints.stage(learner.getId(), level)
                .orElseThrow(() -> LessonProblems.checkpointNotFound(level));
        if (checkpoint.status() == CheckpointStatus.LOCKED) {
            throw LessonProblems.checkpointLocked(level);
        }
        if (checkpoint.status() == CheckpointStatus.PASSED) {
            throw LessonProblems.checkpointPassed(level);
        }
        List<Unit> units = checkpoint.stage().units().stream()
                .filter(unit -> !unit.isFocus())
                .flatMap(unit -> catalog.activeUnit(unit.unitId()).stream())
                .filter(unit -> !unit.isSkeleton())
                .toList();
        Instant now = clock.instant();
        List<Exercise> exercises = composer.composeCheckpoint(new Stage(level, level.code(), units),
                contexts.of(learner, now, null));
        LessonSessionEntity session = sessions.save(LessonSessionEntity.checkpoint(learner.getId(), level, ids(exercises),
                engineId, now));
        return LessonResponse.of(session, LessonResponse.checkpointUnitId(level), exercises);
    }

    private static List<String> ids(List<Exercise> exercises) {
        return exercises.stream().map(Exercise::id).toList();
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

    /**
     * Idempotent: a completed lesson returns its result again and awards no XP again; only the first completion revises
     * the plan.
     */
    @Transactional
    LessonResultResponse complete(UUID userId, UUID sessionId) {
        LessonSessionEntity session = lockedSession(userId, sessionId);
        List<AttemptEntity> firstAttempts = attempts.findBySessionIdAndRetryFalseOrderByPosition(session.getId());
        Optional<FocusRequest> focus = focusRequest(userId, firstAttempts);
        boolean checkpoint = session.getKind() == SessionKind.CHECKPOINT;
        PracticeCompletion completion = PracticeCompletion.lesson(session.getId());
        if (!session.isFinished()) {
            finish(userId, session, firstAttempts);
            if (checkpoint) {
                checkpointCompletion.apply(userId, session, focus, clock.instant());
            } else {
                planTriggers.afterLesson(userId, focus);
            }
            sessions.flush();
            dailyProgress.evaluate(userId, completion);
        }
        List<Item> items = learnedItems(session);
        Map<String, SrsCard> itemCards = cards.cards(userId, items.stream().map(Item::id).toList());
        return LessonResultResponse.of(session, items, itemCards, cards.learnedWords(userId), users.xpTotalOf(userId),
                focus.flatMap(request -> focusSuggestion(userId, request)).orElse(null),
                checkpoint ? checkpointCompletion.result(session) : null,
                dailyProgress.ofCompletion(userId, completion, session.getFinishedAt()));
    }

    /**
     * A tag the lesson's first answers got wrong at least three times. The learner has met it now, so a focus lesson can
     * practise it whenever lesson exercises carry it, at any level (see {@link ContentCatalog#focusExercises}).
     */
    private Optional<FocusRequest> focusRequest(UUID userId, List<AttemptEntity> firstAttempts) {
        Level level = users.findById(userId).map(UserEntity::getCurrentLevel).orElse(null);
        if (level == null) {
            return Optional.empty();
        }
        return FocusSuggestion.of(firstAttempts.stream()
                        .map(attempt -> new FirstAnswer(attempt.getSkillTags(), !attempt.countsAsCorrect()))
                        .toList(),
                catalog.lessonSkillTags(Level.highest()));
    }

    /** The suggestion is offered as the open focus unit of its tag in the plan. */
    private Optional<LessonResultResponse.FocusSuggestion> focusSuggestion(UUID userId, FocusRequest request) {
        String label = catalog.skillTagLabels().getOrDefault(request.tag(), request.tag().id());
        return planTriggers.openFocusUnit(userId, request.tag())
                .map(unitId -> new LessonResultResponse.FocusSuggestion(request.tag().id(), label, unitId));
    }

    private void finish(UUID userId, LessonSessionEntity session, List<AttemptEntity> firstAttempts) {
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
        if (session.getKind() == SessionKind.CHECKPOINT) {
            session.recordCheckpoint(CheckpointRule.passes(accuracy.doubleValue()));
        }
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
