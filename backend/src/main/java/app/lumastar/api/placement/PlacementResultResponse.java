package app.lumastar.api.placement;

import app.lumastar.api.progress.DailyProgress.CompletionProgress;
import app.lumastar.api.progress.LessonDailyGoal;
import app.lumastar.api.progress.LessonStreak;
import app.lumastar.domain.Competence;
import app.lumastar.domain.Level;
import app.lumastar.domain.PlacementResult;
import app.lumastar.domain.PlacementResult.CompetenceScore;
import app.lumastar.domain.SkillTag;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Schema(description = "Result of a completed or skipped placement test, for the animated level reveal")
public record PlacementResultResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID testId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "true if the test was skipped (start at A0)")
        boolean skipped,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "A1.2") Level level,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Title of the stage", example = "Alltag zu Hause")
        String levelTitle,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Level startLevel,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int answeredCount,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Top 3 strengths, strongest first")
        List<SkillEstimate> strengths,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Top 3 weaknesses, weakest first")
        List<SkillEstimate> weaknesses,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED,
                description = "All four competences in the order vocabulary, grammar, reading, translation")
        List<CompetenceResult> competences,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant finishedAt,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "A completed test counts as practice time, a "
                + "skipped one does not") LessonDailyGoal dailyGoal,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) LessonStreak streak) {

    public record SkillEstimate(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String skillTag,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "German label") String label,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Initial mastery estimate, 0 to 1")
            double mastery) {
    }

    public record CompetenceResult(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Competence competence,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "0 if the test had no item of it") int answered,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int correct) {
    }

    static PlacementResultResponse of(UUID testId, boolean skipped, String levelTitle, Level startLevel, int answeredCount,
                                      PlacementResult result, Map<SkillTag, String> labels, Instant finishedAt,
                                      CompletionProgress progress) {
        return new PlacementResultResponse(testId, skipped, result.level(), levelTitle, startLevel, answeredCount,
                estimates(result.strengths(), result, labels), estimates(result.weaknesses(), result, labels),
                Arrays.stream(Competence.values()).map(competence -> competenceResult(competence, result)).toList(),
                finishedAt, progress.dailyGoal(), progress.streak());
    }

    private static List<SkillEstimate> estimates(List<SkillTag> tags, PlacementResult result, Map<SkillTag, String> labels) {
        return tags.stream()
                .map(tag -> new SkillEstimate(tag.id(), labels.getOrDefault(tag, tag.id()), result.initialMastery().get(tag)))
                .toList();
    }

    private static CompetenceResult competenceResult(Competence competence, PlacementResult result) {
        CompetenceScore score = result.competenceScores().get(competence);
        return score == null
                ? new CompetenceResult(competence, 0, 0)
                : new CompetenceResult(competence, score.answered(), score.correct());
    }
}
