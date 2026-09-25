package app.lingora.persistence;

import app.lingora.domain.Level;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** The learner account. Motivations, settings and time zone are mapped once a feature needs them. */
@Entity
@Table(name = "users")
public class UserEntity {

    public static final int DEFAULT_DAILY_GOAL_MINUTES = 10;

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String displayName;

    private String passwordHash;

    private int dailyGoalMinutes;

    private Level currentLevel;

    private int xpTotal;

    private Instant onboardingCompletedAt;

    private Instant createdAt;

    protected UserEntity() {
    }

    public UserEntity(String displayName, String passwordHash, Instant createdAt) {
        this.displayName = displayName;
        this.passwordHash = passwordHash;
        this.dailyGoalMinutes = DEFAULT_DAILY_GOAL_MINUTES;
        this.createdAt = createdAt;
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

    public int getDailyGoalMinutes() {
        return dailyGoalMinutes;
    }

    public Level getCurrentLevel() {
        return currentLevel;
    }

    public int getXpTotal() {
        return xpTotal;
    }

    public boolean isOnboardingCompleted() {
        return onboardingCompletedAt != null;
    }
}
