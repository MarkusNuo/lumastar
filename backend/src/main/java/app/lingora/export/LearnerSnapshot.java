package app.lingora.export;

import app.lingora.domain.ErrorCategoryCount;
import app.lingora.domain.ErrorEntry;
import app.lingora.domain.LearnerProfile;
import app.lingora.domain.Level;
import app.lingora.domain.SkillMastery;
import app.lingora.domain.SkillTag;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Everything the profile documents show, read at one point in time: the compact context snapshot of PRD 10.1.
 * {@code mastery} is the effective (decayed) mastery at {@code takenAt}, {@code recentErrors} are newest first,
 * {@code learningPlanJson} is the current plan with the live status of its units and {@code currentUnit} the unit in
 * progress; both are {@code null} before the first plan.
 */
public record LearnerSnapshot(
        Instant takenAt,
        ZoneId timeZone,
        LearnerProfile profile,
        Streak streak,
        SkillMastery mastery,
        Map<SkillTag, String> skillTagLabels,
        List<ErrorEntry> recentErrors,
        List<ErrorCategoryCount> frequentErrors,
        int learnedWords,
        String learningPlanJson,
        CurrentUnit currentUnit) {

    public LearnerSnapshot {
        Objects.requireNonNull(takenAt, "takenAt");
        Objects.requireNonNull(timeZone, "timeZone");
        Objects.requireNonNull(profile, "profile");
        Objects.requireNonNull(streak, "streak");
        Objects.requireNonNull(mastery, "mastery");
        skillTagLabels = Map.copyOf(skillTagLabels);
        recentErrors = List.copyOf(recentErrors);
        frequentErrors = List.copyOf(frequentErrors);
    }

    /** The unit the learner is working on and the stage it belongs to. */
    public record CurrentUnit(String title, Level level) {

        public CurrentUnit {
            Objects.requireNonNull(title, "title");
            Objects.requireNonNull(level, "level");
        }
    }

    public record Streak(int current, int longest) {

        public static final Streak NONE = new Streak(0, 0);
    }

    /** The learner's local date of the snapshot. */
    public LocalDate date() {
        return date(takenAt);
    }

    public LocalDate date(Instant instant) {
        return LocalDate.ofInstant(instant, timeZone);
    }

    /** The German label of the tag registry; the id for a tag that is not registered. */
    public String label(SkillTag tag) {
        return skillTagLabels.getOrDefault(tag, tag.id());
    }
}
