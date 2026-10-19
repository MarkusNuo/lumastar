package app.lumastar.persistence;

import app.lumastar.core.srs.SrsSettings;
import app.lumastar.domain.LearnerProfile;
import app.lumastar.domain.Level;
import app.lumastar.domain.Motivation;
import app.lumastar.domain.OnboardingStep;
import app.lumastar.domain.SelfAssessment;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** The learner account with its profile and settings. */
@Entity
@Table(name = "users")
public class UserEntity {

    public static final int DEFAULT_DAILY_GOAL_MINUTES = 10;
    public static final String DEFAULT_TIME_ZONE = "Europe/Zurich";
    /** The key of the FSRS target retention in {@code settings}. */
    private static final String REQUEST_RETENTION = "requestRetention";

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

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> settings;

    private Instant onboardingCompletedAt;

    private Instant createdAt;

    private String email;

    private Instant emailVerifiedAt;

    private String pendingEmail;

    protected UserEntity() {
    }

    /** A new account; its e-mail address is unverified until the link of the verification mail is opened. */
    public UserEntity(String email, String displayName, String passwordHash, Instant createdAt) {
        this.email = email;
        this.displayName = displayName;
        this.passwordHash = passwordHash;
        this.motivations = List.of();
        this.dailyGoalMinutes = DEFAULT_DAILY_GOAL_MINUTES;
        this.timeZone = DEFAULT_TIME_ZONE;
        this.settings = Map.of();
        this.createdAt = createdAt;
    }

    public void rename(String newDisplayName) {
        displayName = newDisplayName;
    }

    public void changePassword(String newPasswordHash) {
        passwordHash = newPasswordHash;
    }

    /** Whether {@code address} is the sign-in address of the account; e-mail addresses are compared regardless of case. */
    public boolean hasEmail(String address) {
        return email != null && email.equalsIgnoreCase(address);
    }

    public boolean hasPendingEmail(String address) {
        return pendingEmail != null && pendingEmail.equalsIgnoreCase(address);
    }

    public void verifyEmail(Instant at) {
        if (emailVerifiedAt == null) {
            emailVerifiedAt = at;
        }
    }

    /**
     * Starts a change of the sign-in address. A verified address stays until the new one is confirmed, so that a typo
     * never locks the learner out; an unverified (or missing) address is replaced at once.
     *
     * @return whether the new address is pending, i.e. needs the confirmation of an e-mail change
     */
    public boolean changeEmail(String newEmail) {
        if (isEmailVerified()) {
            pendingEmail = newEmail;
            return true;
        }
        email = newEmail;
        pendingEmail = null;
        return false;
    }

    public void cancelEmailChange() {
        pendingEmail = null;
    }

    /** The pending address, confirmed by the link sent to it, becomes the verified sign-in address. */
    public void confirmEmailChange(Instant at) {
        if (pendingEmail == null) {
            throw new IllegalStateException("no e-mail change is pending");
        }
        email = pendingEmail;
        emailVerifiedAt = at;
        pendingEmail = null;
    }

    /** The answers of the onboarding questions (PRD F1); they can be changed again later. */
    public void answerOnboarding(Collection<Motivation> newMotivations, int newDailyGoalMinutes,
                                 SelfAssessment newSelfAssessment) {
        motivations = newMotivations.stream().sorted().map(Motivation::code).distinct().toList();
        dailyGoalMinutes = newDailyGoalMinutes;
        selfAssessment = newSelfAssessment;
    }

    /**
     * The settings of the learner: daily goal (PRD F1, F9), target retention of the FSRS reviews (PRD F8) and time
     * zone. Other entries of {@code settings}, e.g. from older exports, are kept.
     */
    public void changeSettings(int newDailyGoalMinutes, double newRequestRetention, ZoneId newTimeZone) {
        dailyGoalMinutes = newDailyGoalMinutes;
        Map<String, Object> changed = new LinkedHashMap<>(settings);
        changed.put(REQUEST_RETENTION, newRequestRetention);
        settings = changed;
        timeZone = newTimeZone.getId();
    }

    /** Sets the level found by a placement test (or its skip); the first placement completes the onboarding. */
    public void place(Level level, Instant at) {
        currentLevel = level;
        if (onboardingCompletedAt == null) {
            onboardingCompletedAt = at;
        }
    }

    /** Moves the learner up after a passed checkpoint (PRD chapter 5). */
    public void levelUp(Level level) {
        if (currentLevel == null || !level.isAbove(currentLevel)) {
            throw new IllegalArgumentException("a level-up goes above the current level " + currentLevel);
        }
        currentLevel = level;
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

    /** The FSRS target retention; the default while none or one outside the accepted range is set. */
    public double getRequestRetention() {
        return settings.get(REQUEST_RETENTION) instanceof Number retention && SrsSettings.isValidRetention(retention.doubleValue())
                ? retention.doubleValue()
                : SrsSettings.DEFAULT_REQUEST_RETENTION;
    }

    public boolean isOnboardingCompleted() {
        return onboardingCompletedAt != null;
    }

    /** The sign-in address; {@code null} only for the account of the single-user instance before M8. */
    public String getEmail() {
        return email;
    }

    public boolean isEmailVerified() {
        return emailVerifiedAt != null;
    }

    /** An account from before M8 signs in without e-mail until it adds one. */
    public boolean isEmailRequired() {
        return email == null;
    }

    public String getPendingEmail() {
        return pendingEmail;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
