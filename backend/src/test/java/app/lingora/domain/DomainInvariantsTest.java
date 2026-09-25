package app.lingora.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class DomainInvariantsTest {

    private static final ExercisePayload PAYLOAD = new ExercisePayload.TranslateFree(AnswerLang.GHEG, List.of("Si je?"), List.of());

    @Test
    void exerciseTakesItsTypeFromThePayload() {
        assertThat(exercise(1, List.of(SkillTag.of("vocab.greetings"))).type()).isEqualTo(ExerciseType.TRANSLATE_FREE);
    }

    @Test
    void exerciseDifficultyIsBetweenOneAndThree() {
        assertThatIllegalArgumentException()
                .isThrownBy(() -> exercise(4, List.of(SkillTag.of("vocab.greetings"))))
                .withMessage("difficulty must be between 1 and 3, found 4");
    }

    @Test
    void exerciseNeedsASkillTag() {
        assertThatIllegalArgumentException()
                .isThrownBy(() -> exercise(1, List.of()))
                .withMessage("skillTags must not be empty");
    }

    @Test
    void errorHintNeedsAValidRegex() {
        assertThatIllegalArgumentException()
                .isThrownBy(() -> new ErrorHint("^shpi(", ErrorCategory.GRAMMAR_DEFINITE_ARTICLE, null))
                .withMessageContaining("not a valid regex");
    }

    @Test
    void stageContainsOnlyUnitsOfItsLevel() {
        Unit numbers = new Unit("a1_u03_numbers", Level.A1_2, "Zahlen", null, List.of(), List.of(), null, null, null,
                List.of(), List.of(), List.of());
        assertThat(numbers.isSkeleton()).isTrue();
        assertThatIllegalArgumentException()
                .isThrownBy(() -> new Stage(Level.A1_1, "Erste Gespräche", List.of(numbers)))
                .withMessage("unit a1_u03_numbers has level A1.2 but belongs to stage A1.1");
    }

    @Test
    void curriculumStagesAscend() {
        assertThatIllegalArgumentException()
                .isThrownBy(() -> new Curriculum("gheg-kosovo", List.of(
                        new Stage(Level.A1_2, "Alltag", List.of()), new Stage(Level.A1_1, "Erste Gespräche", List.of()))))
                .withMessage("stages must be in ascending level order, but A1.1 follows A1.2");
    }

    @Test
    void evaluationResultKeepsOutcomeCategoryAndRatingConsistent() {
        assertThat(new EvaluationResult(Outcome.CORRECT_STANDARD_FORM, ErrorCategory.VARIANT_STANDARD_FORM,
                "Auf Gheg: âsht", null, "âsht", Rating.GOOD).countsAsCorrect()).isTrue();
        assertThat(new EvaluationResult(Outcome.ALMOST_CORRECT, ErrorCategory.SPELLING_NASAL_VOWEL,
                null, null, "âsht", Rating.HARD).countsAsCorrect()).isTrue();
        assertThat(new EvaluationResult(Outcome.WRONG, ErrorCategory.VOCAB_UNKNOWN,
                null, null, "âsht", Rating.AGAIN).countsAsCorrect()).isFalse();
        assertThatIllegalArgumentException()
                .isThrownBy(() -> new EvaluationResult(Outcome.CORRECT, ErrorCategory.SPELLING_OTHER, null, null, null, Rating.GOOD));
        assertThatIllegalArgumentException()
                .isThrownBy(() -> new EvaluationResult(Outcome.ALMOST_CORRECT, null, null, null, null, Rating.HARD));
        assertThatIllegalArgumentException()
                .isThrownBy(() -> new EvaluationResult(Outcome.WRONG, ErrorCategory.VOCAB_UNKNOWN, null, null, null, Rating.HARD));
        assertThatIllegalArgumentException()
                .isThrownBy(() -> new EvaluationResult(Outcome.CORRECT, null, null, null, null, Rating.AGAIN));
    }

    @Test
    void srsCardCannotLapseMoreOftenThanItWasReviewed() {
        assertThatIllegalArgumentException()
                .isThrownBy(() -> new SrsCard("item_shpi", CardState.REVIEW, null, 3.2, 5.1, Instant.EPOCH, Instant.EPOCH, 1, 2));
    }

    @Test
    void placementResultListsAtMostThreeStrengthsAndWeaknesses() {
        List<SkillTag> four = List.of(SkillTag.of("vocab.a"), SkillTag.of("vocab.b"), SkillTag.of("vocab.c"), SkillTag.of("vocab.d"));
        assertThatIllegalArgumentException()
                .isThrownBy(() -> new PlacementResult(Level.A1_1, Map.of(), four, List.of(), Map.of()));
    }

    private static Exercise exercise(int difficulty, List<SkillTag> tags) {
        return new Exercise("ex_a1_u01_002", Level.A1_1, difficulty, tags, List.of("item_si_je"), null,
                new Prompt(AnswerLang.GERMAN, "Wie geht es dir?"), "„Si je?“ fragt nach dem Befinden.", List.of(),
                ExerciseSource.MANUAL, false, null, PAYLOAD);
    }
}
