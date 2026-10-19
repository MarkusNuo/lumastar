package app.lumastar.export;

import app.lumastar.domain.ErrorCategory;
import app.lumastar.domain.ErrorEntry;
import app.lumastar.domain.ExerciseType;
import app.lumastar.domain.Level;
import app.lumastar.domain.Motivation;
import app.lumastar.domain.SkillMastery.Entry;
import app.lumastar.domain.SkillTag;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/** Renders the profile documents from a {@link LearnerSnapshot}, exactly in their fixed shapes. */
final class ProfileDocumentRenderer {

    static final String VARIETY = "gheg-kosovo";
    static final String TARGET_LEVEL = "C2";

    private final LearnerSummaryWriter summaryWriter = new LearnerSummaryWriter();

    byte[] render(ProfileDocument document, LearnerSnapshot snapshot) {
        return switch (document) {
            case LEARNER_PROFILE -> DocumentJson.write(learnerProfile(snapshot));
            case SKILL_MASTERY -> DocumentJson.write(skillMastery(snapshot));
            case RECENT_ERRORS -> DocumentJson.write(snapshot.recentErrors().stream().map(RecentError::of).toList());
            case LEARNING_PLAN -> snapshot.learningPlanJson() == null
                    ? DocumentJson.write(LearningPlanDocument.EMPTY)
                    : DocumentJson.write(DocumentJson.read(snapshot.learningPlanJson()));
            case LEARNER_SUMMARY -> summaryWriter.write(snapshot).getBytes(StandardCharsets.UTF_8);
        };
    }

    private static LearnerProfileDocument learnerProfile(LearnerSnapshot snapshot) {
        var profile = snapshot.profile();
        return new LearnerProfileDocument(ExportFormat.SCHEMA_VERSION, profile.displayName(), VARIETY,
                profile.motivations().stream().sorted().toList(), profile.dailyGoalMinutes(), profile.currentLevel(),
                TARGET_LEVEL, profile.xpTotal(), new StreakDocument(snapshot.streak().current(), snapshot.streak().longest()));
    }

    /** Keyed by skill tag in alphabetical order; the mastery is the effective value rounded to two decimals. */
    private static Map<String, MasteryDocument> skillMastery(LearnerSnapshot snapshot) {
        Map<String, MasteryDocument> mastery = new TreeMap<>();
        snapshot.mastery().entries().forEach((tag, entry) -> mastery.put(tag.id(), MasteryDocument.of(entry, snapshot)));
        return mastery;
    }

    record LearnerProfileDocument(int schemaVersion, String displayName, String variety, List<Motivation> motivation,
                                  int dailyGoalMinutes, Level currentLevel, String targetLevel, int xpTotal,
                                  StreakDocument streak) {
    }

    record StreakDocument(int current, int longest) {
    }

    record MasteryDocument(double mastery, int attempts, int correct, LocalDate lastPracticed) {

        static MasteryDocument of(Entry entry, LearnerSnapshot snapshot) {
            return new MasteryDocument(Math.round(entry.mastery() * 100) / 100.0, entry.attempts(), entry.correct(),
                    entry.lastPracticed() == null ? null : snapshot.date(entry.lastPracticed()));
        }
    }

    record RecentError(Instant ts, ExerciseType exerciseType, List<String> skillTags, ErrorCategory errorCategory,
                       String prompt, String expected, String given) {

        static RecentError of(ErrorEntry error) {
            return new RecentError(error.at().truncatedTo(ChronoUnit.SECONDS), error.exerciseType(),
                    error.skillTags().stream().map(SkillTag::id).toList(), error.category(), error.prompt(),
                    error.expected(), error.given());
        }
    }

    /** The plan before the first one has been generated (until the first placement test). */
    record LearningPlanDocument(Instant generatedAt, String generatedBy, Level startLevel, List<Object> stages,
                                Map<String, Object> estimates) {

        static final LearningPlanDocument EMPTY = new LearningPlanDocument(null, null, null, List.of(), Map.of());
    }
}
