package app.lumastar.core.evaluation;

import static app.lumastar.core.evaluation.TestExercises.EXPLANATION;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.lumastar.content.GhegBlocklistReader;
import app.lumastar.domain.Answer;
import app.lumastar.domain.ErrorCategory;
import app.lumastar.domain.ErrorHint;
import app.lumastar.domain.EvaluationResult;
import app.lumastar.domain.Exercise;
import app.lumastar.domain.MatchPair;
import app.lumastar.domain.Outcome;
import app.lumastar.domain.Rating;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

/** Evaluation rules of PRD F5/F6 and LANGUAGE_GUIDE section 11, with the real Gheg blocklist of {@code /content}. */
class RuleBasedAnswerEvaluatorTest {

    private static final Duration TIME = Duration.ofSeconds(4);
    private static final StandardFormLexicon BLOCKLIST = GhegBlocklistReader.read(Path.of("../content", GhegBlocklistReader.FILE));
    private static final ErrorHint MISSING_ARTICLE = new ErrorHint("^shpi\\b", ErrorCategory.GRAMMAR_DEFINITE_ARTICLE,
            "Das Haus = shpija (Artikel als Endung).");

    private final AnswerEvaluator evaluator = new RuleBasedAnswerEvaluator(BLOCKLIST);

    private static final Exercise HOUSE = TestExercises.translateFree(List.of("Shpija âsht e madhe."),
            List.of("Shtëpia është e madhe."), MISSING_ARTICLE);
    private static final Exercise HOUSE_WITHOUT_STANDARD_FORMS = TestExercises.translateFree(List.of("Shpija âsht e madhe."), List.of());
    private static final Exercise COFFEE = TestExercises.translateFree(
            List.of("Nji kafe, ju lutem.", "Nji kafe, të lutem.", "Ju lutem, nji kafe."), List.of("Një kafe, ju lutem."));
    private static final Exercise WHAT_ARE_YOU_DOING = TestExercises.translateFree(List.of("Çka po bân?", "Çka bân?"),
            List.of("Çfarë po bën?", "Çfarë bën?", "Çka po bën?"));

    @Nested
    class ExactAnswers {

        @Test
        void acceptsTheSolution() {
            EvaluationResult result = typed(HOUSE, "Shpija âsht e madhe.");

            assertThat(result.outcome()).isEqualTo(Outcome.CORRECT);
            assertThat(result.countsAsCorrect()).isTrue();
            assertThat(result.errorCategory()).isNull();
            assertThat(result.hint()).isNull();
            assertThat(result.rating()).isEqualTo(Rating.GOOD);
            assertThat(result.solution()).isEqualTo("Shpija âsht e madhe.");
            assertThat(result.explanation()).isEqualTo(EXPLANATION);
        }

        @Test
        void ignoresCaseAndPunctuation() {
            assertThat(typed(HOUSE, "shpija ÂSHT e madhe").outcome()).isEqualTo(Outcome.CORRECT);
            assertThat(typed(HOUSE, "  „Shpija âsht,  e madhe!!“ ").outcome()).isEqualTo(Outcome.CORRECT);
        }

        @Test
        void ignoresApostrophes() {
            Exercise welcome = TestExercises.translateFree(List.of("S'ka përse."), List.of());

            assertThat(typed(welcome, "ska përse").outcome()).isEqualTo(Outcome.CORRECT);
            assertThat(typed(welcome, "S’ka përse!").outcome()).isEqualTo(Outcome.CORRECT);
        }

        @Test
        void acceptsEverySolutionAndShowsTheMatchedOne() {
            EvaluationResult result = typed(COFFEE, "Ju lutem, nji kafe");

            assertThat(result.outcome()).isEqualTo(Outcome.CORRECT);
            assertThat(result.solution()).isEqualTo("Ju lutem, nji kafe.");
            assertThat(typed(COFFEE, "nji kafe të lutem").solution()).isEqualTo("Nji kafe, të lutem.");
        }

        @Test
        void comparesDecomposedInputInNfc() {
            assertThat(typed(HOUSE, "Shpija âsht e madhe").outcome()).isEqualTo(Outcome.CORRECT);
        }
    }

    @Nested
    class MissingDiacritics {

        @Test
        void missingCircumflexIsAlmostCorrectAsNasalVowel() {
            EvaluationResult result = typed(HOUSE, "Shpija asht e madhe");

            assertThat(result.outcome()).isEqualTo(Outcome.ALMOST_CORRECT);
            assertThat(result.countsAsCorrect()).isTrue();
            assertThat(result.errorCategory()).isEqualTo(ErrorCategory.SPELLING_NASAL_VOWEL);
            assertThat(result.rating()).isEqualTo(Rating.HARD);
            assertThat(result.hint()).isEqualTo("Achte auf den Zirkumflex: **âsht**");
            assertThat(result.solution()).isEqualTo("Shpija âsht e madhe.");
        }

        @Test
        void missingCedillaIsAlmostCorrectAsDiacritics() {
            EvaluationResult result = typed(WHAT_ARE_YOU_DOING, "cka po bân");

            assertThat(result.outcome()).isEqualTo(Outcome.ALMOST_CORRECT);
            assertThat(result.errorCategory()).isEqualTo(ErrorCategory.SPELLING_DIACRITICS);
            assertThat(result.hint()).isEqualTo("Achte auf die Sonderzeichen: **Çka**");
        }

        @Test
        void missingTremaIsAlmostCorrectAsDiacritics() {
            Exercise fine = TestExercises.translateFree(List.of("Mirë jam."), List.of());

            EvaluationResult result = typed(fine, "Mire jam");

            assertThat(result.outcome()).isEqualTo(Outcome.ALMOST_CORRECT);
            assertThat(result.errorCategory()).isEqualTo(ErrorCategory.SPELLING_DIACRITICS);
            assertThat(result.hint()).isEqualTo("Achte auf die Sonderzeichen: **Mirë**");
        }

        @Test
        void circumflexAndTremaMissingTogetherCountAsDiacritics() {
            EvaluationResult result = typed(WHAT_ARE_YOU_DOING, "Cka po ban?");

            assertThat(result.errorCategory()).isEqualTo(ErrorCategory.SPELLING_DIACRITICS);
            assertThat(result.hint()).isEqualTo("Achte auf die Sonderzeichen: **Çka**, **bân**");
        }

        @Test
        void anAddedDiacriticIsNotAlmostCorrect() {
            Exercise iAm = TestExercises.typedGap(List.of("jam"), List.of());

            EvaluationResult result = typed(iAm, "jâm");

            assertThat(result.outcome()).isEqualTo(Outcome.WRONG);
            assertThat(result.errorCategory()).isEqualTo(ErrorCategory.GRAMMAR_VERB_CONJUGATION);
        }

        @Test
        void aMissingCircumflexInATypedGapIsAlmostCorrect() {
            EvaluationResult result = typed(TestExercises.typedGap(List.of("âsht"), List.of()), "asht");

            assertThat(result.outcome()).isEqualTo(Outcome.ALMOST_CORRECT);
            assertThat(result.errorCategory()).isEqualTo(ErrorCategory.SPELLING_NASAL_VOWEL);
        }
    }

    @Nested
    class StandardForms {

        @Test
        void listedStandardFormIsCorrectWithAHint() {
            EvaluationResult result = typed(HOUSE, "Shtëpia është e madhe.");

            assertThat(result.outcome()).isEqualTo(Outcome.CORRECT_STANDARD_FORM);
            assertThat(result.countsAsCorrect()).isTrue();
            assertThat(result.errorCategory()).isEqualTo(ErrorCategory.VARIANT_STANDARD_FORM);
            assertThat(result.rating()).isEqualTo(Rating.GOOD);
            assertThat(result.solution()).isEqualTo("Shpija âsht e madhe.");
            assertThat(result.hint()).isEqualTo("Auf Gheg sagt man eher **shpija** statt **shtëpia** und **âsht** statt **është**.");
        }

        @Test
        void standardFormOfIstIsRecognisedFromTheBlocklist() {
            EvaluationResult result = typed(TestExercises.typedGap(List.of("âsht"), List.of()), "është");

            assertThat(result.outcome()).isEqualTo(Outcome.CORRECT_STANDARD_FORM);
            assertThat(result.hint()).isEqualTo("Auf Gheg sagt man eher **âsht** statt **është**.");
        }

        @Test
        void blocklistWordsAreRecognisedInsideASentence() {
            Exercise mother = TestExercises.translateFree(List.of("Nâna âsht në shpi."), List.of());

            EvaluationResult result = typed(mother, "Nëna është në shpi.");

            assertThat(result.outcome()).isEqualTo(Outcome.CORRECT_STANDARD_FORM);
            assertThat(result.hint()).isEqualTo("Auf Gheg sagt man eher **nâna** statt **nëna** und **âsht** statt **është**.");
        }

        @Test
        void blocklistPatternsRecogniseStandardParticiplesAndHouseForms() {
            Exercise worked = TestExercises.translateFree(List.of("Kam punue sot."), List.of());

            assertThat(typed(worked, "Kam punuar sot.").outcome()).isEqualTo(Outcome.CORRECT_STANDARD_FORM);
            assertThat(typed(HOUSE_WITHOUT_STANDARD_FORMS, "Shtëpia âsht e madhe.").hint())
                    .isEqualTo("Auf Gheg sagt man eher **shpija** statt **shtëpia**.");
        }

        @Test
        void standardFormsWithoutDiacriticsAreStillStandardForms() {
            assertThat(typed(TestExercises.typedGap(List.of("âsht"), List.of()), "eshte").outcome())
                    .isEqualTo(Outcome.CORRECT_STANDARD_FORM);
            assertThat(typed(HOUSE, "Shtepia eshte e madhe").outcome()).isEqualTo(Outcome.CORRECT_STANDARD_FORM);
            assertThat(typed(COFFEE, "Nje kafe, ju lutem").outcome()).isEqualTo(Outcome.CORRECT_STANDARD_FORM);
        }

        @Test
        void aListedStandardFormPointsToTheClosestSolution() {
            EvaluationResult result = typed(WHAT_ARE_YOU_DOING, "Çfarë bën?");

            assertThat(result.solution()).isEqualTo("Çka bân?");
            assertThat(result.hint()).isEqualTo("Auf Gheg sagt man eher **çka** statt **çfarë** und **bân** statt **bën**.");
        }

        @Test
        void aStandardWordNextToAWrongWordIsWrong() {
            Exercise mother = TestExercises.translateFree(List.of("Nâna âsht në shpi."), List.of());

            assertThat(typed(mother, "Nëna është në punë.").outcome()).isEqualTo(Outcome.WRONG);
        }

        @Test
        void blocklistExceptionsAreNoStandardForms() {
            Exercise hands = TestExercises.translateFree(List.of("duer"), List.of());

            assertThat(typed(hands, "duar").outcome()).isEqualTo(Outcome.WRONG);
        }
    }

    @Nested
    class Mistakes {

        @Test
        void errorHintSetsCategoryAndHintEvenWithinTheTypoTolerance() {
            // Two edits away from a 16-letter solution, but the hint knows that the article is missing.
            EvaluationResult result = typed(HOUSE, "Shpi âsht e madhe.");

            assertThat(result.outcome()).isEqualTo(Outcome.WRONG);
            assertThat(result.countsAsCorrect()).isFalse();
            assertThat(result.errorCategory()).isEqualTo(ErrorCategory.GRAMMAR_DEFINITE_ARTICLE);
            assertThat(result.hint()).isEqualTo("Das Haus = shpija (Artikel als Endung).");
            assertThat(result.rating()).isEqualTo(Rating.AGAIN);
            assertThat(result.solution()).isEqualTo("Shpija âsht e madhe.");
            assertThat(result.explanation()).isEqualTo(EXPLANATION);
        }

        @Test
        void errorHintsMatchCaseInsensitivelyOnTheNormalisedAnswer() {
            Exercise welcome = TestExercises.translateFree(List.of("Mirë se vjen!"), List.of(),
                    new ErrorHint("^SKA P[EË]RSE", ErrorCategory.VOCAB_CONFUSED, "„S'ka përse“ heisst „gern geschehen“."));

            EvaluationResult result = typed(welcome, "S'ka përse!");

            assertThat(result.errorCategory()).isEqualTo(ErrorCategory.VOCAB_CONFUSED);
            assertThat(result.hint()).startsWith("„S'ka përse“");
        }

        @Test
        void theFirstMatchingErrorHintWins() {
            Exercise exercise = TestExercises.translateFree(List.of("Nâna âsht në shpi."), List.of(),
                    new ErrorHint("^n[aâ]n[eë] ", ErrorCategory.GRAMMAR_DEFINITE_ARTICLE, "Artikel"),
                    new ErrorHint("shpi", ErrorCategory.VOCAB_UNKNOWN, "Wort"));

            assertThat(typed(exercise, "Nânë âsht në shpi.").errorCategory()).isEqualTo(ErrorCategory.GRAMMAR_DEFINITE_ARTICLE);
            assertThat(typed(exercise, "Nâna âsht në shpija.").errorCategory()).isEqualTo(ErrorCategory.VOCAB_UNKNOWN);
        }

        @Test
        void sameWordsInAnotherOrderAreAWordOrderError() {
            EvaluationResult result = typed(HOUSE_WITHOUT_STANDARD_FORMS, "Âsht shpija e madhe.");

            assertThat(result.outcome()).isEqualTo(Outcome.WRONG);
            assertThat(result.errorCategory()).isEqualTo(ErrorCategory.GRAMMAR_WORD_ORDER);
            assertThat(result.hint()).isEqualTo("Die Wörter stimmen, aber die Reihenfolge noch nicht.");
        }

        @Test
        void categoryFallsBackToTheGrammarSkillTag() {
            Exercise article = TestExercises.translateFreeTagged(List.of("Shpija âsht e madhe."), "vocab.home",
                    "grammar.definite_article.fem");
            Exercise infinitive = TestExercises.translateFreeTagged(List.of("Du me punue."), "grammar.verbs.infinitive_me");
            Exercise present = TestExercises.translateFreeTagged(List.of("Unë punoj."), "grammar.verbs.present");
            Exercise perfect = TestExercises.translateFreeTagged(List.of("Kam punue."), "grammar.verbs.perfect");
            Exercise accusative = TestExercises.translateFreeTagged(List.of("Natën e mirë!"), "grammar.case.accusative");

            assertThat(typed(article, "Kafja âsht e nxehtë.").errorCategory()).isEqualTo(ErrorCategory.GRAMMAR_DEFINITE_ARTICLE);
            assertThat(typed(infinitive, "Du punoj.").errorCategory()).isEqualTo(ErrorCategory.GRAMMAR_INFINITIVE);
            assertThat(typed(present, "Ti punon.").errorCategory()).isEqualTo(ErrorCategory.GRAMMAR_VERB_CONJUGATION);
            assertThat(typed(perfect, "Punoj.").errorCategory()).isEqualTo(ErrorCategory.GRAMMAR_VERB_TENSE);
            assertThat(typed(accusative, "Nata.").errorCategory()).isEqualTo(ErrorCategory.GRAMMAR_CASE);
        }

        @Test
        void unknownWordIsTheDefaultForTypedAnswers() {
            EvaluationResult result = typed(HOUSE_WITHOUT_STANDARD_FORMS, "Kafja âsht e nxehtë.");

            assertThat(result.errorCategory()).isEqualTo(ErrorCategory.VOCAB_UNKNOWN);
            assertThat(result.hint()).isNull();
        }

        @Test
        void anEmptyAnswerIsWrong() {
            assertThat(typed(HOUSE, "  ?! ").outcome()).isEqualTo(Outcome.WRONG);
        }

        @Test
        void theClosestSolutionIsShownForAWrongAnswer() {
            assertThat(typed(COFFEE, "Ju lutem, nji caj.").solution()).isEqualTo("Ju lutem, nji kafe.");
        }
    }

    @Nested
    class Typos {

        private final Exercise thanks = TestExercises.translateFree(List.of("Faleminderit shumë!"), List.of());

        @Test
        void oneEditOnSixLettersIsAlmostCorrect() {
            EvaluationResult result = typed(HOUSE, "Shpija âsht e mahde.");

            assertThat(result.outcome()).isEqualTo(Outcome.ALMOST_CORRECT);
            assertThat(result.errorCategory()).isEqualTo(ErrorCategory.SPELLING_OTHER);
            assertThat(result.rating()).isEqualTo(Rating.HARD);
            assertThat(result.hint()).isEqualTo("Achte auf die Schreibweise: **madhe**");
        }

        @Test
        void shortAnswersHaveNoTypoTolerance() {
            Exercise iAm = TestExercises.translateFree(List.of("jam"), List.of());
            Exercise house = TestExercises.translateFree(List.of("shpija"), List.of());

            assertThat(typed(iAm, "jem").outcome()).isEqualTo(Outcome.WRONG);
            assertThat(typed(house, "shpja").outcome()).isEqualTo(Outcome.ALMOST_CORRECT);
            assertThat(typed(house, "shpi").outcome()).isEqualTo(Outcome.WRONG);
        }

        @Test
        void sixteenLettersAllowTwoEdits() {
            assertThat(typed(thanks, "Faleminderti shme").outcome()).isEqualTo(Outcome.ALMOST_CORRECT);
            assertThat(typed(thanks, "Falmeinderti shme").outcome()).isEqualTo(Outcome.WRONG);
        }

        @Test
        void aMissingDiacriticCostsNothingInTheTypoDistance() {
            assertThat(typed(thanks, "Faleminderti shume").errorCategory()).isEqualTo(ErrorCategory.SPELLING_OTHER);
            assertThat(typed(thanks, "Faleminderit shume").errorCategory()).isEqualTo(ErrorCategory.SPELLING_DIACRITICS);
        }

        @Test
        void anAddedOrWrongDiacriticCostsAnEdit() {
            Exercise goodDay = TestExercises.translateFree(List.of("Mirëdita!"), List.of());

            assertThat(typed(goodDay, "Mirêdita").errorCategory()).isEqualTo(ErrorCategory.SPELLING_OTHER);
            assertThat(typed(goodDay, "Mîrêdita").outcome()).isEqualTo(Outcome.WRONG);
        }

        @Test
        void aMissingSpaceIsATypo() {
            Exercise yesThanks = TestExercises.translateFree(List.of("Po, faleminderit."), List.of());

            assertThat(typed(yesThanks, "Pofaleminderit").errorCategory()).isEqualTo(ErrorCategory.SPELLING_OTHER);
        }
    }

    @Nested
    class Tiles {

        @Test
        void wordChipsAreJoinedToASentence() {
            Exercise greeting = TestExercises.wordBank(List.of("Mirëdita! Si je?"), List.of("Mirëdita", "Si", "je", "jeni", "jam"),
                    new ErrorHint("(^|\\s)si jeni$", ErrorCategory.GRAMMAR_VERB_CONJUGATION, "Du-Form: „Si je?“"));

            assertThat(tokens(greeting, "Mirëdita", "Si", "je").outcome()).isEqualTo(Outcome.CORRECT);
            assertThat(tokens(greeting, "Mirëdita", "Si", "jeni").errorCategory()).isEqualTo(ErrorCategory.GRAMMAR_VERB_CONJUGATION);
        }

        @Test
        void wordOrderAcceptsEveryListedOrdering() {
            Exercise fine = TestExercises.wordOrder(List.of("Mirë", "jam", "faleminderit"),
                    List.of("Mirë jam, faleminderit.", "Jam mirë, faleminderit."));

            assertThat(tokens(fine, "Jam", "mirë", "faleminderit").outcome()).isEqualTo(Outcome.CORRECT);
            assertThat(tokens(fine, "faleminderit", "jam", "Mirë").errorCategory()).isEqualTo(ErrorCategory.GRAMMAR_WORD_ORDER);
        }

        @Test
        void aDistractorIsWrongEvenIfItLooksLikeATypo() {
            Exercise sister = TestExercises.germanTranslation(List.of("Das ist meine Schwester."),
                    List.of("Das", "ist", "meine", "Schwester", "mein", "Bruder"));

            EvaluationResult result = tokens(sister, "Das", "ist", "mein", "Schwester");

            assertThat(result.outcome()).isEqualTo(Outcome.WRONG);
            assertThat(result.errorCategory()).isEqualTo(ErrorCategory.VOCAB_UNKNOWN);
            assertThat(result.solution()).isEqualTo("Das ist meine Schwester.");
        }

        @Test
        void tilesHaveNoDiacriticToleranceAndNoStandardForms() {
            Exercise house = TestExercises.wordOrder(List.of("Shpija", "âsht", "e", "madhe"), List.of("Shpija âsht e madhe."));

            assertThat(tokens(house, "Shpija", "asht", "e", "madhe").outcome()).isEqualTo(Outcome.WRONG);
            assertThat(tokens(house, "Shpija", "është", "e", "madhe").outcome()).isEqualTo(Outcome.WRONG);
        }

        @Test
        void theSameTilesInAnotherOrderAreAWordOrderErrorShowingThatOrdering() {
            Exercise fine = TestExercises.wordOrder(List.of("Mirë", "jam", "faleminderit"),
                    List.of("Mirë jam, faleminderit.", "Jam mirë, faleminderit."));

            EvaluationResult result = tokens(fine, "faleminderit", "mirë", "jam");

            assertThat(result.outcome()).isEqualTo(Outcome.WRONG);
            assertThat(result.errorCategory()).isEqualTo(ErrorCategory.GRAMMAR_WORD_ORDER);
            assertThat(result.hint()).isEqualTo("Die Wörter stimmen, aber die Reihenfolge noch nicht.");
            assertThat(result.solution()).isEqualTo("Mirë jam, faleminderit.");
        }

        @Test
        void aReorderingIsAWordOrderErrorBeforeAnyErrorHint() {
            Exercise fine = TestExercises.wordOrder(List.of("Mirë", "jam"), List.of("Mirë jam."),
                    new ErrorHint("^jam ", ErrorCategory.GRAMMAR_VERB_CONJUGATION, "Hinweis"));

            assertThat(tokens(fine, "jam", "Mirë").errorCategory()).isEqualTo(ErrorCategory.GRAMMAR_WORD_ORDER);
        }

        @Test
        void germanAnswersAreCheckedWithoutGhegRules() {
            Exercise greeting = TestExercises.germanTranslation(List.of("Guten Tag, wie geht es dir?"),
                    List.of("Guten", "Tag", "wie", "geht", "es", "dir", "Ihnen", "Abend"),
                    new ErrorHint("ihnen", ErrorCategory.GRAMMAR_VERB_CONJUGATION, "Du-Form"));

            assertThat(tokens(greeting, "guten", "Tag", "wie", "geht", "es", "dir").outcome()).isEqualTo(Outcome.CORRECT);
            assertThat(tokens(greeting, "Guten", "Tag", "wie", "geht", "es", "Ihnen").errorCategory())
                    .isEqualTo(ErrorCategory.GRAMMAR_VERB_CONJUGATION);
        }
    }

    @Nested
    class Choices {

        private final Exercise greeting = TestExercises.multipleChoice(List.of("mirëdita", "mirupafshim", "faleminderit", "po"),
                "mirëdita", List.of("vocab.greetings"),
                new ErrorHint("^mirupafshim$", ErrorCategory.VOCAB_CONFUSED, "„Mirupafshim“ heisst „auf Wiedersehen“."));

        @Test
        void thePickedSolutionIsCorrect() {
            EvaluationResult result = chosen(greeting, "mirëdita");

            assertThat(result.outcome()).isEqualTo(Outcome.CORRECT);
            assertThat(result.solution()).isEqualTo("mirëdita");
            assertThat(chosen(greeting, "Mirëdita").outcome()).isEqualTo(Outcome.CORRECT);
        }

        @Test
        void aWrongPickUsesTheErrorHint() {
            EvaluationResult result = chosen(greeting, "mirupafshim");

            assertThat(result.outcome()).isEqualTo(Outcome.WRONG);
            assertThat(result.errorCategory()).isEqualTo(ErrorCategory.VOCAB_CONFUSED);
            assertThat(result.hint()).isEqualTo("„Mirupafshim“ heisst „auf Wiedersehen“.");
            assertThat(result.solution()).isEqualTo("mirëdita");
        }

        @Test
        void aWrongPickIsAConfusionUnlessAGrammarTagSaysOtherwise() {
            Exercise article = TestExercises.multipleChoice(List.of("shpija", "shpi", "shpinë", "shpisë"), "shpija",
                    List.of("vocab.home", "grammar.definite_article.fem"));

            assertThat(chosen(greeting, "po").errorCategory()).isEqualTo(ErrorCategory.VOCAB_CONFUSED);
            assertThat(chosen(article, "shpi").errorCategory()).isEqualTo(ErrorCategory.GRAMMAR_DEFINITE_ARTICLE);
        }

        @Test
        void aPickedOptionHasNoSpellingTolerance() {
            Exercise gap = TestExercises.choiceGap(List.of("âsht"), List.of("âsht", "jam", "je"));

            assertThat(chosen(gap, "âsht").outcome()).isEqualTo(Outcome.CORRECT);
            assertThat(chosen(gap, "asht").outcome()).isEqualTo(Outcome.WRONG);
            assertThat(chosen(gap, "je").errorCategory()).isEqualTo(ErrorCategory.VOCAB_CONFUSED);
        }
    }

    @Nested
    class MatchedPairs {

        @Test
        void noWrongMatchIsCorrect() {
            EvaluationResult result = wrongMatches();

            assertThat(result.outcome()).isEqualTo(Outcome.CORRECT);
            assertThat(result.solution()).isNull();
            assertThat(result.hint()).isNull();
        }

        @Test
        void aWrongMatchIsAConfusionThatNamesBothConfusedPairs() {
            EvaluationResult result = wrongMatches(new MatchPair("po", "nein"));

            assertThat(result.outcome()).isEqualTo(Outcome.WRONG);
            assertThat(result.errorCategory()).isEqualTo(ErrorCategory.VOCAB_CONFUSED);
            assertThat(result.rating()).isEqualTo(Rating.AGAIN);
            assertThat(result.hint()).isEqualTo("Richtig ist: **po** = ja und **jo** = nein.");
            assertThat(result.solution()).isNull();
        }

        @Test
        void everyConfusedPairIsNamedOnceInTheOrderOfTheExercise() {
            EvaluationResult result = wrongMatches(new MatchPair("faleminderit", "guten Tag"),
                    new MatchPair("mirëdita", "danke"), new MatchPair("faleminderit", "guten Tag"));

            assertThat(result.outcome()).isEqualTo(Outcome.WRONG);
            assertThat(result.hint()).isEqualTo("Richtig ist: **mirëdita** = guten Tag und **faleminderit** = danke.");
        }

        @Test
        void comparesTheReportedSidesNormalised() {
            assertThat(wrongMatches(new MatchPair("Mirëdita", "Danke")).outcome()).isEqualTo(Outcome.WRONG);
        }

        @Test
        void rejectsAWrongMatchThatTheExerciseCannotShow() {
            assertThatThrownBy(() -> wrongMatches(new MatchPair("ujë", "ja")))
                    .isInstanceOf(InvalidAnswerException.class)
                    .hasMessage("match_pairs ex_test_unit_001: the wrong match ujë → ja is not made of its pairs");
            assertThatThrownBy(() -> wrongMatches(new MatchPair("po", "Wasser"))).isInstanceOf(InvalidAnswerException.class);
            assertThatThrownBy(() -> wrongMatches(new MatchPair("po", "ja")))
                    .isInstanceOf(InvalidAnswerException.class)
                    .hasMessage("match_pairs ex_test_unit_001: po → ja is a correct pair, not a wrong match");
        }

        @Test
        void theDeprecatedMistakeCountIsJudgedTheSameWay() {
            assertThat(mistakes(0).outcome()).isEqualTo(Outcome.CORRECT);
            assertThat(mistakes(1).outcome()).isEqualTo(Outcome.WRONG);
            assertThat(mistakes(1).hint()).isEqualTo("Ein Paar hast du zuerst falsch zugeordnet.");
            assertThat(mistakes(3).errorCategory()).isEqualTo(ErrorCategory.VOCAB_CONFUSED);
            assertThat(mistakes(3).hint()).isEqualTo("Du hast 3 Paare zuerst falsch zugeordnet.");
        }

        private EvaluationResult wrongMatches(MatchPair... matches) {
            return evaluator.evaluate(TestExercises.matchPairs(), new Answer.WrongMatches(List.of(matches), TIME));
        }

        private EvaluationResult mistakes(int mistakes) {
            return evaluator.evaluate(TestExercises.matchPairs(), new Answer.PairMistakes(mistakes, TIME));
        }
    }

    @Nested
    class UnsupportedAnswers {

        @Test
        void rejectsAnAnswerKindThatDoesNotFitTheExercise() {
            Exercise choice = TestExercises.multipleChoice(List.of("a", "b", "c", "d"), "a", List.of("vocab.greetings"));

            assertThatThrownBy(() -> typed(choice, "a"))
                    .isInstanceOf(UnsupportedAnswerException.class)
                    .hasMessage("multiple_choice ex_test_unit_001 expects a choice answer, not text");
            assertThatThrownBy(() -> chosen(HOUSE, "Shpija âsht e madhe.")).isInstanceOf(UnsupportedAnswerException.class);
            assertThatThrownBy(() -> typed(TestExercises.wordOrder(List.of("Mirë", "jam"), List.of("Mirë jam.")), "Mirë jam"))
                    .isInstanceOf(UnsupportedAnswerException.class);
            assertThatThrownBy(() -> tokens(TestExercises.matchPairs(), "po")).isInstanceOf(UnsupportedAnswerException.class);
            assertThatThrownBy(() -> typed(TestExercises.choiceGap(List.of("âsht"), List.of("âsht", "je")), "âsht"))
                    .isInstanceOf(UnsupportedAnswerException.class);
        }
    }

    private EvaluationResult typed(Exercise exercise, String text) {
        return evaluator.evaluate(exercise, new Answer.Text(text, TIME));
    }

    private EvaluationResult chosen(Exercise exercise, String choice) {
        return evaluator.evaluate(exercise, new Answer.Choice(choice, TIME));
    }

    private EvaluationResult tokens(Exercise exercise, String... tokens) {
        return evaluator.evaluate(exercise, new Answer.Tokens(List.of(tokens), TIME));
    }
}
