package app.lumastar.api.progress;

import app.lumastar.core.progress.DailyGoal;
import app.lumastar.core.progress.StreakGoal;
import app.lumastar.core.progress.StreakGoalRule;
import app.lumastar.core.progress.StreakRule;
import app.lumastar.core.progress.StreakRule.Extension;
import app.lumastar.persistence.PracticeCompletion;
import app.lumastar.persistence.PracticeQueries;
import app.lumastar.persistence.PracticeQueries.DayPractice;
import app.lumastar.persistence.StreakDayKind;
import app.lumastar.persistence.StreakGoalStore;
import app.lumastar.persistence.StreakStore;
import app.lumastar.persistence.UserEntity;
import app.lumastar.persistence.UserRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The daily goal and the streak of PRD F9, see {@link StreakRule}. Everything that adds practice time or changes the
 * goal or the time zone calls {@link #evaluate}, which extends the streak once the goal of the day is met, and marks the
 * streak goal reached when the extension reaches it ({@link StreakGoalRule}). Reads judge the stored streak on the
 * current day, so no job is needed when days pass.
 */
@Service
public class DailyProgress {

    private final UserRepository users;
    private final PracticeQueries practice;
    private final StreakStore streaks;
    private final StreakGoalStore streakGoals;
    private final Clock clock;

    DailyProgress(UserRepository users, PracticeQueries practice, StreakStore streaks, StreakGoalStore streakGoals,
                  Clock clock) {
        this.users = users;
        this.practice = practice;
        this.streaks = streaks;
        this.streakGoals = streakGoals;
        this.clock = clock;
    }

    /** The daily goal and the streak as the result of a lesson or a placement test shows them. */
    public record CompletionProgress(LessonDailyGoal dailyGoal, LessonStreak streak) {
    }

    /**
     * Extends the streak if today's goal is met and has not extended it yet. Completions must be flushed, since
     * the practice time is read with SQL.
     *
     * @param completion the completion that is evaluated, {@link PracticeCompletion#NONE} for anything else
     */
    @Transactional
    public void evaluate(UUID userId, PracticeCompletion completion) {
        UserEntity learner = users.findById(userId).orElseThrow();
        Instant now = clock.instant();
        ZoneId zone = learner.getTimeZone();
        LocalDate today = LocalDate.ofInstant(now, zone);
        DailyGoal goal = DailyGoal.of(practice.on(userId, today, zone).practised(), learner.getDailyGoalMinutes());
        if (!goal.met()) {
            return;
        }
        Extension extension = StreakRule.extend(streaks.lock(userId, now), today);
        if (!extension.extended()) {
            return;
        }
        streaks.save(userId, extension.streak(), now);
        extension.bridgedDay().ifPresent(day -> streaks.recordFreeze(userId, day, now));
        streaks.recordGoalMet(userId, today, goal.goalMinutes(), completion, now);
        StreakGoalRule.reachedBy(streakGoals.goal(userId), extension.streak().current(), today)
                .ifPresent(reached -> streakGoals.markReached(userId, reached, now));
    }

    @Transactional(readOnly = true)
    public DailyProgressResponse today(UserEntity learner) {
        UUID userId = learner.getId();
        ZoneId zone = learner.getTimeZone();
        LocalDate today = LocalDate.ofInstant(clock.instant(), zone);
        DayPractice day = practice.on(userId, today, zone);
        DailyGoal goal = DailyGoal.of(day.practised(), learner.getDailyGoalMinutes());
        StreakRule.Status streak = StreakRule.status(streaks.streak(userId), today);
        boolean freezeUsedYesterday = streak.bridgesYesterday() || isFrozen(userId, today.minusDays(1));
        return new DailyProgressResponse(today, goal.minutes(), goal.goalMinutes(), goal.met(), day.xp(), day.lessons(),
                StreakResponse.of(streak, freezeUsedYesterday));
    }

    /**
     * The progress of the completion's day up to and including the completion, and the streak today. Asking again
     * later returns the same daily goal, unless the goal itself has been changed since; the reached streak goal is
     * reported until the learner has chosen the next one.
     */
    @Transactional(readOnly = true)
    public CompletionProgress ofCompletion(UUID userId, PracticeCompletion completion, Instant finishedAt) {
        UserEntity learner = users.findById(userId).orElseThrow();
        ZoneId zone = learner.getTimeZone();
        LocalDate completionDay = LocalDate.ofInstant(finishedAt, zone);
        DailyGoal goal = DailyGoal.of(practice.onUntil(userId, completionDay, zone, finishedAt).practised(),
                learner.getDailyGoalMinutes());
        Optional<LocalDate> metByCompletion = streaks.dayMetBy(userId, completion);
        boolean freezeUsed = metByCompletion.filter(day -> isFrozen(userId, day.minusDays(1))).isPresent();
        StreakRule.Status streak = StreakRule.status(streaks.streak(userId), LocalDate.ofInstant(clock.instant(), zone));
        int previous = metByCompletion.map(streak::before).orElse(streak.current());
        StreakGoal streakGoal = streakGoals.goal(userId);
        StreakGoalReached goalReached = metByCompletion
                .filter(day -> day.equals(streakGoal.reachedOn()))
                .map(day -> StreakGoalReached.of(StreakGoalRule.status(streakGoal, streak.current())))
                .orElse(null);
        return new CompletionProgress(
                new LessonDailyGoal(goal.minutes(), goal.goalMinutes(), goal.met(), metByCompletion.isPresent()),
                new LessonStreak(streak.current(), previous, streak.extendedToday(), freezeUsed, goalReached));
    }

    private boolean isFrozen(UUID userId, LocalDate day) {
        return streaks.days(userId, day, day).stream().anyMatch(recorded -> recorded.kind() == StreakDayKind.FREEZE);
    }
}
