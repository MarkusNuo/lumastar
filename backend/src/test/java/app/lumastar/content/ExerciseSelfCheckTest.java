package app.lumastar.content;

import static org.assertj.core.api.Assertions.assertThat;

import app.lumastar.core.evaluation.RuleBasedAnswerEvaluator;
import app.lumastar.core.evaluation.StandardFormLexicon;
import app.lumastar.domain.AnswerLang;
import app.lumastar.domain.ErrorCategory;
import app.lumastar.domain.ErrorHint;
import app.lumastar.domain.Exercise;
import app.lumastar.domain.ExercisePayload;
import app.lumastar.domain.ExerciseSource;
import app.lumastar.domain.Level;
import app.lumastar.domain.MatchPair;
import app.lumastar.domain.Prompt;
import app.lumastar.domain.SkillTag;
import java.util.List;
import org.junit.jupiter.api.Test;

/** The check behind {@link ContentSelfConsistencyTest} finds each kind of inconsistency it promises to find. */
class ExerciseSelfCheckTest {

    private final ExerciseSelfCheck check = new ExerciseSelfCheck(new RuleBasedAnswerEvaluator(StandardFormLexicon.of(
            List.of(new StandardFormLexicon.Word("është", List.of("âsht"))), List.of())));

    @Test
    void aConsistentExerciseOfEveryTypeHasNoViolations() {
        assertThat(List.of(
                exercise(new ExercisePayload.MultipleChoice(List.of("po", "jo", "mirë", "faleminderit"), List.of("po"))),
                exercise(new ExercisePayload.FillGap(AnswerLang.GHEG, "Nâna ___ në shpi.", List.of("âsht"),
                        List.of("âsht", "jam", "je", "janë"), List.of())),
                exercise(new ExercisePayload.TranslateFree(AnswerLang.GHEG, List.of("Shpija âsht e madhe."),
                        List.of("Shtëpia është e madhe."))),
                exercise(new ExercisePayload.TranslateWordbank(AnswerLang.GHEG, List.of("Unë jam Erza."),
                        List.of("Unë", "jam", "Erza", "je", "âsht"))),
                exercise(new ExercisePayload.WordOrder(AnswerLang.GHEG, List.of("Si", "je"), List.of("Si je?"))),
                exercise(greetingPairs("mirupafshim"))))
                .allSatisfy(exercise -> assertThat(check.violations(exercise)).isEmpty());
    }

    @Test
    void findsAStandardFormThatIsAlsoAGhegSolution() {
        Exercise free = exercise(new ExercisePayload.TranslateFree(AnswerLang.GHEG, List.of("Shpija âsht e madhe.", "Shpija është e madhe."),
                List.of("Shpija është e madhe!")));

        assertThat(check.violations(free))
                .containsExactly("the Standard form 'Shpija është e madhe!' evaluates to correct instead of correct_standard_form");
    }

    @Test
    void findsAnErrorHintThatMatchesASolution() {
        Exercise gap = exercise(new ExercisePayload.FillGap(AnswerLang.GHEG, "Nâna ___ në shpi.", List.of("âsht"), List.of(), List.of()),
                new ErrorHint("sht$", ErrorCategory.SPELLING_NASAL_VOWEL, null));

        assertThat(check.violations(gap)).containsExactly("the error hint /sht$/ (spelling.nasal_vowel) matches the solution 'âsht'");
    }

    @Test
    void findsAChoiceThatOnlyLooksLikeADistractor() {
        Exercise choice = exercise(new ExercisePayload.MultipleChoice(List.of("po", "Po!", "jo", "mirë"), List.of("po")));

        assertThat(check.violations(choice)).containsExactly("the distractor 'Po!' evaluates to correct instead of wrong");
    }

    @Test
    void findsDistractorTilesThatCompleteAnAcceptedAnswer() {
        Exercise duplicate = exercise(new ExercisePayload.TranslateWordbank(AnswerLang.GHEG, List.of("Unë jam Erza."),
                List.of("Unë", "jam", "Erza", "Jam", "je")));
        Exercise alternative = exercise(new ExercisePayload.TranslateWordbank(AnswerLang.GHEG, List.of("Si je?", "Si jeni?", "Mirë"),
                List.of("Si", "je", "jeni", "mirë")));

        assertThat(check.violations(duplicate)).containsExactly("the distractor tile 'jam' in place of 'jam' evaluates to correct instead of wrong");
        assertThat(check.violations(alternative)).containsExactly(
                "the distractor tile 'jeni' in place of 'je' evaluates to correct instead of wrong",
                "the distractor tile 'mirë' alone evaluates to correct instead of wrong");
    }

    @Test
    void findsPairsWhoseSidesCannotBeToldApart() {
        Exercise pairs = exercise(greetingPairs("Po!"));

        assertThat(check.violations(pairs)).contains(
                "the wrong match 'Po!' → 'ja' is rejected: match_pairs ex_check_unit_001: Po! → ja is a correct pair, not a wrong match");
    }

    /** Five greetings; {@code fifth} is the Gheg side of the fifth pair. */
    private static ExercisePayload.MatchPairs greetingPairs(String fifth) {
        return new ExercisePayload.MatchPairs(List.of(new MatchPair("po", "ja"), new MatchPair("jo", "nein"),
                new MatchPair("mirëdita", "guten Tag"), new MatchPair("faleminderit", "danke"), new MatchPair(fifth, "jawohl")));
    }

    private static Exercise exercise(ExercisePayload payload, ErrorHint... hints) {
        return new Exercise("ex_check_unit_001", Level.A1_1, 1, List.of(SkillTag.of("vocab.greetings")), List.of(), null,
                new Prompt(AnswerLang.GERMAN, "Übersetze."), "Erklärung.", List.of(hints), ExerciseSource.MANUAL, false, null, payload);
    }
}
