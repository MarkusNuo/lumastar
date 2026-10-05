package app.lingora.api.lesson;

import app.lingora.core.lesson.XpCalculator.LessonXp;
import app.lingora.domain.Item;
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
        int xpTotal) {

    public record XpBreakdown(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int base,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "No mistake at the first attempts")
            int perfectBonus,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED,
                    description = "Median first-attempt response time of at most 8 seconds") int speedBonus) {
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
                                   int learnedWordsTotal, int xpTotal) {
        LessonXp xp = session.xp();
        return new LessonResultResponse(LessonKind.of(session.getKind()), xp.total(), new XpBreakdown(xp.base(), xp.perfectBonus(), xp.speedBonus()),
                session.getAccuracy().doubleValue(), session.duration().toMillis(), session.getCorrectCount(),
                session.getExerciseIds().size(),
                learnedItems.stream()
                        .map(item -> new LearnedItem(item.id(), item.gheg(), item.de(),
                                cards.containsKey(item.id()) && cards.get(item.id()).isKnown()))
                        .toList(),
                learnedWordsTotal, xpTotal);
    }
}
