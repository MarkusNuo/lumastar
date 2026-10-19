package app.lumastar.api.stats;

import app.lumastar.api.lesson.StartLessonKind;
import app.lumastar.domain.CheckpointStatus;
import app.lumastar.domain.ErrorCategory;
import app.lumastar.domain.Level;
import app.lumastar.domain.SkillArea;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;
import java.util.List;

@Schema(description = "Progress and statistics of the learner; days are dates in the learner's time zone")
public record StatsResponse(
        @Schema(description = "Absent until the placement test (or its skip) has set a level and created the plan")
        LevelProgress level,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "One entry per area, in this order: vocab "
                + "(Wortschatz), phrase (Wendungen), grammar (Grammatik), spelling (Schreiben), reading (Lesen)")
        List<MasteryArea> masteryByArea,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Up to 5 skill tags with the most wrong first "
                + "answers of the last 30 days, the most first") List<FrequentError> topErrors,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Heatmap heatmap,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Words and phrases whose FSRS card is in the "
                + "review state") int learnedWords,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) DueForecast forecast) {

    @Schema(description = "The learner's stage and the progress towards its checkpoint, which leads to the next stage")
    public record LevelProgress(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Level level,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "German title of the stage") String title,
            @Schema(description = "The stage a passed checkpoint leads to; absent at C2.3") Level nextLevel,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int unitsCompleted,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int unitsSkipped,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Units of the stage with exercises; focus "
                    + "units do not count") int unitsTotal,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Completed and skipped units of the total, "
                    + "0 to 100, rounded down") int percent,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) CheckpointStatus checkpoint) {
    }

    public record MasteryArea(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) SkillArea area,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "Wortschatz") String label,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Skill tags of the area with a mastery value, "
                    + "practised or estimated by the placement test") int skillTags,
            @Schema(description = "Average effective mastery of these tags, 0 to 1; absent without tags") Double mastery) {
    }

    public record FrequentError(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "grammar.case") String skillTag,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "German label of the skill tag") String label,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Wrong first answers") int errors,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "First answers") int attempts,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "errors / attempts, 0 to 1") double errorRate,
            @Schema(description = "The error category the wrong answers were logged with most often; absent if none")
            ErrorCategory category,
            @Schema(description = "German label of the category; absent with it") String categoryLabel,
            @Schema(description = "The body of POST /api/lessons for a practice lesson on the tag (\"Gezielt üben\"); absent "
                    + "if no exercise at or below the learner's level carries it") PracticeTarget practice) {
    }

    public record PracticeTarget(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) StartLessonKind kind,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String skillTag) {
    }

    @Schema(description = "The last 365 days, one entry per day from the oldest to today")
    public record Heatmap(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) LocalDate from,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Today") LocalDate to,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<HeatmapDay> days) {
    }

    public record HeatmapDay(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) LocalDate date,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Whole minutes practised") int minutes,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int xp,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int lessons,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The daily goal of that day was met")
            boolean goalMet,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "A missed day bridged by the streak freeze")
            boolean frozen) {
    }

    @Schema(description = "FSRS forecast (\"morgen fällig: 34 Items\")")
    public record DueForecast(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Cards due now, overdue ones included")
            int dueNow,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Cards due by the end of today, overdue ones "
                    + "included") int dueToday,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int dueTomorrow,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The next 7 days from today, one entry per "
                    + "day; today includes the overdue cards") List<DueDay> days) {
    }

    public record DueDay(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) LocalDate date,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int due) {
    }
}
