package app.lingora.api.push;

import app.lingora.api.auth.AccountService;
import app.lingora.api.auth.AuthenticatedUser;
import app.lingora.push.PushSetup;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/push")
@Tag(name = "push", description = "Web push: the learner's devices and a test notification")
public class PushController {

    private final PushDevices devices;
    private final PushSetup setup;
    private final AccountService accounts;

    PushController(PushDevices devices, PushSetup setup, AccountService accounts) {
        this.devices = devices;
        this.setup = setup;
        this.accounts = accounts;
    }

    @GetMapping("/config")
    @Operation(operationId = "getPushConfig", summary = "Whether web push is available, and the key to subscribe with")
    @ApiResponse(responseCode = "200", description = "The web push configuration")
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public PushConfigResponse getPushConfig() {
        return new PushConfigResponse(setup.available(), setup.publicKey().orElse(null));
    }

    @GetMapping("/subscriptions")
    @Operation(operationId = "listPushSubscriptions", summary = "The learner's devices that get reminders, oldest first")
    @ApiResponse(responseCode = "200", description = "The devices")
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public List<PushDeviceResponse> listPushSubscriptions(@AuthenticationPrincipal AuthenticatedUser principal) {
        return devices.of(principal.userId()).stream().map(PushDeviceResponse::of).toList();
    }

    @PostMapping("/subscriptions")
    @Operation(operationId = "subscribePush", summary = "Register this device for reminders",
            description = "Send it after pushManager.subscribe() and again on every app start, since browsers may renew "
                    + "a subscription. A known endpoint is updated; one that another account registered moves to this "
                    + "account (one browser profile has one subscription). Remove it before signing out on a shared "
                    + "device. Endpoints must belong to a known push service (Google, Mozilla, Apple, Microsoft) and use "
                    + "HTTPS on its default port. An account has a limited number of devices (10 by default): registering "
                    + "another removes the one subscribed or reached the longest time ago.")
    @ApiResponse(responseCode = "200", description = "The registered device")
    @ApiResponse(responseCode = "400", description = "Invalid keys (code validation_failed) or an endpoint of an unknown "
            + "push service (code push_service_not_supported)", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "This server does not send web push (code push_unavailable)",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public PushDeviceResponse subscribePush(@AuthenticationPrincipal AuthenticatedUser principal,
                                            @Valid @RequestBody PushSubscriptionRequest body) {
        return PushDeviceResponse.of(devices.subscribe(accounts.current(principal).getId(), body));
    }

    @DeleteMapping("/subscriptions")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(operationId = "unsubscribePush", summary = "Stop reminders on this device",
            description = "Idempotent; another account's subscription with the endpoint is left alone.")
    @ApiResponse(responseCode = "204", description = "The device gets no more reminders")
    @ApiResponse(responseCode = "400", description = "No endpoint (code validation_failed)", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public void unsubscribePush(@AuthenticationPrincipal AuthenticatedUser principal,
                                @Valid @RequestBody PushUnsubscribeRequest body) {
        devices.unsubscribe(principal.userId(), body.endpoint());
    }

    @PostMapping("/test")
    @Operation(operationId = "sendTestPush", summary = "Send a test notification to all the learner's devices",
            description = "At most 10 per hour.")
    @ApiResponse(responseCode = "200", description = "Sent; the counts say how the delivery went")
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "No web push on this server (code push_unavailable) or no device "
            + "registered (code no_push_devices)", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "429", description = "Too many test notifications (code too_many_requests)", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public PushTestResponse sendTestPush(@AuthenticationPrincipal AuthenticatedUser principal) {
        return devices.sendTest(accounts.current(principal).getId());
    }
}
