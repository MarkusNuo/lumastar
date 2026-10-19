package app.lumastar.api.reminder;

import app.lumastar.api.error.ApiProblemException;
import app.lumastar.core.reminder.ReminderPolicy;
import app.lumastar.persistence.ReminderStore;
import app.lumastar.persistence.ReminderStore.SnoozableReminder;
import app.lumastar.persistence.ReminderStore.SnoozeToken;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * The snooze action of a reminder ("In 1 Stunde"). The service worker sends it without opening the app, so it cannot
 * read the CSRF cookie: a notification carries a token of its own instead, 32 random bytes stored only as their
 * SHA-256 hash. It snoozes once, until the end of the learner's day, and is replaced by the next notification of the
 * same kind.
 */
@Component
class ReminderSnoozes {

    private static final int TOKEN_BYTES = 32;

    private final SecureRandom random = new SecureRandom();
    private final ReminderStore reminders;
    private final Clock clock;

    ReminderSnoozes(ReminderStore reminders, Clock clock) {
        this.reminders = reminders;
        this.clock = clock;
    }

    /** A token for the notification and how it is stored. */
    record IssuedToken(String token, SnoozeToken stored) {
    }

    /** A token for a reminder sent now; empty if snoozing it would move it to tomorrow. */
    Optional<IssuedToken> issue(ZonedDateTime now) {
        if (ReminderPolicy.snoozedUntil(now, ReminderPolicy.SNOOZE).isEmpty()) {
            return Optional.empty();
        }
        byte[] bytes = new byte[TOKEN_BYTES];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        return Optional.of(new IssuedToken(token, new SnoozeToken(hash(token), ReminderPolicy.endOfDay(now).toInstant())));
    }

    SnoozeResponse snooze(String token, Duration snooze) {
        Instant now = clock.instant();
        String tokenHash = hash(token);
        SnoozableReminder reminder = reminders.bySnoozeToken(tokenHash)
                .filter(found -> now.isBefore(found.tokenExpiresAt()))
                .orElseThrow(ReminderSnoozes::invalidToken);
        Instant until = ReminderPolicy.snoozedUntil(now.atZone(reminder.zone()), snooze)
                .orElseThrow(() -> new ApiProblemException(HttpStatus.CONFLICT, "snooze_too_late",
                        "The snoozed reminder would come tomorrow."));
        if (!reminders.snooze(reminder.id(), tokenHash, until, now)) {
            throw invalidToken();
        }
        return new SnoozeResponse(until);
    }

    private static ApiProblemException invalidToken() {
        return new ApiProblemException(HttpStatus.NOT_FOUND, "snooze_token_invalid", "The reminder can no longer be snoozed.");
    }

    private static String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("Every Java platform supports SHA-256", e);
        }
    }
}
