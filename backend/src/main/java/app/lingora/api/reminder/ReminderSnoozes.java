package app.lingora.api.reminder;

import app.lingora.api.error.ApiProblemException;
import app.lingora.core.reminder.ReminderPolicy;
import app.lingora.persistence.ReminderStore;
import app.lingora.persistence.ReminderStore.SnoozableReminder;
import app.lingora.persistence.ReminderStore.SnoozeToken;
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
 * SHA-256 hash, valid until the end of the learner's day and replaced by the next notification of the same kind.
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
        SnoozableReminder reminder = reminders.bySnoozeToken(hash(token))
                .filter(found -> now.isBefore(found.tokenExpiresAt()))
                .orElseThrow(() -> new ApiProblemException(HttpStatus.NOT_FOUND, "snooze_token_invalid",
                        "The reminder can no longer be snoozed."));
        Instant until = ReminderPolicy.snoozedUntil(now.atZone(reminder.zone()), snooze)
                .orElseThrow(() -> new ApiProblemException(HttpStatus.CONFLICT, "snooze_too_late",
                        "The snoozed reminder would come tomorrow."));
        reminders.snooze(reminder.id(), until);
        return new SnoozeResponse(until);
    }

    private static String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("Every Java platform supports SHA-256", e);
        }
    }
}
