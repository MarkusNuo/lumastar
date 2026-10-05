package app.lingora.api.settings;

import app.lingora.api.auth.AccountService;
import app.lingora.api.auth.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings")
@Tag(name = "settings", description = "Daily goal, FSRS target retention and time zone")
public class SettingsController {

    private final SettingsService settings;
    private final AccountService accounts;

    SettingsController(SettingsService settings, AccountService accounts) {
        this.settings = settings;
        this.accounts = accounts;
    }

    @GetMapping
    @Operation(operationId = "getSettings", summary = "The learner's settings")
    @ApiResponse(responseCode = "200", description = "The settings")
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public SettingsResponse getSettings(@AuthenticationPrincipal AuthenticatedUser principal) {
        return SettingsResponse.of(accounts.current(principal));
    }

    @PutMapping
    @Operation(operationId = "updateSettings", summary = "Change the settings",
            description = "A changed daily goal recalculates the time estimates of the plan, logged in the plan history "
                    + "(\"Tagesziel geändert: 10 → 15 Min. pro Tag\"). A lower goal or another time zone may meet today's "
                    + "goal and extend the streak.")
    @ApiResponse(responseCode = "200", description = "The settings as stored")
    @ApiResponse(responseCode = "400", description = "Invalid daily goal, target retention or time zone (code "
            + "validation_failed)", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public SettingsResponse updateSettings(@AuthenticationPrincipal AuthenticatedUser principal,
                                           @Valid @RequestBody SettingsRequest body) {
        return settings.update(accounts.current(principal).getId(), body);
    }
}
