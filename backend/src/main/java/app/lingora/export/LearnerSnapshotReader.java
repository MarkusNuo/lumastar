package app.lingora.export;

import app.lingora.core.progress.StreakRule;
import app.lingora.domain.Coded;
import app.lingora.domain.LearnerProfile;
import app.lingora.domain.LearningPlan;
import app.lingora.domain.Level;
import app.lingora.domain.Motivation;
import app.lingora.domain.PlanUnitStatus;
import app.lingora.domain.SkillTag;
import app.lingora.export.LearnerSnapshot.CurrentUnit;
import app.lingora.export.LearnerSnapshot.Streak;
import app.lingora.persistence.ErrorAnalysisQueries;
import app.lingora.persistence.LearningPlanStore;
import app.lingora.persistence.LivePlans;
import app.lingora.persistence.SkillMasteryStore;
import app.lingora.persistence.SrsCardStore;
import app.lingora.persistence.StreakStore;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

/** Reads the {@link LearnerSnapshot} of a learner from the database. */
@Component
public class LearnerSnapshotReader {

    static final int RECENT_ERRORS = 50;
    static final Duration FREQUENT_ERRORS_PERIOD = Duration.ofDays(30);
    static final int FREQUENT_ERROR_CATEGORIES = 3;

    private final JdbcClient jdbc;
    private final SkillMasteryStore mastery;
    private final ErrorAnalysisQueries errors;
    private final LearningPlanStore plans;
    private final LivePlans livePlans;
    private final SrsCardStore cards;
    private final StreakStore streaks;
    private final JsonMapper json;
    private final Clock clock;

    LearnerSnapshotReader(JdbcClient jdbc, SkillMasteryStore mastery, ErrorAnalysisQueries errors, LearningPlanStore plans,
                          LivePlans livePlans, SrsCardStore cards, StreakStore streaks, JsonMapper json, Clock clock) {
        this.jdbc = jdbc;
        this.mastery = mastery;
        this.errors = errors;
        this.plans = plans;
        this.livePlans = livePlans;
        this.cards = cards;
        this.streaks = streaks;
        this.json = json;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public LearnerSnapshot read(UUID userId) {
        Instant now = clock.instant();
        Account account = jdbc.sql("""
                        SELECT display_name, motivations, daily_goal_minutes, current_level, xp_total, time_zone
                        FROM users WHERE id = :user""")
                .param("user", userId)
                .query((row, rowNumber) -> account(userId, row))
                .single();
        Optional<LearningPlan> plan = plans.current(userId)
                .map(stored -> livePlans.live(userId, stored, account.profile().currentLevel()));
        return new LearnerSnapshot(now, account.timeZone(), account.profile(),
                streak(userId, LocalDate.ofInstant(now, account.timeZone())), mastery.effective(userId, now),
                skillTagLabels(), errors.recentErrors(userId, RECENT_ERRORS),
                errors.topErrorCategories(userId, now.minus(FREQUENT_ERRORS_PERIOD), FREQUENT_ERROR_CATEGORIES),
                cards.learnedWords(userId), plan.map(json::writeValueAsString).orElse(null), plan.flatMap(LearnerSnapshotReader::currentUnit).orElse(null));
    }

    private static Optional<CurrentUnit> currentUnit(LearningPlan plan) {
        return plan.stages().stream()
                .flatMap(stage -> stage.units().stream()
                        .filter(unit -> unit.status() == PlanUnitStatus.IN_PROGRESS)
                        .map(unit -> new CurrentUnit(unit.title(), stage.level())))
                .findFirst();
    }

    /** The streak as it stands today in the learner's time zone, i.e. 0 once it has ended. */
    private Streak streak(UUID userId, LocalDate today) {
        StreakRule.Status status = StreakRule.status(streaks.streak(userId), today);
        return new Streak(status.current(), status.longest());
    }

    private Map<SkillTag, String> skillTagLabels() {
        return jdbc.sql("SELECT id, label FROM content_skill_tags")
                .query((row, rowNumber) -> Map.entry(SkillTag.of(row.getString("id")), row.getString("label")))
                .stream()
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }


    private static Account account(UUID userId, ResultSet row) throws SQLException {
        Set<Motivation> motivations = Arrays.stream((String[]) row.getArray("motivations").getArray())
                .map(code -> Coded.fromCode(Motivation.class, code))
                .collect(Collectors.toSet());
        String level = row.getString("current_level");
        LearnerProfile profile = new LearnerProfile(userId, row.getString("display_name"), motivations,
                row.getInt("daily_goal_minutes"), level == null ? null : Level.fromCode(level), row.getInt("xp_total"));
        return new Account(profile, ZoneId.of(row.getString("time_zone")));
    }

    private record Account(LearnerProfile profile, ZoneId timeZone) {
    }
}
