package app.lingora.domain;

import static app.lingora.domain.AnswerLang.GERMAN;
import static app.lingora.domain.AnswerLang.GHEG;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;
import static org.assertj.core.api.Assertions.assertThatNoException;

import app.lingora.domain.ExercisePayload.FillGap;
import app.lingora.domain.ExercisePayload.MatchPairs;
import app.lingora.domain.ExercisePayload.MultipleChoice;
import app.lingora.domain.ExercisePayload.TranslateFree;
import app.lingora.domain.ExercisePayload.TranslateWordbank;
import app.lingora.domain.ExercisePayload.WordOrder;
import java.util.List;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

class ExercisePayloadTest {

    @Nested
    class MultipleChoiceRules {

        @Test
        void needsFourDistinctChoicesContainingTheSolution() {
            assertThat(new MultipleChoice(List.of("Mirëdita", "Mirupafshim", "Faleminderit", "Po"), List.of("Mirëdita")).type())
                    .isEqualTo(ExerciseType.MULTIPLE_CHOICE);
        }

        @Test
        void rejectsThreeChoices() {
            assertThatIllegalArgumentException()
                    .isThrownBy(() -> new MultipleChoice(List.of("po", "jo", "mirë"), List.of("po")))
                    .withMessage("multiple_choice needs exactly 4 choices, found 3");
        }

        @Test
        void rejectsDuplicateChoices() {
            assertThatIllegalArgumentException()
                    .isThrownBy(() -> new MultipleChoice(List.of("po", "po", "jo", "mirë"), List.of("po")))
                    .withMessageContaining("duplicates");
        }

        @Test
        void rejectsASolutionOutsideTheChoices() {
            assertThatIllegalArgumentException()
                    .isThrownBy(() -> new MultipleChoice(List.of("po", "jo", "mirë", "keq"), List.of("faleminderit")))
                    .withMessageContaining("not one of the choices");
        }

        @Test
        void rejectsMoreThanOneSolution() {
            assertThatIllegalArgumentException()
                    .isThrownBy(() -> new MultipleChoice(List.of("po", "jo", "mirë", "keq"), List.of("po", "jo")))
                    .withMessage("multiple_choice needs exactly 1 solution, found 2");
        }
    }

    @Nested
    class TranslateWordbankRules {

        @Test
        void acceptsTheSolutionWordsPlusTwoToFourDistractorsIgnoringCaseAndPunctuation() {
            assertThatNoException().isThrownBy(() -> new TranslateWordbank(GERMAN, List.of("Guten Tag, wie geht es dir?"),
                    List.of("guten", "Tag", "wie", "geht", "es", "dir", "Abend", "danke")));
            assertThatNoException().isThrownBy(() -> new TranslateWordbank(GHEG, List.of("Si je?"),
                    List.of("Si", "je", "?", "jam", "mirë", "ti", "po")));
        }

        @Test
        void rejectsAMissingSolutionWord() {
            assertThatIllegalArgumentException()
                    .isThrownBy(() -> new TranslateWordbank(GERMAN, List.of("Guten Tag"), List.of("Guten", "Abend", "danke")))
                    .withMessageContaining("must contain every word of 'Guten Tag'");
        }

        @Test
        void countsRepeatedWords() {
            assertThatIllegalArgumentException()
                    .isThrownBy(() -> new TranslateWordbank(GHEG, List.of("Po, po."), List.of("po", "jo", "mirë")))
                    .withMessageContaining("must contain every word");
        }

        @Test
        void rejectsTooFewOrTooManyDistractors() {
            assertThatIllegalArgumentException()
                    .isThrownBy(() -> new TranslateWordbank(GHEG, List.of("Si je?"), List.of("si", "je", "jam")))
                    .withMessageContaining("found 1");
            assertThatIllegalArgumentException()
                    .isThrownBy(() -> new TranslateWordbank(GHEG, List.of("Si je?"), List.of("si", "je", "a", "b", "c", "d", "e")))
                    .withMessageContaining("found 5");
        }
    }

    @Nested
    class FillGapRules {

        @Test
        void needsExactlyOneGap() {
            assertThat(new FillGap(GHEG, "Nâna ___ në shpi.", List.of("âsht"), List.of(), List.of("është")).standardForms())
                    .containsExactly("është");
            assertThatIllegalArgumentException()
                    .isThrownBy(() -> new FillGap(GHEG, "Nâna âsht në shpi.", List.of("âsht"), null, null))
                    .withMessageContaining("exactly one gap");
            assertThatIllegalArgumentException()
                    .isThrownBy(() -> new FillGap(GHEG, "___ ___ në shpi.", List.of("âsht"), null, null))
                    .withMessageContaining("exactly one gap");
        }

        @Test
        void choicesMustOfferTheFirstSolution() {
            assertThatIllegalArgumentException()
                    .isThrownBy(() -> new FillGap(GHEG, "Nâna ___ në shpi.", List.of("âsht"), List.of("jam", "je"), null))
                    .withMessageContaining("choices must contain the first solution 'âsht'");
        }
    }

    @Nested
    class MatchPairsRules {

        @Test
        void needsFivePairsWithUniqueSides() {
            List<MatchPair> pairs = List.of(new MatchPair("Mirëdita", "Guten Tag"), new MatchPair("Mirupafshim", "Auf Wiedersehen"),
                    new MatchPair("Faleminderit", "Danke"), new MatchPair("Po", "Ja"), new MatchPair("Jo", "Nein"));
            assertThat(new MatchPairs(pairs).pairs()).hasSize(5);
            assertThatIllegalArgumentException()
                    .isThrownBy(() -> new MatchPairs(pairs.subList(0, 4)))
                    .withMessage("match_pairs needs exactly 5 pairs, found 4");
        }

        @Test
        void rejectsDuplicateSides() {
            List<MatchPair> pairs = List.of(new MatchPair("Po", "Ja"), new MatchPair("Po", "Jawohl"), new MatchPair("Jo", "Nein"),
                    new MatchPair("Mirë", "Gut"), new MatchPair("Keq", "Schlecht"));
            assertThatIllegalArgumentException().isThrownBy(() -> new MatchPairs(pairs)).withMessageContaining("left sides");
        }
    }

    @Nested
    class WordOrderRules {

        @Test
        void tokensMustBeTheWordsOfTheFirstSolutionInOrder() {
            assertThatNoException().isThrownBy(() -> new WordOrder(GHEG, List.of("Mirëdita", "si", "je"), List.of("Mirëdita, si je?")));
            assertThatIllegalArgumentException()
                    .isThrownBy(() -> new WordOrder(GHEG, List.of("si", "je", "Mirëdita"), List.of("Mirëdita, si je?")))
                    .withMessageContaining("in order");
        }
    }

    @Test
    void requiresAtLeastOneSolution() {
        assertThatIllegalArgumentException()
                .isThrownBy(() -> new TranslateFree(GHEG, List.of(), List.of()))
                .withMessage("solutions must not be empty");
        assertThatIllegalArgumentException()
                .isThrownBy(() -> new TranslateFree(GHEG, List.of(" "), List.of()))
                .withMessage("solutions must not contain blank entries");
    }
}
