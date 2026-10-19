package app.lumastar.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import app.lumastar.IntegrationTest;
import app.lumastar.LearnerFixture;
import app.lumastar.LearnerFixture.Answer;
import app.lumastar.content.ContentFixture;
import app.lumastar.content.ContentLoader;
import app.lumastar.content.ContentSeeder;
import app.lumastar.domain.ErrorCategory;
import app.lumastar.domain.ErrorCategoryCount;
import app.lumastar.domain.ErrorEntry;
import app.lumastar.domain.ExerciseType;
import app.lumastar.domain.SkillTag;
import app.lumastar.domain.SkillTagErrorRate;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/** Error analysis on synthetic answers at chosen times; the window is 14 days. */
class ErrorAnalysisQueriesTest extends IntegrationTest {

    private static final Instant NOW = Instant.parse("2026-09-25T10:00:00Z");
    private static final Instant TWO_WEEKS_AGO = NOW.minus(Duration.ofDays(14));
    private static final List<String> HOUSE_TAGS = List.of("grammar.definite_article.fem", "vocab.home");
    private static final List<String> MOTHER_TAGS = List.of("vocab.family", "grammar.definite_article.fem");
    private static final List<String> VERB_BE_TAGS = List.of("grammar.verb_be", "vocab.family");

    @Autowired
    private ContentLoader loader;

    @Autowired
    private ContentSeeder seeder;

    @Autowired
    private ErrorAnalysisQueries queries;

    private LearnerFixture fixture;
    private UUID learner;
    private UUID lesson;

    @BeforeEach
    void learnerWithAFamilyLesson() {
        jdbc.sql("TRUNCATE content_skill_tags, content_stages, content_units, content_items, exercises CASCADE").update();
        jdbc.sql("DELETE FROM users").update();
        seeder.seed(loader.load(ContentFixture.path()));
        fixture = new LearnerFixture(jdbc);
        learner = fixture.learner("Erza");
        lesson = fixture.lesson(learner, "a1_u02_family", NOW.minus(Duration.ofDays(20)));
    }

    @Test
    void errorRatesPerSkillTagCountFirstAnswersOfTheLastFourteenDays() {
        answer(house("wrong", "grammar.definite_article", false, daysAgo(15)));
        answer(house("wrong", "grammar.definite_article", false, daysAgo(13)));
        answer(house("wrong", "grammar.definite_article", true, daysAgo(13)));
        answer(mother("correct", null, daysAgo(1)));
        answer(verbBe("almost_correct", "spelling.nasal_vowel", daysAgo(1)));
        answerOfAnotherLearner();

        List<SkillTagErrorRate> rates = queries.errorRatesBySkillTag(learner, TWO_WEEKS_AGO);

        assertThat(rates).extracting(rate -> rate.tag().id(), SkillTagErrorRate::attempts, SkillTagErrorRate::wrong)
                .containsExactly(
                        tuple("vocab.home", 1, 1),
                        tuple("grammar.definite_article.fem", 2, 1),
                        tuple("grammar.verb_be", 1, 0),
                        tuple("vocab.family", 2, 0));
        assertThat(rates.get(1).errorRate()).isEqualTo(0.5);
    }

    @Test
    void includesAnAnswerExactlyAtTheStartOfTheWindow() {
        answer(house("wrong", "grammar.definite_article", false, TWO_WEEKS_AGO));

        assertThat(queries.errorRatesBySkillTag(learner, TWO_WEEKS_AGO)).hasSize(2);
        assertThat(queries.errorRatesBySkillTag(learner, TWO_WEEKS_AGO.plusMillis(1))).isEmpty();
    }

    @Test
    void topErrorCategoriesCountWrongAndAlmostCorrectAnswersButNotStandardForms() {
        answer(house("wrong", "grammar.definite_article", false, daysAgo(2)));
        answer(house("wrong", "grammar.definite_article", false, daysAgo(3)));
        answer(house("wrong", "grammar.definite_article", true, daysAgo(3)));
        answer(verbBe("almost_correct", "spelling.nasal_vowel", daysAgo(1)));
        answer(house("correct_standard_form", "variant.standard_form", false, daysAgo(1)));
        answer(house("wrong", "vocab.unknown", false, daysAgo(40)));
        answerOfAnotherLearner();

        List<ErrorCategoryCount> top = queries.topErrorCategories(learner, NOW.minus(Duration.ofDays(30)), 5);

        assertThat(top).containsExactly(
                new ErrorCategoryCount(ErrorCategory.GRAMMAR_DEFINITE_ARTICLE, 2),
                new ErrorCategoryCount(ErrorCategory.SPELLING_NASAL_VOWEL, 1));
        assertThat(queries.topErrorCategories(learner, NOW.minus(Duration.ofDays(30)), 1)).hasSize(1);
    }

    @Test
    void recentErrorsAreTheLatestLoggedErrorsWithPromptExpectedAndGivenAnswer() {
        answer(house("wrong", "grammar.definite_article", false, daysAgo(3)));
        answer(new Answer("ex_a1_u01_004", "match_pairs", List.of("vocab.greetings", "phrase.politeness"), """
                {"mistakes": 2}""", "wrong", "vocab.confused", null, false, daysAgo(2)));
        answer(new Answer("ex_a1_u01_005", "word_order", List.of("phrase.politeness"), """
                {"tokens": ["si", "Mirëdita", "je"]}""", "wrong", "grammar.word_order", "Mirëdita si je?", false, daysAgo(1)));
        answer(new Answer("ex_a1_u02_003", "multiple_choice", MOTHER_TAGS, """
                {"choice": "der Vater"}""", "wrong", "vocab.unknown", "die Mutter", false, daysAgo(1).plusSeconds(1)));
        answer(house("correct_standard_form", "variant.standard_form", false, NOW));
        answer(house("wrong", "grammar.definite_article", true, NOW));

        List<ErrorEntry> errors = queries.recentErrors(learner, 3);

        assertThat(errors).extracting(ErrorEntry::exerciseId, ErrorEntry::given, ErrorEntry::expected)
                .containsExactly(
                        tuple("ex_a1_u02_003", "der Vater", "die Mutter"),
                        tuple("ex_a1_u01_005", "si Mirëdita je", "Mirëdita si je?"),
                        tuple("ex_a1_u01_004", "2 Paare falsch zugeordnet", null));
        assertThat(errors.getFirst()).isEqualTo(new ErrorEntry(daysAgo(1).plusSeconds(1), "ex_a1_u02_003",
                ExerciseType.MULTIPLE_CHOICE, MOTHER_TAGS.stream().map(SkillTag::of).toList(), ErrorCategory.VOCAB_UNKNOWN,
                "Was bedeutet „nâna“?", "die Mutter", "der Vater"));
        assertThat(queries.recentErrors(learner, 10).getLast())
                .extracting(ErrorEntry::prompt, ErrorEntry::given, ErrorEntry::expected)
                .containsExactly("Das Haus ist gross.", "Shpi âsht e madhe.", "Shpija âsht e madhe.");
    }

    @Test
    void showsTheReportedWrongMatchesOfPairsAsTheGivenAnswer() {
        answer(new Answer("ex_a1_u01_004", "match_pairs", List.of("vocab.greetings", "phrase.politeness"), """
                {"wrongMatches": [{"left": "Po", "right": "Nein"}, {"left": "Jo", "right": "Ja"}]}""",
                "wrong", "vocab.confused", null, false, daysAgo(1)));

        assertThat(queries.recentErrors(learner, 1)).singleElement().extracting(ErrorEntry::given, ErrorEntry::expected)
                .containsExactly("Po → Nein, Jo → Ja", null);
    }

    @Test
    void fallsBackToTheFirstSolutionOfTheExerciseForAnswersRecordedWithoutIt() {
        answer(new Answer("ex_a1_u02_002", "translate_free", HOUSE_TAGS, """
                {"text": "Shpi"}""", "wrong", "grammar.definite_article", null, false, daysAgo(1)));

        assertThat(queries.recentErrors(learner, 1)).singleElement().extracting(ErrorEntry::expected)
                .isEqualTo("Shpija âsht e madhe.");
    }

    @Test
    void frequentErrorsRankTheTagsByWrongFirstAnswersWithTheirMostFrequentCategory() {
        answer(house("wrong", "grammar.definite_article", false, daysAgo(2)));
        answer(house("wrong", "grammar.definite_article", false, daysAgo(2)));
        answer(house("wrong", "vocab.unknown", false, daysAgo(2)));
        answer(house("wrong", "vocab.unknown", true, daysAgo(2)));
        answer(mother("wrong", "vocab.confused", daysAgo(1)));
        answer(mother("correct", null, daysAgo(1)));
        answer(verbBe("almost_correct", "spelling.nasal_vowel", daysAgo(1)));
        answer(house("wrong", "grammar.definite_article", false, daysAgo(40)));
        answerOfAnotherLearner();

        List<ErrorAnalysisQueries.FrequentErrors> frequent = queries.frequentErrorsBySkillTag(learner,
                NOW.minus(Duration.ofDays(30)), 3);

        assertThat(frequent).extracting(errors -> errors.rate().tag().id(), errors -> errors.rate().attempts(),
                        errors -> errors.rate().wrong(), ErrorAnalysisQueries.FrequentErrors::category)
                .containsExactly(
                        tuple("grammar.definite_article.fem", 5, 4, ErrorCategory.GRAMMAR_DEFINITE_ARTICLE),
                        tuple("vocab.home", 3, 3, ErrorCategory.GRAMMAR_DEFINITE_ARTICLE),
                        tuple("vocab.family", 3, 1, ErrorCategory.VOCAB_CONFUSED));
        assertThat(queries.frequentErrorsBySkillTag(learner, NOW.minus(Duration.ofDays(30)), 10))
                .as("no tag without a wrong answer, e.g. grammar.verb_be").hasSize(3);
    }

    private Answer house(String outcome, String category, boolean retry, Instant at) {
        return new Answer("ex_a1_u02_002", "translate_free", HOUSE_TAGS, """
                {"text": "Shpi âsht e madhe."}""", outcome, category, "Shpija âsht e madhe.", retry, at);
    }

    private Answer mother(String outcome, String category, Instant at) {
        return new Answer("ex_a1_u02_003", "multiple_choice", MOTHER_TAGS, """
                {"choice": "die Mutter"}""", outcome, category, "die Mutter", false, at);
    }

    private Answer verbBe(String outcome, String category, Instant at) {
        return new Answer("ex_a1_u02_001", "fill_gap", VERB_BE_TAGS, """
                {"choice": "asht"}""", outcome, category, "âsht", false, at);
    }

    private void answer(Answer answer) {
        fixture.answer(learner, lesson, answer);
    }

    private void answerOfAnotherLearner() {
        UUID other = fixture.learner("Arta");
        fixture.answer(other, fixture.lesson(other, "a1_u02_family", daysAgo(3)),
                house("wrong", "grammar.definite_article", false, daysAgo(2)));
    }

    private static Instant daysAgo(int days) {
        return NOW.minus(Duration.ofDays(days));
    }
}
