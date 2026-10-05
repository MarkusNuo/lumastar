package app.lingora.api.lesson;

import app.lingora.api.progress.DailyProgress.CompletionProgress;
import app.lingora.api.progress.LessonDailyGoal;
import app.lingora.api.progress.LessonStreak;
import app.lingora.core.lesson.XpCalculator.LessonXp;
import app.lingora.domain.Item;
import app.lingora.domain.Level;
import app.lingora.domain.LevelBadge;
import app.lingora.domain.SrsCard;
import app.lingora.persistence.LessonSessionEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import java.util.Map;

@Schema(description = "Result of a finished lesson; completing it again returns the same result")
public record LessonResultResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) LessonKind kind,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int xpEarned,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) XpBreakdown xpBreakdown,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED,
                description = "Share of exercises answered correctly at the first attempt, 0 to 1") double accuracy,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "From the lesson start to its completion")
        long durationMs,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Exercises answered correctly at the first attempt")
        int correctCount,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int exerciseCount,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Items practised in the lesson")
        List<LearnedItem> learnedItems,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Learned words of the learner: words and phrases "
                + "whose FSRS card is in the review state (PRD F10)") int learnedWordsTotal,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "XP of the learner including this lesson")
        int xpTotal,
        @Schema(description = "A focus lesson for a skill tag answered wrongly at least three times in this lesson "
                + "(PRD F7); absent otherwise") FocusSuggestion focusSuggestion,
        @Schema(description = "The result of a checkpoint; absent for other lessons") CheckpointResult checkpoint,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) LessonDailyGoal dailyGoal,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) LessonStreak streak) {

    public record XpBreakdown(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int base,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "No mistake at the first attempts")
            int perfectBonus,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED,
                    description = "Median first-attempt response time of at most 8 seconds") int speedBonus) {
    }

    @Schema(description = "A checkpoint passed with the required accuracy moves the learner up (PRD chapter 5); a failed "
            + "one stays available")
    public record CheckpointResult(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The stage of the checkpoint") Level level,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean passed,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "0.8") double requiredAccuracy,
            @Schema(description = "The learner's level after a pass; absent after a failure") Level newLevel,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Level badges awarded by this checkpoint "
                    + "(PRD F9), e.g. A1 for passing A1.3") List<LevelBadge> badges) {
    }

    @Schema(description = "The focus unit of the plan for the weak skill tag; start it with POST /api/lessons")
    public record FocusSuggestion(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "grammar.case") String skillTag,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "German label of the skill tag") String label,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "focus_grammar.case_1") String unitId) {
    }

    public record LearnedItem(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String id,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String gheg,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String de,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Its FSRS card is in the review state, so "
                    + "the item counts as learned") boolean known) {
    }

    /** @param cards the learner's cards of the items by item id */
    static LessonResultResponse of(LessonSessionEntity session, List<Item> learnedItems, Map<String, SrsCard> cards,
                                   int learnedWordsTotal, int xpTotal, FocusSuggestion focusSuggestion,
                                   CheckpointResult checkpoint, CompletionProgress progress) {
        LessonXp xp = session.xp();
        return new LessonResultResponse(LessonKind.of(session.getKind()), xp.total(), new XpBreakdown(xp.base(), xp.perfectBonus(), xp.speedBonus()),
                session.getAccuracy().doubleValue(), session.duration().toMillis(), session.getCorrectCount(),
                session.getExerciseIds().size(),
                learnedItems.stream()
                        .map(item -> new LearnedItem(item.id(), item.gheg(), item.de(),
                                cards.containsKey(item.id()) && cards.get(item.id()).isKnown()))
                        .toList(),
                learnedWordsTotal, xpTotal, focusSuggestion, checkpoint, progress.dailyGoal(), progress.streak());
    }
}
