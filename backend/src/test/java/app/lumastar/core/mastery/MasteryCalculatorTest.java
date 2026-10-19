package app.lumastar.core.mastery;

import static app.lumastar.core.mastery.MasteryCalculator.UNPRACTISED;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

import app.lumastar.domain.Outcome;
import app.lumastar.domain.SkillMastery;
import app.lumastar.domain.SkillMastery.Entry;
import app.lumastar.domain.SkillTag;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import org.assertj.core.data.Offset;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

class MasteryCalculatorTest {

    private static final Instant NOW = Instant.parse("2026-09-25T10:00:00Z");
    private static final Offset<Double> PRECISION = within(1e-9);

    private final MasteryCalculator calculator = new MasteryCalculator(MasteryRules.DEFAULT);

    @Nested
    class Update {

        @Test
        void aFirstCorrectAnswerMovesAnUnpractisedTagHalfway() {
            Entry entry = calculator.update(UNPRACTISED, Outcome.CORRECT, false, NOW);

            assertThat(entry.mastery()).isCloseTo(0.5, PRECISION);
            assertThat(entry.attempts()).isEqualTo(1);
            assertThat(entry.correct()).isEqualTo(1);
            assertThat(entry.lastPracticed()).isEqualTo(NOW);
        }

        @Test
        void earlyAnswersMoveTheValueByOneOverAttemptsPlusTwo() {
            Entry entry = answer(UNPRACTISED, Outcome.CORRECT, 3);

            // 0 → 1/2 → 2/3 → 3/4: the mean of the scores with one virtual wrong answer
            assertThat(entry.mastery()).isCloseTo(0.75, PRECISION);
            assertThat(entry.attempts()).isEqualTo(3);
        }

        @Test
        void laterAnswersStillMoveTheValueByAtLeastFifteenPercent() {
            Entry experienced = new Entry(0.5, 40, 20, NOW);

            Entry entry = calculator.update(experienced, Outcome.CORRECT, false, NOW);

            assertThat(entry.mastery()).isCloseTo(0.5 + 0.15 * 0.5, PRECISION);
        }

        @Test
        void usesTheFloorOnceOneOverAttemptsPlusTwoFallsBelowIt() {
            Entry fiveAttempts = new Entry(0.2, 5, 1, NOW);
            Entry fourAttempts = new Entry(0.2, 4, 1, NOW);

            assertThat(calculator.update(fiveAttempts, Outcome.CORRECT, false, NOW).mastery())
                    .isCloseTo(0.2 + 0.15 * 0.8, PRECISION);
            assertThat(calculator.update(fourAttempts, Outcome.CORRECT, false, NOW).mastery())
                    .isCloseTo(0.2 + (1.0 / 6) * 0.8, PRECISION);
        }

        @Test
        void convergesToOneWithCorrectAnswers() {
            assertThat(answer(UNPRACTISED, Outcome.CORRECT, 30).mastery()).isGreaterThan(0.99);
        }

        @Test
        void convergesToZeroWithWrongAnswers() {
            Entry mastered = new Entry(0.95, 50, 48, NOW);

            assertThat(answer(mastered, Outcome.WRONG, 30).mastery()).isLessThan(0.01);
        }

        @Test
        void convergesToTheAlmostCorrectScoreWithTypos() {
            assertThat(answer(new Entry(1.0, 10, 10, NOW), Outcome.ALMOST_CORRECT, 60).mastery()).isCloseTo(0.6, within(0.001));
            assertThat(answer(UNPRACTISED, Outcome.ALMOST_CORRECT, 60).mastery()).isCloseTo(0.6, within(0.001));
        }

        @Test
        void scoresAStandardFormLikeACorrectAnswer() {
            Entry standard = calculator.update(UNPRACTISED, Outcome.CORRECT_STANDARD_FORM, false, NOW);

            assertThat(standard).isEqualTo(calculator.update(UNPRACTISED, Outcome.CORRECT, false, NOW));
        }

        @Test
        void countsAcceptedAnswersAsCorrect() {
            Entry entry = UNPRACTISED;
            for (Outcome outcome : Outcome.values()) {
                entry = calculator.update(entry, outcome, false, NOW);
            }

            assertThat(entry.attempts()).isEqualTo(4);
            assertThat(entry.correct()).isEqualTo(3);
        }

        @Test
        void aRetryMovesTheValueWithThirtyPercentWeightAndIsNotCounted() {
            Entry afterWrongAnswer = calculator.update(UNPRACTISED, Outcome.WRONG, false, NOW);

            Entry afterRetry = calculator.update(afterWrongAnswer, Outcome.CORRECT, true, NOW.plusSeconds(60));

            assertThat(afterRetry.mastery()).isCloseTo(0.3 * (1.0 / 3), PRECISION);
            assertThat(afterRetry.attempts()).isEqualTo(1);
            assertThat(afterRetry.correct()).isZero();
            assertThat(afterRetry.lastPracticed()).isEqualTo(NOW.plusSeconds(60));
        }

        @Test
        void aRetryMovesTheValueLessThanAFirstAnswer() {
            Entry weak = new Entry(0.3, 10, 3, NOW);

            double retryGain = calculator.update(weak, Outcome.CORRECT, true, NOW).mastery() - 0.3;
            double firstAnswerGain = calculator.update(weak, Outcome.CORRECT, false, NOW).mastery() - 0.3;

            assertThat(retryGain).isCloseTo(0.3 * firstAnswerGain, PRECISION);
        }

        @Test
        void anAnswerRecordedOutOfOrderKeepsTheLatestPractice() {
            Entry practisedLater = new Entry(0.5, 2, 1, NOW);

            Entry entry = calculator.update(practisedLater, Outcome.CORRECT, false, NOW.minusSeconds(30));

            assertThat(entry.lastPracticed()).isEqualTo(NOW);
            assertThat(entry.mastery()).isCloseTo(0.5 + 0.25 * 0.5, PRECISION);
        }

        @Test
        void buildsOnTheDecayedValueAfterABreak() {
            Entry beforeBreak = new Entry(0.8, 20, 16, NOW);

            Entry entry = calculator.update(beforeBreak, Outcome.CORRECT, false, NOW.plus(Duration.ofDays(60)));

            assertThat(entry.mastery()).isCloseTo(0.4 + 0.15 * 0.6, PRECISION);
        }

        @Test
        void aFocusLessonOfThreeCorrectAnswersRaisesAWeakTagByAtLeastTwentyPoints() {
            // target: the mastery of weak skill tags rises by 0.2 within 7 days after focus lessons
            Entry weak = new Entry(0.3, 20, 6, NOW);

            Entry entry = answer(weak, Outcome.CORRECT, 3);

            assertThat(entry.mastery() - weak.mastery()).isGreaterThanOrEqualTo(0.2);
        }

        @Test
        void neverLeavesTheRangeFromZeroToOne() {
            assertThat(answer(new Entry(1.0, 0, 0, NOW), Outcome.CORRECT, 5).mastery()).isEqualTo(1.0);
            assertThat(answer(UNPRACTISED, Outcome.WRONG, 5).mastery()).isZero();
        }

        private Entry answer(Entry start, Outcome outcome, int times) {
            Entry entry = start;
            for (int i = 0; i < times; i++) {
                entry = calculator.update(entry, outcome, false, NOW);
            }
            return entry;
        }
    }

    @Nested
    class Decay {

        @Test
        void halvesAfterSixtyDaysWithoutPractice() {
            Entry entry = new Entry(0.8, 10, 8, NOW);

            assertThat(calculator.effective(entry, NOW.plus(Duration.ofDays(60)))).isCloseTo(0.4, PRECISION);
            assertThat(calculator.effective(entry, NOW.plus(Duration.ofDays(120)))).isCloseTo(0.2, PRECISION);
        }

        @Test
        void decaysOnlySlightlyWithinDays() {
            Entry entry = new Entry(0.8, 10, 8, NOW);

            assertThat(calculator.effective(entry, NOW)).isEqualTo(0.8);
            assertThat(calculator.effective(entry, NOW.plus(Duration.ofDays(1)))).isCloseTo(0.8 * Math.pow(0.5, 1.0 / 60), PRECISION);
            assertThat(calculator.effective(entry, NOW.plus(Duration.ofDays(7)))).isBetween(0.73, 0.75);
        }

        @Test
        void doesNotDecayAPlacementEstimateOrAPracticeInTheFuture() {
            assertThat(calculator.effective(calculator.initial(0.7), NOW)).isEqualTo(0.7);
            assertThat(calculator.effective(new Entry(0.7, 3, 2, NOW.plusSeconds(5)), NOW)).isEqualTo(0.7);
        }

        @Test
        void decaysEveryEntryOfASkillMasteryAndKeepsItsCounts() {
            SkillTag family = SkillTag.of("vocab.family");
            SkillTag article = SkillTag.of("grammar.definite_article.fem");
            SkillMastery raw = new SkillMastery(Map.of(
                    family, new Entry(0.9, 12, 11, NOW.minus(Duration.ofDays(60))),
                    article, new Entry(0.4, 5, 2, NOW)));

            SkillMastery effective = calculator.effective(raw, NOW);

            assertThat(effective.entries().get(family))
                    .isEqualTo(new Entry(0.45, 12, 11, NOW.minus(Duration.ofDays(60))));
            assertThat(effective.entries().get(article)).isEqualTo(raw.entries().get(article));
        }
    }

    @Nested
    class Initial {

        @Test
        void aPlacementEstimateCountsAsNotPractisedSoTheFirstAnswerMovesItHalfway() {
            Entry estimate = calculator.initial(0.6);

            Entry entry = calculator.update(estimate, Outcome.WRONG, false, NOW);

            assertThat(estimate.attempts()).isZero();
            assertThat(estimate.lastPracticed()).isNull();
            assertThat(entry.mastery()).isCloseTo(0.3, PRECISION);
        }

        @Test
        void rejectsEstimatesOutsideTheRange() {
            assertThatThrownBy(() -> calculator.initial(1.2)).isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Nested
    class Rules {

        @Test
        void scoresTheOutcomes() {
            MasteryRules rules = MasteryRules.DEFAULT;

            assertThat(rules.score(Outcome.CORRECT)).isEqualTo(1.0);
            assertThat(rules.score(Outcome.CORRECT_STANDARD_FORM)).isEqualTo(1.0);
            assertThat(rules.score(Outcome.ALMOST_CORRECT)).isEqualTo(0.6);
            assertThat(rules.score(Outcome.WRONG)).isZero();
        }

        @Test
        void rejectsParametersOutsideTheirRange() {
            assertThatThrownBy(() -> new MasteryRules(0, 0.3, 0.15, Duration.ofDays(60)))
                    .hasMessageContaining("almostCorrectScore");
            assertThatThrownBy(() -> new MasteryRules(0.6, 1.5, 0.15, Duration.ofDays(60)))
                    .hasMessageContaining("retryWeight");
            assertThatThrownBy(() -> new MasteryRules(0.6, 0.3, Double.NaN, Duration.ofDays(60)))
                    .hasMessageContaining("minLearningRate");
            assertThatThrownBy(() -> new MasteryRules(0.6, 0.3, 0.15, Duration.ZERO))
                    .hasMessageContaining("halfLife");
        }
    }
}
