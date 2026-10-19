package app.lumastar.api.reminder;

import app.lumastar.api.auth.AccountService;
import app.lumastar.api.auth.AuthenticatedUser;
import app.lumastar.persistence.ReminderStore;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.Clock;
import java.util.UUID;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reminders")
@Tag(name = "reminders", description = "Daily reminder and streak rescue by web push")
public class ReminderController {

    private final ReminderStore reminders;
    private final ReminderSnoozes snoozes;
    private final AccountService accounts;
    private final Clock clock;

    ReminderController(ReminderStore reminders, ReminderSnoozes snoozes, AccountService accounts, Clock clock) {
        this.reminders = reminders;
        this.snoozes = snoozes;
        this.accounts = accounts;
        this.clock = clock;
    }

    @GetMapping
    @Operation(operationId = "getReminders", summary = "The learner's reminders")
    @ApiResponse(responseCode = "200", description = "The reminder settings; off until the learner switches them on")
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public ReminderSettingsResponse getReminders(@AuthenticationPrincipal AuthenticatedUser principal) {
        return ReminderSettingsResponse.of(reminders.settings(accounts.current(principal).getId()));
    }

    @PutMapping
    @Operation(operationId = "updateReminders", summary = "Change the reminders",
            description = "Reminders go to every device registered with POST /api/push/subscriptions, at most one daily "
                    + "reminder and one streak rescue a day (plus one per snooze), and none once the daily goal is met.")
    @ApiResponse(responseCode = "200", description = "The reminder settings as stored")
    @ApiResponse(responseCode = "400", description = "Missing field, invalid time or a rescue time not after the daily "
            + "time (code validation_failed)", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public ReminderSettingsResponse updateReminders(@AuthenticationPrincipal AuthenticatedUser principal,
                                                    @Valid @RequestBody ReminderSettingsRequest body) {
        UUID userId = accounts.current(principal).getId();
        reminders.save(userId, body.toSettings(), clock.instant());
        return ReminderSettingsResponse.of(reminders.settings(userId));
    }

    @PostMapping("/snooze")
    @SecurityRequirements
    @Operation(operationId = "snoozeReminder", summary = "Get a reminder again later (notification action \"In 1 Stunde\")",
            description = "For the service worker: needs neither the session nor the CSRF header, only the snoozeToken of "
                    + "the notification. It snoozes once, until the end of the learner's day, and is replaced by the next "
                    + "notification of the same kind. The reminder comes again unless the daily goal is met by then.")
    @ApiResponse(responseCode = "200", description = "Snoozed")
    @ApiResponse(responseCode = "400", description = "No token or minutes out of range (code validation_failed)",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "404", description = "Unknown, used, replaced or expired token (code snooze_token_invalid)",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "The reminder would come tomorrow (code snooze_too_late)",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public SnoozeResponse snoozeReminder(@Valid @RequestBody SnoozeRequest body) {
        return snoozes.snooze(body.token(), body.snooze());
    }
}
