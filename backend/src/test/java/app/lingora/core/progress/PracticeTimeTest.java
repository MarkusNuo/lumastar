package app.lingora.core.progress;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import java.time.Duration;
import org.junit.jupiter.api.Test;

class PracticeTimeTest {

    @Test
    void countsALessonWithItsDuration() {
        assertThat(PracticeTime.counted(Duration.ofMinutes(4).plusSeconds(30))).isEqualTo(Duration.ofSeconds(270));
    }

    @Test
    void countsALessonLeftOpenForHoursWithThirtyMinutes() {
        assertThat(PracticeTime.counted(Duration.ofHours(5))).isEqualTo(Duration.ofMinutes(30));
        assertThat(PracticeTime.counted(Duration.ofMinutes(30))).isEqualTo(Duration.ofMinutes(30));
    }

    @Test
    void neverCountsANegativeDuration() {
        assertThat(PracticeTime.counted(Duration.ofSeconds(-5))).isZero();
    }

    @Test
    void roundsMinutesDown() {
        assertThat(PracticeTime.minutes(Duration.ofSeconds(599))).isEqualTo(9);
        assertThat(PracticeTime.minutes(Duration.ofSeconds(600))).isEqualTo(10);
    }

    @Test
    void theGoalIsMetWithItsMinutes() {
        assertThat(DailyGoal.of(Duration.ofSeconds(599), 10).met()).isFalse();
        assertThat(DailyGoal.of(Duration.ofMinutes(10), 10).met()).isTrue();
        assertThat(DailyGoal.of(Duration.ofMinutes(25), 20)).isEqualTo(new DailyGoal(25, 20));
    }

    @Test
    void theGoalIsOneOfTheOnboardingOptions() {
        assertThat(DailyGoal.OPTIONS).containsExactly(5, 10, 15, 20);
        assertThatIllegalArgumentException().isThrownBy(() -> new DailyGoal(3, 0));
        assertThatIllegalArgumentException().isThrownBy(() -> new DailyGoal(-1, 10));
    }
}
