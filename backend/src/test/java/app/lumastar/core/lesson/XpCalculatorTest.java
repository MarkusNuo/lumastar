package app.lumastar.core.lesson;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import app.lumastar.core.lesson.XpCalculator.FirstAttempt;
import app.lumastar.core.lesson.XpCalculator.LessonXp;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;

class XpCalculatorTest {

    private static final Duration FAST = Duration.ofSeconds(3);
    private static final Duration SLOW = Duration.ofSeconds(20);

    @Test
    void awardsTheBaseForAnyFinishedLesson() {
        LessonXp xp = XpCalculator.calculate(List.of(correct(SLOW), wrong(SLOW), correct(SLOW)));

        assertThat(xp).isEqualTo(new LessonXp(10, 0, 0));
        assertThat(xp.total()).isEqualTo(10);
    }

    @Test
    void addsThePerfectBonusWhenEveryFirstAttemptCountsAsCorrect() {
        assertThat(XpCalculator.calculate(List.of(correct(SLOW), correct(SLOW))).total()).isEqualTo(15);
    }

    @Test
    void addsTheSpeedBonusForAFastMedianEvenWithMistakes() {
        LessonXp xp = XpCalculator.calculate(List.of(correct(FAST), wrong(FAST), correct(SLOW)));

        assertThat(xp).isEqualTo(new LessonXp(10, 0, 5));
    }

    @Test
    void awardsTwentyForAPerfectAndFastLesson() {
        assertThat(XpCalculator.calculate(List.of(correct(FAST), correct(FAST), correct(SLOW))).total()).isEqualTo(20);
    }

    @Test
    void theSpeedLimitOfEightSecondsIsInclusive() {
        assertThat(XpCalculator.calculate(List.of(wrong(Duration.ofSeconds(8)))).speedBonus()).isEqualTo(5);
        assertThat(XpCalculator.calculate(List.of(wrong(Duration.ofMillis(8_001)))).speedBonus()).isZero();
    }

    @Test
    void theMedianOfAnEvenCountIsTheMeanOfTheMiddleValues() {
        assertThat(XpCalculator.calculate(List.of(wrong(seconds(4)), wrong(seconds(8)), wrong(seconds(9)), wrong(seconds(30))))
                .speedBonus()).isZero();
    }

    @Test
    void aLessonHasAtLeastOneExercise() {
        assertThatIllegalArgumentException().isThrownBy(() -> XpCalculator.calculate(List.of()));
    }

    private static FirstAttempt correct(Duration responseTime) {
        return new FirstAttempt(true, responseTime);
    }

    private static FirstAttempt wrong(Duration responseTime) {
        return new FirstAttempt(false, responseTime);
    }

    private static Duration seconds(int seconds) {
        return Duration.ofSeconds(seconds);
    }
}
