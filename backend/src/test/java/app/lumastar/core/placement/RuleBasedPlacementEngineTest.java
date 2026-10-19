package app.lumastar.core.placement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalStateException;
import static org.assertj.core.api.Assertions.within;

import app.lumastar.domain.Competence;
import app.lumastar.domain.Exercise;
import app.lumastar.domain.Level;
import app.lumastar.domain.Outcome;
import app.lumastar.domain.PlacementResult;
import app.lumastar.domain.PlacementResult.CompetenceScore;
import app.lumastar.domain.PlacementState;
import app.lumastar.domain.PlacementState.Step;
import app.lumastar.domain.SelfAssessment;
import app.lumastar.domain.SkillTag;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.function.Function;
import java.util.function.Predicate;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

class RuleBasedPlacementEngineTest {

    private final RuleBasedPlacementEngine engine = new RuleBasedPlacementEngine(PlacementBank.full(), new Random(7));

    /** A learner who answers every item at or below {@code level} correctly and every harder one wrong. */
    private static Predicate<Exercise> knowsUpTo(Level level) {
        return item -> !item.level().isAbove(level);
    }

    private record Run(PlacementState state, List<Exercise> items) {

        List<Level> askedStages() {
            return items.stream().map(Exercise::level).toList();
        }
    }

    private Run run(Level start, Predicate<Exercise> answersCorrectly) {
        return run(engine, start, item -> answersCorrectly.test(item) ? Outcome.CORRECT : Outcome.WRONG);
    }

    private static Run run(PlacementEngine engine, Level start, Function<Exercise, Outcome> learner) {
        PlacementState state = new PlacementState(start, start, List.of());
        List<Exercise> items = new ArrayList<>();
        while (!engine.isFinished(state)) {
            Exercise item = engine.nextItem(state);
            items.add(item);
            state = engine.record(state, step(item, learner.apply(item)));
        }
        return new Run(state, items);
    }

    /** Answers the items in the given order of outcomes and stops early when the test ends. */
    private Run answer(Level start, Outcome... outcomes) {
        List<Outcome> remaining = new ArrayList<>(Arrays.asList(outcomes));
        PlacementState state = new PlacementState(start, start, List.of());
        List<Exercise> items = new ArrayList<>();
        while (!remaining.isEmpty() && !engine.isFinished(state)) {
            Exercise item = engine.nextItem(state);
            items.add(item);
            state = engine.record(state, step(item, remaining.removeFirst()));
        }
        return new Run(state, items);
    }

    private static Step step(Exercise item, Outcome outcome) {
        return new Step(item.id(), item.level(), item.competence(), item.skillTags(), outcome);
    }

    private static Outcome[] repeat(Outcome outcome, int times) {
        Outcome[] outcomes = new Outcome[times];
        Arrays.fill(outcomes, outcome);
        return outcomes;
    }

    private static final Outcome C = Outcome.CORRECT;
    private static final Outcome W = Outcome.WRONG;

    @Nested
    class Staircase {

        @Test
        void twoCorrectAnswersInARowMoveOneStageUpAndOneWrongAnswerOneStageDown() {
            Run run = answer(Level.A1_2, C, C, W, W);

            assertThat(run.askedStages()).containsExactly(Level.A1_2, Level.A1_2, Level.A1_3, Level.A1_2);
            assertThat(run.state().currentLevel()).isEqualTo(Level.A1_1);
        }

        @Test
        void aWrongAnswerBreaksTheCorrectStreak() {
            Run run = answer(Level.A1_2, C, W, C, C);

            assertThat(run.askedStages()).containsExactly(Level.A1_2, Level.A1_2, Level.A1_1, Level.A1_1);
            assertThat(run.state().currentLevel()).isEqualTo(Level.A1_2);
        }

        @Test
        void neverGoesBelowA0() {
            Run run = answer(Level.A0, W);

            assertThat(run.state().currentLevel()).isEqualTo(Level.A0);
            assertThat(engine.isFinished(run.state())).isFalse();
        }
    }

    @Nested
    class Beginner {

        @Test
        void allWrongFromA0EndsAtTheFloorAfterTwoItems() {
            Run run = run(Level.A0, item -> false);

            assertThat(run.items()).hasSize(2);
            assertThat(engine.evaluate(run.state()).level()).isEqualTo(Level.A0);
        }

        @Test
        void allWrongFromA1_1IsPlacedOnA0WithinSixItems() {
            Run run = run(Level.A1_1, item -> false);

            assertThat(run.items()).hasSizeLessThanOrEqualTo(6);
            assertThat(engine.evaluate(run.state()).level()).isEqualTo(Level.A0);
        }

        @ParameterizedTest
        @EnumSource(value = SelfAssessment.class, names = {"NOTHING", "FEW_WORDS"})
        void aBeginnerReachesA0OrA1_1WithinSixItems(SelfAssessment selfAssessment) {
            Run run = run(selfAssessment.startLevel(), item -> false);

            assertThat(run.items()).hasSizeLessThanOrEqualTo(6);
            assertThat(engine.evaluate(run.state()).level()).isIn(Level.A0, Level.A1_1);
        }

        @Test
        void aBeginnerWhoKnowsTheFirstWordsIsPlacedOnA0WithinSixItems() {
            Run run = run(Level.A1_1, knowsUpTo(Level.A0));

            assertThat(run.items()).hasSizeLessThanOrEqualTo(6);
            assertThat(engine.evaluate(run.state()).level()).isIn(Level.A0, Level.A1_1);
        }

        @ParameterizedTest
        @EnumSource(SelfAssessment.class)
        void allWrongEndsAtA0FromEveryStartLevel(SelfAssessment selfAssessment) {
            Run run = run(selfAssessment.startLevel(), item -> false);

            assertThat(engine.evaluate(run.state()).level()).isEqualTo(Level.A0);
            assertThat(run.items()).hasSize(selfAssessment.startLevel().ordinal() + 2);
        }
    }

    @Nested
    class StrongLearner {

        @Test
        void climbsTwoItemsPerStage() {
            Run run = run(Level.B1_2, item -> true);

            assertThat(run.askedStages()).startsWith(Level.B1_2, Level.B1_2, Level.B1_3, Level.B1_3, Level.B2_1);
            assertThat(run.askedStages()).isSorted();
        }

        @Test
        void endsAtTheCeilingWithTwoCorrectAnswersAtC2_3() {
            Run run = run(Level.C1_3, item -> true);

            assertThat(run.items()).hasSize(8);
            assertThat(engine.evaluate(run.state()).level()).isEqualTo(Level.C2_3);
        }

        @Test
        void isCappedAtTwentyItemsAndPlacedOnTheLastConfirmedStage() {
            Run run = run(Level.A0, item -> true);

            assertThat(run.items()).hasSize(RuleBasedPlacementEngine.MAX_ITEMS);
            assertThat(run.state().currentLevel()).isEqualTo(Level.B2_1);
            assertThat(engine.evaluate(run.state()).level()).isEqualTo(Level.B1_3);
        }
    }

    @Nested
    class Stability {

        @Test
        void threeDirectionChangesAtTheSameBoundaryEndTheTestOnTheLowerStage() {
            Run run = answer(Level.A1_1, C, C, W, C, C, W, C, C);

            assertThat(run.items()).hasSize(6);
            assertThat(engine.isFinished(run.state())).isTrue();
            assertThat(engine.evaluate(run.state()).level()).isEqualTo(Level.A1_1);
        }

        @Test
        void aLearnerOscillatingAroundTheirLevelIsPlacedOnIt() {
            Run run = run(Level.A0, knowsUpTo(Level.A2_1));

            assertThat(run.items()).hasSize(14);
            assertThat(engine.evaluate(run.state()).level()).isEqualTo(Level.A2_1);
        }

        @Test
        void directionChangesAtDifferentBoundariesDoNotCountTogether() {
            // up A1.2→A1.3, down to A1.2 (1st change at A1.2/A1.3), down to A1.1, up to A1.2 (1st change at A1.1/A1.2)
            Run run = answer(Level.A1_2, C, C, W, W, C, C);

            assertThat(engine.isFinished(run.state())).isFalse();
            assertThat(run.state().currentLevel()).isEqualTo(Level.A1_2);
        }

        @Test
        void theResultIsNeverAboveTheCurrentStage() {
            // confirms A1.1, then falls to A0 and keeps alternating there until the item limit
            Outcome[] outcomes = new Outcome[20];
            outcomes[0] = C;
            outcomes[1] = C;
            outcomes[2] = W;
            outcomes[3] = W;
            for (int i = 4; i < outcomes.length; i++) {
                outcomes[i] = i % 2 == 0 ? C : W;
            }

            Run run = answer(Level.A1_1, outcomes);

            assertThat(run.items()).hasSize(20);
            assertThat(run.state().currentLevel()).isEqualTo(Level.A0);
            assertThat(engine.evaluate(run.state()).level()).isEqualTo(Level.A0);
        }

        @Test
        void withoutAnyConfirmationTheLearnerIsPlacedOnTheCurrentStage() {
            Run run = answer(Level.A2_2, C, W, C, W);

            assertThat(engine.evaluate(run.state()).level()).isEqualTo(Level.A1_3);
        }
    }

    @Nested
    class ItemSelection {

        @Test
        void startsWithVocabularyAndRotatesThroughTheCompetences() {
            Run run = answer(Level.B1_2, W, C, W, C, W);

            assertThat(run.items()).extracting(Exercise::competence).containsExactly(Competence.VOCABULARY,
                    Competence.GRAMMAR, Competence.TRANSLATION, Competence.READING, Competence.VOCABULARY);
        }

        @Test
        void skipsReadingBelowA2_1WhereTheBankHasNone() {
            Run run = answer(Level.A1_2, W, C, W, C);

            assertThat(run.items()).extracting(Exercise::competence).containsExactly(Competence.VOCABULARY,
                    Competence.GRAMMAR, Competence.TRANSLATION, Competence.VOCABULARY);
        }

        @Test
        void aNormalRunCoversAllFourCompetences() {
            Run run = run(Level.A2_2, knowsUpTo(Level.B1_1));

            assertThat(run.items()).extracting(Exercise::competence).contains(Competence.values());
            assertThat(engine.evaluate(run.state()).level()).isEqualTo(Level.B1_1);
        }

        @Test
        void neverShowsAnItemTwice() {
            Run run = run(Level.A1_1, item -> item.id().hashCode() % 3 != 0);

            assertThat(run.items()).doesNotHaveDuplicates();
        }

        @Test
        void fallsBackToTheNearestStageWithUnusedItemsPreferringTheLowerOne() {
            RuleBasedPlacementEngine small = new RuleBasedPlacementEngine(List.of(
                    PlacementBank.item(Level.A1_1, Competence.VOCABULARY, 1),
                    PlacementBank.item(Level.A1_3, Competence.VOCABULARY, 1),
                    PlacementBank.item(Level.B1_1, Competence.VOCABULARY, 1)), new Random(1));
            PlacementState state = new PlacementState(Level.A1_2, Level.A1_2, List.of());

            List<Level> asked = new ArrayList<>();
            while (!small.isFinished(state)) {
                Exercise item = small.nextItem(state);
                asked.add(item.level());
                state = small.record(state, step(item, Outcome.WRONG));
            }

            assertThat(asked).containsExactly(Level.A1_1, Level.A1_3, Level.B1_1);
        }

        @Test
        void theSameSeedPicksTheSameItems() {
            Function<Exercise, Outcome> learner = item -> item.level().isAbove(Level.A2_2) ? Outcome.WRONG : Outcome.CORRECT;

            Run first = run(new RuleBasedPlacementEngine(PlacementBank.full(), new Random(42)), Level.A1_3, learner);
            Run second = run(new RuleBasedPlacementEngine(PlacementBank.full(), new Random(42)), Level.A1_3, learner);

            assertThat(first.items()).isEqualTo(second.items());
        }

        @Test
        void endsWhenTheBankIsUsedUp() {
            RuleBasedPlacementEngine tiny = new RuleBasedPlacementEngine(
                    List.of(PlacementBank.item(Level.A1_1, Competence.VOCABULARY, 1)), new Random(1));
            PlacementState start = new PlacementState(Level.A1_1, Level.A1_1, List.of());

            PlacementState answered = tiny.record(start, step(tiny.nextItem(start), Outcome.CORRECT));

            assertThat(tiny.isFinished(answered)).isTrue();
            assertThat(tiny.isFinished(new PlacementState(Level.A0, Level.A0, List.of()))).isFalse();
            assertThat(new RuleBasedPlacementEngine(List.of(), new Random(1)).isFinished(start)).isTrue();
        }

        @Test
        void refusesToGoOnAfterTheEnd() {
            Run run = run(Level.A0, item -> false);
            Exercise another = PlacementBank.item(Level.A1_1, Competence.GRAMMAR, 3);

            assertThatIllegalStateException().isThrownBy(() -> engine.nextItem(run.state()));
            assertThatIllegalStateException().isThrownBy(() -> engine.record(run.state(), step(another, Outcome.CORRECT)));
        }
    }

    @Nested
    class Result {

        private final SkillTag vocab = SkillTag.of("vocab.basics");
        private final SkillTag verbs = SkillTag.of("grammar.verbs.jam");
        private final SkillTag article = SkillTag.of("grammar.definite_article.fem");
        private final SkillTag numbers = SkillTag.of("vocab.numbers");

        private PlacementResult evaluate(Level start, Step... steps) {
            return engine.evaluate(new PlacementState(start, start, List.of(steps)));
        }

        private Step answered(Level level, Competence competence, Outcome outcome, SkillTag... tags) {
            return new Step("pl_" + level.ordinal() + "_" + tags[0].id().hashCode(), level, competence, List.of(tags), outcome);
        }

        @Test
        void estimatesTheMasteryOfEveryTagFromItsAnswers() {
            // A1.1: two correct (→ A1.2), one wrong (→ A1.1), A1.1 is the last confirmed stage
            PlacementResult result = evaluate(Level.A1_1,
                    answered(Level.A0, Competence.VOCABULARY, Outcome.CORRECT, vocab),
                    answered(Level.A1_1, Competence.GRAMMAR, Outcome.ALMOST_CORRECT, verbs, vocab),
                    answered(Level.A1_2, Competence.GRAMMAR, Outcome.WRONG, article));

            assertThat(result.level()).isEqualTo(Level.A1_1);
            assertThat(result.initialMastery()).containsOnlyKeys(vocab, verbs, article);
            assertThat(result.initialMastery().get(vocab)).isCloseTo((0.8 + 0.8) / 2, within(1e-9));
            assertThat(result.initialMastery().get(verbs)).isCloseTo(0.8, within(1e-9));
            assertThat(result.initialMastery().get(article)).isCloseTo(0.3, within(1e-9));
        }

        @Test
        void aStandardFormCountsLikeACorrectAnswer() {
            PlacementResult result = evaluate(Level.A1_1,
                    answered(Level.A1_1, Competence.TRANSLATION, Outcome.CORRECT_STANDARD_FORM, verbs));

            assertThat(result.initialMastery().get(verbs)).isCloseTo(0.9, within(1e-9));
        }

        @Test
        void listsTheTopThreeStrengthsAndWeaknesses() {
            SkillTag greetings = SkillTag.of("vocab.greetings");
            SkillTag family = SkillTag.of("vocab.family");
            SkillTag home = SkillTag.of("vocab.home");
            SkillTag food = SkillTag.of("vocab.food");
            PlacementResult result = evaluate(Level.A1_2,
                    answered(Level.A1_2, Competence.VOCABULARY, Outcome.CORRECT, greetings),
                    answered(Level.A1_2, Competence.VOCABULARY, Outcome.CORRECT, family),
                    answered(Level.A1_1, Competence.VOCABULARY, Outcome.CORRECT, home),
                    answered(Level.A1_3, Competence.VOCABULARY, Outcome.CORRECT, food),
                    answered(Level.A1_2, Competence.GRAMMAR, Outcome.WRONG, article),
                    answered(Level.A1_1, Competence.GRAMMAR, Outcome.WRONG, verbs),
                    answered(Level.A1_3, Competence.GRAMMAR, Outcome.WRONG, numbers),
                    answered(Level.A0, Competence.GRAMMAR, Outcome.WRONG, vocab));

            assertThat(result.strengths()).containsExactly(food, family, greetings);
            assertThat(result.weaknesses()).containsExactly(vocab, verbs, article);
        }

        @Test
        void aTagWithMixedAnswersIsNeitherStrengthNorWeakness() {
            PlacementResult result = evaluate(Level.A1_1,
                    answered(Level.A1_1, Competence.GRAMMAR, Outcome.CORRECT, verbs),
                    answered(Level.A1_2, Competence.GRAMMAR, Outcome.WRONG, verbs));

            assertThat(result.initialMastery().get(verbs)).isCloseTo(0.6, within(1e-9));
            assertThat(result.strengths()).isEmpty();
            assertThat(result.weaknesses()).isEmpty();
        }

        @Test
        void scoresEveryTestedCompetence() {
            PlacementResult result = evaluate(Level.A1_1,
                    answered(Level.A1_1, Competence.VOCABULARY, Outcome.CORRECT, vocab),
                    answered(Level.A1_1, Competence.GRAMMAR, Outcome.ALMOST_CORRECT, verbs),
                    answered(Level.A1_2, Competence.GRAMMAR, Outcome.WRONG, article));

            assertThat(result.competenceScores()).isEqualTo(Map.of(
                    Competence.VOCABULARY, new CompetenceScore(1, 1),
                    Competence.GRAMMAR, new CompetenceScore(2, 1)));
        }

        @Test
        void aFullRunEstimatesEveryAnsweredTag() {
            Run run = run(Level.A1_1, knowsUpTo(Level.A1_3));

            PlacementResult result = engine.evaluate(run.state());

            assertThat(result.level()).isEqualTo(Level.A1_3);
            assertThat(result.initialMastery()).containsOnlyKeys(
                    run.items().stream().flatMap(item -> item.skillTags().stream()).distinct().toList());
            assertThat(result.strengths()).isNotEmpty();
            assertThat(result.weaknesses()).isNotEmpty();
        }
    }
}
