package app.lingora.persistence;

import app.lingora.domain.LearnerProfile;
import app.lingora.domain.Level;
import app.lingora.domain.Motivation;
import app.lingora.domain.OnboardingStep;
import app.lingora.domain.SelfAssessment;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** The learner account. The settings are read where a feature needs them (e.g. the FSRS target retention). */
@Entity
@Table(name = "users")
public class UserEntity {

    public static final int DEFAULT_DAILY_GOAL_MINUTES = 10;
    public static final String DEFAULT_TIME_ZONE = "Europe/Zurich";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String displayName;

    private String passwordHash;

    @JdbcTypeCode(SqlTypes.ARRAY)
    private List<String> motivations;

    private int dailyGoalMinutes;

    private SelfAssessment selfAssessment;

    private Level currentLevel;

    private int xpTotal;

    private String timeZone;

    private Instant onboardingCompletedAt;

    private Instant createdAt;

    protected UserEntity() {
    }

    public UserEntity(String displayName, String passwordHash, Instant createdAt) {
        this.displayName = displayName;
        this.passwordHash = passwordHash;
        this.motivations = List.of();
        this.dailyGoalMinutes = DEFAULT_DAILY_GOAL_MINUTES;
        this.timeZone = DEFAULT_TIME_ZONE;
        this.createdAt = createdAt;
    }

    /** The answers of the onboarding questions (PRD F1); they can be changed again later. */
    public void answerOnboarding(Collection<Motivation> newMotivations, int newDailyGoalMinutes,
                                 SelfAssessment newSelfAssessment) {
        motivations = newMotivations.stream().sorted().map(Motivation::code).distinct().toList();
        dailyGoalMinutes = newDailyGoalMinutes;
        selfAssessment = newSelfAssessment;
    }

    /** Sets the level found by a placement test (or its skip); the first placement completes the onboarding. */
    public void place(Level level, Instant at) {
        currentLevel = level;
        if (onboardingCompletedAt == null) {
            onboardingCompletedAt = at;
        }
    }

    public OnboardingStep onboardingStep() {
        if (selfAssessment == null) {
            return OnboardingStep.PROFILE;
        }
        return onboardingCompletedAt == null ? OnboardingStep.PLACEMENT : OnboardingStep.DONE;
    }

    /** A placement test starts at the current level, or at the self-assessed one before the first placement. */
    public Level placementStartLevel() {
        return currentLevel != null ? currentLevel : selfAssessment.startLevel();
    }

    /** Only an absolute beginner may skip the test, and only before being placed for the first time (PRD F1). */
    public boolean maySkipPlacement() {
        return selfAssessment != null && selfAssessment.allowsSkippingPlacement() && currentLevel == null;
    }

    public LearnerProfile toProfile() {
        return new LearnerProfile(id, displayName, getMotivations(), dailyGoalMinutes, currentLevel, xpTotal);
    }

    public UUID getId() {
        return id;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public Set<Motivation> getMotivations() {
        return motivations.stream().map(Motivation::fromCode).collect(Collectors.toSet());
    }

    public int getDailyGoalMinutes() {
        return dailyGoalMinutes;
    }

    public SelfAssessment getSelfAssessment() {
        return selfAssessment;
    }

    public Level getCurrentLevel() {
        return currentLevel;
    }

    public int getXpTotal() {
        return xpTotal;
    }

    /** The learner's time zone; it decides what "today" and "tomorrow" are. */
    public ZoneId getTimeZone() {
        return ZoneId.of(timeZone);
    }

    public boolean isOnboardingCompleted() {
        return onboardingCompletedAt != null;
    }
}
