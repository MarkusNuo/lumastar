package app.lingora.export;

import app.lingora.domain.ErrorCategory;
import app.lingora.domain.ErrorCategoryCount;
import app.lingora.domain.ErrorEntry;
import app.lingora.domain.ExerciseType;
import app.lingora.domain.LearnerProfile;
import app.lingora.domain.Level;
import app.lingora.domain.Motivation;
import app.lingora.domain.SkillMastery;
import app.lingora.domain.SkillMastery.Entry;
import app.lingora.domain.SkillTag;
import app.lingora.export.LearnerSnapshot.CurrentUnit;
import app.lingora.export.LearnerSnapshot.Streak;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Snapshots for document tests: the learner of the PRD 8.3 examples and a learner who has just signed up. */
final class LearnerSnapshots {

    static final Instant TAKEN_AT = Instant.parse("2026-09-25T10:15:00Z");
    static final ZoneId ZURICH = ZoneId.of("Europe/Zurich");
    private static final UUID USER = UUID.fromString("00000000-0000-0000-0000-00000000e405");

    private LearnerSnapshots() {
    }

    static LearnerSnapshot erza() {
        return new LearnerSnapshot(TAKEN_AT, ZURICH,
                new LearnerProfile(USER, "Erza", Set.of(Motivation.FAMILY), 10, Level.A1_2, 1240),
                new Streak(12, 20),
                new SkillMastery(Map.of(
                        tag("vocab.family"), new Entry(0.8812, 40, 35, Instant.parse("2026-09-24T18:00:00Z")),
                        tag("vocab.greetings"), new Entry(0.951, 30, 29, Instant.parse("2026-09-23T08:00:00Z")),
                        tag("grammar.definite_article.fem"), new Entry(0.7249, 48, 36, Instant.parse("2026-09-24T22:30:00Z")),
                        tag("grammar.verbs.infinitive_me"), new Entry(0.3149, 15, 5, Instant.parse("2026-09-25T09:00:00Z")),
                        tag("grammar.linking_article"), new Entry(0.44, 12, 5, Instant.parse("2026-09-25T09:10:00Z")),
                        tag("phrase.politeness"), new Entry(0.99, 3, 3, Instant.parse("2026-09-25T09:20:00Z")),
                        tag("vocab.home"), new Entry(0.5, 0, 0, null))),
                Map.of(tag("vocab.family"), "Familie",
                        tag("vocab.greetings"), "Begrüssung",
                        tag("grammar.definite_article.fem"), "Bestimmter Artikel (feminin)",
                        tag("grammar.verbs.infinitive_me"), "Infinitiv me + Partizip",
                        tag("grammar.linking_article"), "Verbindungsartikel",
                        tag("phrase.politeness"), "Höflichkeit"),
                List.of(
                        error("2026-09-25T10:12:03.456789Z", ExerciseType.TRANSLATE_FREE, "grammar.definite_article.fem",
                                ErrorCategory.GRAMMAR_DEFINITE_ARTICLE, "Das Haus ist gross.", "Shpija âsht e madhe.",
                                "Shpi âsht e madhe."),
                        error("2026-09-25T10:10:00Z", ExerciseType.MATCH_PAIRS, "vocab.family",
                                ErrorCategory.VOCAB_CONFUSED, "Ordne zu.", null, "2 Paare falsch zugeordnet"),
                        error("2026-09-25T10:08:00Z", ExerciseType.TRANSLATE_FREE, "grammar.definite_article.fem",
                                ErrorCategory.GRAMMAR_DEFINITE_ARTICLE, "Das Haus ist gross.", "Shpija âsht e madhe.",
                                "Shpi âsht e madhe."),
                        error("2026-09-24T19:00:00Z", ExerciseType.FILL_GAP, "vocab.family",
                                ErrorCategory.SPELLING_NASAL_VOWEL, "Die Mutter ist zu Hause.", "Nâna âsht në shpi.",
                                "Nana âsht në shpi.")),
                List.of(new ErrorCategoryCount(ErrorCategory.SPELLING_NASAL_VOWEL, 5),
                        new ErrorCategoryCount(ErrorCategory.GRAMMAR_DEFINITE_ARTICLE, 3)),
                340,
                null,
                new CurrentUnit("Zuhause", Level.A1_2));
    }

    static LearnerSnapshot newLearner(Instant takenAt, int streakDays, int learnedWords) {
        return new LearnerSnapshot(takenAt, ZURICH, new LearnerProfile(USER, "Erza", Set.of(), 10, null, 0),
                new Streak(streakDays, streakDays), new SkillMastery(Map.of()), Map.of(), List.of(), List.of(), learnedWords, null,
                null);
    }

    /** A learner without history but the given recent errors, newest first. */
    static LearnerSnapshot withRecentErrors(ErrorEntry... errors) {
        return new LearnerSnapshot(TAKEN_AT, ZURICH, new LearnerProfile(USER, "Erza", Set.of(), 10, Level.A1_1, 0),
                new Streak(0, 0), new SkillMastery(Map.of()), Map.of(), List.of(errors), List.of(), 0, null, null);
    }

    private static SkillTag tag(String id) {
        return SkillTag.of(id);
    }

    static ErrorEntry error(String at, ExerciseType type, String tag, ErrorCategory category, String prompt,
                            String expected, String given) {
        return new ErrorEntry(Instant.parse(at), "ex_test", type, List.of(tag(tag)), category, prompt, expected, given);
    }
}
