package app.lingora.export;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.test.json.JsonContent;

/** The documents in exactly the shapes of PRD 8.3. */
class ProfileDocumentRendererTest {

    private final ProfileDocumentRenderer renderer = new ProfileDocumentRenderer();

    @Test
    void learnerProfile() {
        assertThat(render(ProfileDocument.LEARNER_PROFILE, LearnerSnapshots.erza())).isEqualTo("""
                {
                  "schemaVersion": 1,
                  "displayName": "Erza",
                  "variety": "gheg-kosovo",
                  "motivation": [
                    "family"
                  ],
                  "dailyGoalMinutes": 10,
                  "currentLevel": "A1.2",
                  "targetLevel": "C2",
                  "xpTotal": 1240,
                  "streak": {
                    "current": 12,
                    "longest": 20
                  }
                }
                """);
    }

    @Test
    void learnerProfileBeforeThePlacementTest() {
        assertThat(json(ProfileDocument.LEARNER_PROFILE, LearnerSnapshots.newLearner(LearnerSnapshots.TAKEN_AT, 0, 0)))
                .isStrictlyEqualTo("""
                        {"schemaVersion": 1, "displayName": "Erza", "variety": "gheg-kosovo", "motivation": [],
                         "dailyGoalMinutes": 10, "currentLevel": null, "targetLevel": "C2", "xpTotal": 0,
                         "streak": {"current": 0, "longest": 0}}""");
    }

    @Test
    void skillMasteryWithTheEffectiveValueRoundedAndTheLocalDateOfTheLastPractice() {
        assertThat(json(ProfileDocument.SKILL_MASTERY, LearnerSnapshots.erza())).isStrictlyEqualTo("""
                {
                  "grammar.definite_article.fem": {"mastery": 0.72, "attempts": 48, "correct": 36, "lastPracticed": "2026-09-25"},
                  "grammar.linking_article": {"mastery": 0.44, "attempts": 12, "correct": 5, "lastPracticed": "2026-09-25"},
                  "grammar.verbs.infinitive_me": {"mastery": 0.31, "attempts": 15, "correct": 5, "lastPracticed": "2026-09-25"},
                  "phrase.politeness": {"mastery": 0.99, "attempts": 3, "correct": 3, "lastPracticed": "2026-09-25"},
                  "vocab.family": {"mastery": 0.88, "attempts": 40, "correct": 35, "lastPracticed": "2026-09-24"},
                  "vocab.greetings": {"mastery": 0.95, "attempts": 30, "correct": 29, "lastPracticed": "2026-09-23"},
                  "vocab.home": {"mastery": 0.5, "attempts": 0, "correct": 0, "lastPracticed": null}
                }""");
        assertThat(render(ProfileDocument.SKILL_MASTERY, LearnerSnapshots.erza()))
                .startsWith("{\n  \"grammar.definite_article.fem\"");
    }

    @Test
    void recentErrorsNewestFirstWithSecondPrecision() {
        assertThat(json(ProfileDocument.RECENT_ERRORS, LearnerSnapshots.erza())).isStrictlyEqualTo("""
                [
                  {"ts": "2026-09-25T10:12:03Z", "exerciseType": "translate_free",
                   "skillTags": ["grammar.definite_article.fem"], "errorCategory": "grammar.definite_article",
                   "prompt": "Das Haus ist gross.", "expected": "Shpija âsht e madhe.", "given": "Shpi âsht e madhe."},
                  {"ts": "2026-09-25T10:10:00Z", "exerciseType": "match_pairs", "skillTags": ["vocab.family"],
                   "errorCategory": "vocab.confused", "prompt": "Ordne zu.", "expected": null,
                   "given": "2 Paare falsch zugeordnet"},
                  {"ts": "2026-09-25T10:08:00Z", "exerciseType": "translate_free",
                   "skillTags": ["grammar.definite_article.fem"], "errorCategory": "grammar.definite_article",
                   "prompt": "Das Haus ist gross.", "expected": "Shpija âsht e madhe.", "given": "Shpi âsht e madhe."},
                  {"ts": "2026-09-24T19:00:00Z", "exerciseType": "fill_gap", "skillTags": ["vocab.family"],
                   "errorCategory": "spelling.nasal_vowel", "prompt": "Die Mutter ist zu Hause.",
                   "expected": "Nâna âsht në shpi.", "given": "Nana âsht në shpi."}
                ]""");
    }

    @Test
    void anEmptyLearningPlanBeforeTheFirstPlanExists() {
        assertThat(json(ProfileDocument.LEARNING_PLAN, LearnerSnapshots.erza())).isStrictlyEqualTo("""
                {"generatedAt": null, "generatedBy": null, "startLevel": null, "stages": [], "estimates": {}}""");
    }

    @Test
    void theCurrentLearningPlanAsStored() {
        String plan = """
                {"generatedAt": "2026-09-25T10:05:00Z", "generatedBy": "rule_based_v1", "startLevel": "A1.2",
                 "stages": [{"level": "A1.2", "units": [{"unitId": "a1_u4", "title": "Zuhause", "status": "in_progress",
                 "estimatedLessons": 6}]}], "estimates": {"A2": "2026-11-10"}}""";
        LearnerSnapshot erza = LearnerSnapshots.erza();
        LearnerSnapshot withPlan = new LearnerSnapshot(erza.takenAt(), erza.timeZone(), erza.profile(), erza.streak(),
                erza.mastery(), erza.skillTagLabels(), erza.recentErrors(), erza.frequentErrors(), erza.learnedWords(), plan);

        assertThat(json(ProfileDocument.LEARNING_PLAN, withPlan)).isStrictlyEqualTo(plan);
    }

    @Test
    void theSummaryIsMarkdown() {
        assertThat(render(ProfileDocument.LEARNER_SUMMARY, LearnerSnapshots.erza())).startsWith("# Lernstand Erza");
        assertThat(ProfileDocument.LEARNER_SUMMARY.mediaType()).isEqualTo("text/markdown;charset=UTF-8");
        assertThat(ProfileDocument.RECENT_ERRORS.mediaType()).isEqualTo("application/json");
    }

    private String render(ProfileDocument document, LearnerSnapshot snapshot) {
        return new String(renderer.render(document, snapshot), StandardCharsets.UTF_8);
    }

    private JsonContent json(ProfileDocument document, LearnerSnapshot snapshot) {
        return new JsonContent(render(document, snapshot));
    }
}
