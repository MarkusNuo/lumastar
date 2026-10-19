package app.lumastar.api.lesson;

import app.lumastar.api.plan.PlanTriggers;
import app.lumastar.core.plan.CheckpointRule;
import app.lumastar.core.plan.FocusRequest;
import app.lumastar.core.plan.LevelUp;
import app.lumastar.domain.Level;
import app.lumastar.domain.LevelBadge;
import app.lumastar.domain.PlanChange;
import app.lumastar.domain.PlanChangeKind;
import app.lumastar.persistence.BadgeStore;
import app.lumastar.persistence.LessonSessionEntity;
import app.lumastar.persistence.UserEntity;
import app.lumastar.persistence.UserRepository;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * The consequences of a finished checkpoint: a pass moves the learner up to the next stage and
 * awards the badges of completed CEFR bands; pass or fail, the plan is revised with the result as its reason.
 */
@Component
class CheckpointCompletion {

    private final UserRepository users;
    private final BadgeStore badges;
    private final PlanTriggers planTriggers;

    CheckpointCompletion(UserRepository users, BadgeStore badges, PlanTriggers planTriggers) {
        this.users = users;
        this.badges = badges;
        this.planTriggers = planTriggers;
    }

    void apply(UUID userId, LessonSessionEntity checkpoint, Optional<FocusRequest> focus, Instant at) {
        Level level = checkpoint.getLevel();
        PlanChange cause;
        if (Boolean.TRUE.equals(checkpoint.getCheckpointPassed())) {
            UserEntity learner = users.findById(userId).orElseThrow();
            LevelUp levelUp = LevelUp.afterCheckpoint(learner.getCurrentLevel(), level);
            if (levelUp.changesLevel()) {
                learner.levelUp(levelUp.to());
                users.saveAndFlush(learner);
            }
            for (LevelBadge badge : levelUp.badges()) {
                badges.award(userId, badge, checkpoint.getId(), at);
            }
            cause = passed(level, levelUp);
        } else {
            cause = new PlanChange(PlanChangeKind.REPLANNED, "Checkpoint %s nicht bestanden (%d %%)".formatted(level.code(),
                    percent(checkpoint)), Map.of("level", level.code(), "accuracy", checkpoint.getAccuracy().doubleValue()));
        }
        planTriggers.afterCheckpoint(userId, cause, focus);
    }

    private static PlanChange passed(Level level, LevelUp levelUp) {
        if (!levelUp.changesLevel()) {
            return new PlanChange(PlanChangeKind.REPLANNED, "Checkpoint %s bestanden".formatted(level.code()),
                    Map.of("level", level.code()));
        }
        return new PlanChange(PlanChangeKind.LEVEL_CHANGED,
                "Checkpoint %s bestanden → %s".formatted(level.code(), levelUp.to().code()),
                Map.of("level", level.code(), "from", levelUp.from().code(), "to", levelUp.to().code()));
    }

    private static long percent(LessonSessionEntity checkpoint) {
        return Math.round(checkpoint.getAccuracy().doubleValue() * 100);
    }

    /** The result as the lesson result shows it, the same at every completion. */
    LessonResultResponse.CheckpointResult result(UUID userId, LessonSessionEntity checkpoint) {
        boolean passed = Boolean.TRUE.equals(checkpoint.getCheckpointPassed());
        Level level = checkpoint.getLevel();
        return new LessonResultResponse.CheckpointResult(level, passed, CheckpointRule.PASS_ACCURACY,
                passed ? LevelUp.levelAfter(level) : null, badges.awardedBy(userId, checkpoint.getId()));
    }
}
