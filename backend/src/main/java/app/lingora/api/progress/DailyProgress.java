package app.lingora.api.progress;

import app.lingora.core.progress.DailyGoal;
import app.lingora.core.progress.StreakRule;
import app.lingora.core.progress.StreakRule.Extension;
import app.lingora.persistence.PracticeQueries;
import app.lingora.persistence.PracticeQueries.DayPractice;
import app.lingora.persistence.StreakDayKind;
import app.lingora.persistence.StreakStore;
import app.lingora.persistence.UserEntity;
import app.lingora.persistence.UserRepository;
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
 * goal or the time zone calls {@link #evaluate}, which extends the streak once the goal of the day is met. Reads judge
 * the stored streak on the current day, so no job is needed when days pass.
 */
@Service
public class DailyProgress {

    private final UserRepository users;
    private final PracticeQueries practice;
    private final StreakStore streaks;
    private final Clock clock;

    DailyProgress(UserRepository users, PracticeQueries practice, StreakStore streaks, Clock clock) {
        this.users = users;
        this.practice = practice;
        this.streaks = streaks;
        this.clock = clock;
    }

    /** The daily goal and the streak as a lesson result shows them. */
    public record LessonProgress(LessonDailyGoal dailyGoal, LessonStreak streak) {
    }

    /**
     * Extends the streak if today's goal is met and has not extended it yet. Completed lessons must be flushed, since
     * the practice time is read with SQL.
     *
     * @param completedLesson the lesson whose completion is evaluated, {@code null} for anything else
     */
    @Transactional
    public void evaluate(UUID userId, UUID completedLesson) {
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
        streaks.recordGoalMet(userId, today, goal.goalMinutes(), completedLesson, now);
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
     * The progress of the lesson's day up to and including the lesson, and the streak today. Completing a lesson
     * again later returns the same daily goal, unless the goal itself has been changed since.
     */
    @Transactional(readOnly = true)
    public LessonProgress ofLesson(UUID userId, UUID lessonId, Instant finishedAt) {
        UserEntity learner = users.findById(userId).orElseThrow();
        ZoneId zone = learner.getTimeZone();
        LocalDate lessonDay = LocalDate.ofInstant(finishedAt, zone);
        DailyGoal goal = DailyGoal.of(practice.onUntil(userId, lessonDay, zone, finishedAt).practised(),
                learner.getDailyGoalMinutes());
        Optional<LocalDate> metByLesson = streaks.dayMetBy(userId, lessonId);
        boolean freezeUsed = metByLesson.filter(day -> isFrozen(userId, day.minusDays(1))).isPresent();
        StreakRule.Status streak = StreakRule.status(streaks.streak(userId), LocalDate.ofInstant(clock.instant(), zone));
        return new LessonProgress(new LessonDailyGoal(goal.minutes(), goal.goalMinutes(), goal.met(), metByLesson.isPresent()),
                new LessonStreak(streak.current(), streak.extendedToday(), freezeUsed));
    }

    private boolean isFrozen(UUID userId, LocalDate day) {
        return streaks.days(userId, day, day).stream().anyMatch(recorded -> recorded.kind() == StreakDayKind.FREEZE);
    }
}
