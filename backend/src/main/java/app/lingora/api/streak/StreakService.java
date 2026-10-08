package app.lingora.api.streak;

import app.lingora.api.streak.StreakCalendar.StreakCalendarDay;
import app.lingora.core.progress.DailyGoal;
import app.lingora.core.progress.StreakGoal;
import app.lingora.core.progress.StreakGoalRule;
import app.lingora.core.progress.StreakRule;
import app.lingora.persistence.PracticeQueries;
import app.lingora.persistence.StreakGoalStore;
import app.lingora.persistence.StreakStore;
import app.lingora.persistence.UserEntity;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The streak screen and the streak goal. Like {@code GET /api/progress/today}, it judges the stored streak on the
 * current day ({@link StreakRule#status}); the goal is reached when a lesson extends the streak to it, see
 * {@link app.lingora.api.progress.DailyProgress#evaluate}.
 */
@Service
class StreakService {

    private final PracticeQueries practice;
    private final StreakStore streaks;
    private final StreakGoalStore goals;
    private final Clock clock;

    StreakService(PracticeQueries practice, StreakStore streaks, StreakGoalStore goals, Clock clock) {
        this.practice = practice;
        this.streaks = streaks;
        this.goals = goals;
        this.clock = clock;
    }

    /** @param month the calendar month to show, the current one if empty */
    @Transactional(readOnly = true)
    StreakOverviewResponse overview(UserEntity learner, Optional<YearMonth> month) {
        UUID userId = learner.getId();
        ZoneId zone = learner.getTimeZone();
        LocalDate today = LocalDate.ofInstant(clock.instant(), zone);
        DailyGoal dailyGoal = DailyGoal.of(practice.on(userId, today, zone).practised(), learner.getDailyGoalMinutes());
        StreakRule.Status streak = StreakRule.status(streaks.streak(userId), today);
        YearMonth shown = month.orElse(YearMonth.from(today));
        return new StreakOverviewResponse(streak.current(), streak.longest(), streak.extendedToday(), today,
                dailyGoal.minutes(), dailyGoal.goalMinutes(), freezes(userId, streak, today),
                new StreakCalendar(shown.toString(), shown.atDay(1), calendarDays(userId, shown, streak, today)),
                StreakGoalResponse.of(StreakGoalRule.status(goals.goal(userId), streak.current())));
    }

    /** Locks the streak, so that a lesson completed meanwhile cannot reach the old goal unnoticed. */
    @Transactional
    StreakGoalResponse chooseGoal(UserEntity learner, int target) {
        UUID userId = learner.getId();
        Instant now = clock.instant();
        int streak = StreakRule.status(streaks.lock(userId, now), LocalDate.ofInstant(now, learner.getTimeZone())).current();
        StreakGoal goal = goals.goal(userId);
        if (!StreakGoalRule.mayChoose(goal, streak, target)) {
            throw StreakProblems.invalidGoal(target, StreakGoalRule.status(goal, streak), streak);
        }
        goals.choose(userId, target, now);
        return StreakGoalResponse.of(StreakGoalRule.status(StreakGoal.chosen(target), streak));
    }

    /** A freeze bridging yesterday counts as used, just as it is deducted from the freezes left. */
    private StreakFreezes freezes(UUID userId, StreakRule.Status streak, LocalDate today) {
        Optional<LocalDate> lastUsed = streak.bridgesYesterday()
                ? Optional.of(today.minusDays(1))
                : streaks.lastFrozenDay(userId);
        return new StreakFreezes(streak.freezesLeft(), StreakRule.FREEZES_PER_WEEK, StreakRule.freezesResetOn(today),
                lastUsed.orElse(null));
    }

    private List<StreakCalendarDay> calendarDays(UUID userId, YearMonth month, StreakRule.Status streak, LocalDate today) {
        List<StreakCalendarDay> days = new ArrayList<>(streaks.days(userId, month.atDay(1), month.atEndOfMonth()).stream()
                .map(day -> new StreakCalendarDay(day.day(), StreakDayStatus.of(day.kind())))
                .toList());
        LocalDate yesterday = today.minusDays(1);
        if (streak.bridgesYesterday() && YearMonth.from(yesterday).equals(month)) {
            days.add(new StreakCalendarDay(yesterday, StreakDayStatus.FROZEN));
        }
        return days;
    }
}
