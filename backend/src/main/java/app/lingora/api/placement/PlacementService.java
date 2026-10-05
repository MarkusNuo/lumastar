package app.lingora.api.placement;

import app.lingora.api.plan.PlanService;
import app.lingora.api.progress.DailyProgress;
import app.lingora.config.EngineProperties;
import app.lingora.core.evaluation.AnswerEvaluator;
import app.lingora.core.evaluation.UnsupportedAnswerException;
import app.lingora.core.placement.PlacementEngine;
import app.lingora.core.placement.PlacementEngineFactory;
import app.lingora.domain.EvaluationResult;
import app.lingora.domain.Exercise;
import app.lingora.domain.Level;
import app.lingora.domain.PlacementResult;
import app.lingora.domain.PlacementState;
import app.lingora.domain.PlanChange;
import app.lingora.domain.PlanChangeKind;
import app.lingora.domain.PlanTrigger;
import app.lingora.persistence.ContentCatalog;
import app.lingora.persistence.PlacementAnswerEntity;
import app.lingora.persistence.PlacementAnswerRepository;
import app.lingora.persistence.PlacementStatus;
import app.lingora.persistence.PlacementTestEntity;
import app.lingora.persistence.PlacementTestRepository;
import app.lingora.persistence.SkillMasteryStore;
import app.lingora.persistence.StageRepository;
import app.lingora.persistence.StageEntity;
import app.lingora.persistence.UserEntity;
import app.lingora.persistence.UserRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The placement test of PRD F2: start (abandoning an unfinished test), answer item by item without feedback, and on
 * the end place the learner. Placing sets the level, seeds the initial mastery, completes the onboarding and creates
 * or revises the learning plan. A completed test counts as practice time towards the daily goal (PRD F9).
 * Every write locks the account row first, so a learner's placement and plan changes never interleave.
 */
@Service
class PlacementService {

    private final UserRepository users;
    private final PlacementTestRepository tests;
    private final PlacementAnswerRepository answers;
    private final StageRepository stages;
    private final ContentCatalog catalog;
    private final SkillMasteryStore mastery;
    private final PlanService plans;
    private final DailyProgress dailyProgress;
    private final PlacementEngineFactory engines;
    private final AnswerEvaluator evaluator;
    private final String engineId;
    private final Clock clock;

    PlacementService(UserRepository users, PlacementTestRepository tests, PlacementAnswerRepository answers,
                     StageRepository stages, ContentCatalog catalog, SkillMasteryStore mastery, PlanService plans,
                     DailyProgress dailyProgress, PlacementEngineFactory engines, AnswerEvaluator evaluator,
                     EngineProperties engineProperties, Clock clock) {
        this.users = users;
        this.tests = tests;
        this.answers = answers;
        this.stages = stages;
        this.catalog = catalog;
        this.mastery = mastery;
        this.plans = plans;
        this.dailyProgress = dailyProgress;
        this.engines = engines;
        this.evaluator = evaluator;
        this.engineId = engineProperties.engine().id();
        this.clock = clock;
    }

    @Transactional
    StartPlacementResponse start(UUID userId) {
        UserEntity learner = lockedLearner(userId);
        if (learner.getSelfAssessment() == null) {
            throw PlacementProblems.onboardingIncomplete();
        }
        Instant now = clock.instant();
        tests.abandonUnfinished(userId, now);
        PlacementEngine engine = engine();
        Level startLevel = learner.placementStartLevel();
        PlacementState state = new PlacementState(startLevel, startLevel, List.of());
        if (engine.isFinished(state)) {
            throw PlacementProblems.noItems();
        }
        Exercise first = engine.nextItem(state);
        PlacementTestEntity test = tests.save(PlacementTestEntity.started(userId, engineId, startLevel, first.id(), now));
        return new StartPlacementResponse(test.getId(), startLevel, itemView(first, test.getId()), 1, engine.maxItems());
    }

    @Transactional
    PlacementAnswerResponse answer(UUID userId, UUID testId, PlacementAnswerRequest request) {
        UserEntity learner = lockedLearner(userId);
        PlacementTestEntity test = tests.findForUpdateByIdAndUserId(testId, userId)
                .orElseThrow(() -> PlacementProblems.testNotFound(testId));
        if (!test.isInProgress()) {
            throw PlacementProblems.testNotInProgress(testId);
        }
        if (!request.exerciseId().equals(test.getPendingExerciseId())) {
            throw PlacementProblems.unexpectedItem(request.exerciseId());
        }
        Exercise item = catalog.exercises(List.of(request.exerciseId())).get(request.exerciseId());
        EvaluationResult result = evaluate(item, request);
        Instant now = clock.instant();
        int position = test.answeredCount() + 1;
        answers.save(new PlacementAnswerEntity(userId, testId, position, item, request.answer().toJson(),
                request.responseTime(), result, now));

        PlacementEngine engine = engine();
        PlacementState answered = engine.record(test.placementState(),
                new PlacementState.Step(item.id(), item.level(), item.competence(), item.skillTags(), result.outcome()));
        if (!engine.isFinished(answered)) {
            Exercise next = engine.nextItem(answered);
            test.advance(answered, next.id());
            return new PlacementAnswerResponse(false, itemView(next, testId), position + 1);
        }
        PlacementResult placement = engine.evaluate(answered);
        test.complete(answered, placement, now);
        place(learner, placement, false, now);
        dailyProgress.evaluate(userId, null);
        return new PlacementAnswerResponse(true, null, position);
    }

    @Transactional
    PlacementResultResponse skip(UUID userId) {
        UserEntity learner = lockedLearner(userId);
        if (!learner.maySkipPlacement()) {
            throw PlacementProblems.notSkippable();
        }
        Instant now = clock.instant();
        tests.abandonUnfinished(userId, now);
        PlacementTestEntity test = tests.save(PlacementTestEntity.skipped(userId, engineId, Level.lowest(), now));
        place(learner, test.placementResult(), true, now);
        return resultOf(test);
    }

    @Transactional(readOnly = true)
    PlacementResultResponse result(UUID userId, UUID testId) {
        PlacementTestEntity test = tests.findByIdAndUserId(testId, userId)
                .orElseThrow(() -> PlacementProblems.testNotFound(testId));
        if (!test.hasResult()) {
            throw PlacementProblems.testWithoutResult(testId);
        }
        return resultOf(test);
    }

    /** Sets the level, raises the mastery estimates and creates or revises the plan (PRD F2, F3). */
    private void place(UserEntity learner, PlacementResult placement, boolean skipped, Instant now) {
        Level previous = learner.getCurrentLevel();
        learner.place(placement.level(), now);
        users.flush();
        mastery.seedInitial(learner.getId(), placement.initialMastery(), now);
        plans.revise(learner.getId(), PlanTrigger.PLACEMENT, planCause(previous, placement.level(), skipped));
    }

    private static PlanChange planCause(Level previous, Level placed, boolean skipped) {
        if (previous == null) {
            String reason = skipped
                    ? "Lernplan ab %s erstellt, Einstufung übersprungen".formatted(placed.code())
                    : "Lernplan nach der Einstufung erstellt: %s bis C2".formatted(placed.code());
            return new PlanChange(PlanChangeKind.PLAN_CREATED, reason, Map.of("level", placed.code()));
        }
        if (previous == placed) {
            return new PlanChange(PlanChangeKind.REPLANNED, "Neueinstufung: %s bestätigt".formatted(placed.code()),
                    Map.of("level", placed.code()));
        }
        return new PlanChange(PlanChangeKind.LEVEL_CHANGED, "Neueinstufung: %s → %s".formatted(previous.code(), placed.code()),
                Map.of("from", previous.code(), "to", placed.code()));
    }

    private PlacementResultResponse resultOf(PlacementTestEntity test) {
        PlacementResult result = test.placementResult();
        String levelTitle = stages.findById(result.level().code()).map(StageEntity::getTitle).orElse(result.level().code());
        return PlacementResultResponse.of(test.getId(), test.getStatus() == PlacementStatus.SKIPPED, levelTitle,
                test.getStartLevel(), test.answeredCount(), result, catalog.skillTagLabels(), test.getFinishedAt());
    }

    private EvaluationResult evaluate(Exercise item, PlacementAnswerRequest request) {
        try {
            return evaluator.evaluate(item, request.answer().toDomain(request.responseTime()));
        } catch (UnsupportedAnswerException e) {
            throw PlacementProblems.answerTypeMismatch(e.getMessage());
        }
    }

    private PlacementEngine engine() {
        return engines.create(catalog.placementBank());
    }

    private UserEntity lockedLearner(UUID userId) {
        return users.findForUpdateById(userId).orElseThrow();
    }

    private static PlacementItem itemView(Exercise item, UUID testId) {
        return PlacementItem.of(item, Objects.hash(testId, item.id()));
    }
}
