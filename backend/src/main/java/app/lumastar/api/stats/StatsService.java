package app.lumastar.api.stats;

import app.lumastar.api.lesson.StartLessonKind;
import app.lumastar.api.plan.CheckpointStatuses;
import app.lumastar.api.plan.CheckpointStatuses.StageCheckpoint;
import app.lumastar.api.stats.StatsResponse.DueDay;
import app.lumastar.api.stats.StatsResponse.DueForecast;
import app.lumastar.api.stats.StatsResponse.FrequentError;
import app.lumastar.api.stats.StatsResponse.Heatmap;
import app.lumastar.api.stats.StatsResponse.HeatmapDay;
import app.lumastar.api.stats.StatsResponse.LevelProgress;
import app.lumastar.api.stats.StatsResponse.MasteryArea;
import app.lumastar.api.stats.StatsResponse.PracticeTarget;
import app.lumastar.core.mastery.AreaMastery;
import app.lumastar.core.plan.StageProgress;
import app.lumastar.core.progress.PracticeTime;
import app.lumastar.domain.ErrorCategory;
import app.lumastar.domain.Level;
import app.lumastar.domain.SkillTag;
import app.lumastar.domain.SkillTagErrorRate;
import app.lumastar.persistence.ContentCatalog;
import app.lumastar.persistence.ErrorAnalysisQueries;
import app.lumastar.persistence.ErrorAnalysisQueries.FrequentErrors;
import app.lumastar.persistence.PracticeQueries;
import app.lumastar.persistence.PracticeQueries.DayPractice;
import app.lumastar.persistence.SkillMasteryStore;
import app.lumastar.persistence.SrsCardStore;
import app.lumastar.persistence.StageEntity;
import app.lumastar.persistence.StageRepository;
import app.lumastar.persistence.StreakDayKind;
import app.lumastar.persistence.StreakStore;
import app.lumastar.persistence.StreakStore.StreakDay;
import app.lumastar.persistence.UserEntity;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The learner's statistics, each part read with one query or a few. */
@Service
class StatsService {

    static final Duration TOP_ERRORS_PERIOD = Duration.ofDays(30);
    static final int TOP_ERRORS = 5;
    static final int HEATMAP_DAYS = 365;
    static final int FORECAST_DAYS = 7;

    private final CheckpointStatuses checkpoints;
    private final StageRepository stages;
    private final SkillMasteryStore mastery;
    private final ErrorAnalysisQueries errors;
    private final ContentCatalog catalog;
    private final PracticeQueries practice;
    private final StreakStore streaks;
    private final SrsCardStore cards;
    private final Clock clock;

    StatsService(CheckpointStatuses checkpoints, StageRepository stages, SkillMasteryStore mastery,
                 ErrorAnalysisQueries errors, ContentCatalog catalog, PracticeQueries practice, StreakStore streaks,
                 SrsCardStore cards, Clock clock) {
        this.checkpoints = checkpoints;
        this.stages = stages;
        this.mastery = mastery;
        this.errors = errors;
        this.catalog = catalog;
        this.practice = practice;
        this.streaks = streaks;
        this.cards = cards;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    StatsResponse stats(UserEntity learner) {
        UUID userId = learner.getId();
        Instant now = clock.instant();
        ZoneId zone = learner.getTimeZone();
        LocalDate today = LocalDate.ofInstant(now, zone);
        return new StatsResponse(levelProgress(learner).orElse(null), masteryByArea(userId, now),
                topErrors(userId, learner.getCurrentLevel(), now), heatmap(userId, today, zone), cards.learnedWords(userId),
                forecast(userId, now, today, zone));
    }

    private Optional<LevelProgress> levelProgress(UserEntity learner) {
        Level level = learner.getCurrentLevel();
        if (level == null) {
            return Optional.empty();
        }
        return checkpoints.stage(learner.getId(), level).map(stage -> levelProgress(level, stage));
    }

    private LevelProgress levelProgress(Level level, StageCheckpoint stage) {
        String title = stages.findById(level.code()).map(StageEntity::getTitle).orElse(level.code());
        StageProgress progress = stage.progress();
        return new LevelProgress(level, title, level.next().orElse(null), progress.completed(), progress.skipped(),
                progress.total(), progress.percent(), stage.status());
    }

    private List<MasteryArea> masteryByArea(UUID userId, Instant now) {
        return AreaMastery.of(mastery.effective(userId, now)).stream()
                .map(area -> new MasteryArea(area.area(), area.area().label(), area.skillTags(),
                        area.average().isPresent() ? area.average().getAsDouble() : null))
                .toList();
    }

    private List<FrequentError> topErrors(UUID userId, Level level, Instant now) {
        Map<SkillTag, String> labels = catalog.skillTagLabels();
        Set<SkillTag> practisable = level == null ? Set.of() : catalog.lessonSkillTags(level);
        return errors.frequentErrorsBySkillTag(userId, now.minus(TOP_ERRORS_PERIOD), TOP_ERRORS).stream()
                .map(frequent -> frequentError(frequent, labels, practisable))
                .toList();
    }

    private static FrequentError frequentError(FrequentErrors frequent, Map<SkillTag, String> labels,
                                               Set<SkillTag> practisable) {
        SkillTagErrorRate rate = frequent.rate();
        SkillTag tag = rate.tag();
        ErrorCategory category = frequent.category();
        return new FrequentError(tag.id(), labels.getOrDefault(tag, tag.id()), rate.wrong(), rate.attempts(),
                rate.errorRate(), category, category == null ? null : category.label(),
                practisable.contains(tag) ? new PracticeTarget(StartLessonKind.PRACTICE, tag.id()) : null);
    }

    private Heatmap heatmap(UUID userId, LocalDate today, ZoneId zone) {
        LocalDate from = today.minusDays(HEATMAP_DAYS - 1);
        Map<LocalDate, DayPractice> practised = practice.perDay(userId, from, today, zone).stream()
                .collect(Collectors.toMap(DayPractice::day, Function.identity()));
        Map<LocalDate, StreakDayKind> streakDays = streaks.days(userId, from, today).stream()
                .collect(Collectors.toMap(StreakDay::day, StreakDay::kind));
        List<HeatmapDay> days = Stream.iterate(from, day -> !day.isAfter(today), day -> day.plusDays(1))
                .map(day -> {
                    DayPractice dayPractice = practised.getOrDefault(day, DayPractice.none(day));
                    StreakDayKind kind = streakDays.get(day);
                    return new HeatmapDay(day, PracticeTime.minutes(dayPractice.practised()), dayPractice.xp(),
                            dayPractice.lessons(), kind == StreakDayKind.GOAL_MET, kind == StreakDayKind.FREEZE);
                })
                .toList();
        return new Heatmap(from, today, days);
    }

    private DueForecast forecast(UUID userId, Instant now, LocalDate today, ZoneId zone) {
        Map<LocalDate, Integer> duePerDay = cards.duePerDay(userId, today, FORECAST_DAYS, zone);
        List<DueDay> days = Stream.iterate(today, day -> day.plusDays(1))
                .limit(FORECAST_DAYS)
                .map(day -> new DueDay(day, duePerDay.getOrDefault(day, 0)))
                .toList();
        return new DueForecast(cards.dueNow(userId, now), days.get(0).due(), days.get(1).due(), days);
    }
}
