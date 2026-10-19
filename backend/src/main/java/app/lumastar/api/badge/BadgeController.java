package app.lumastar.api.badge;

import app.lumastar.api.auth.AccountService;
import app.lumastar.api.auth.AuthenticatedUser;
import app.lumastar.persistence.BadgeStore;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/badges")
@Tag(name = "badges", description = "Level badges A1 … C2")
public class BadgeController {

    private final BadgeStore badges;
    private final AccountService accounts;

    BadgeController(BadgeStore badges, AccountService accounts) {
        this.badges = badges;
        this.accounts = accounts;
    }

    @GetMapping
    @Transactional(readOnly = true)
    @Operation(operationId = "getBadges", summary = "The level badges earned so far, in band order",
            description = "The schema LevelBadge lists every badge there is, so that the app can show the ones still to earn.")
    @ApiResponse(responseCode = "200", description = "The earned badges; empty before the first one")
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public List<BadgeResponse> getBadges(@AuthenticationPrincipal AuthenticatedUser principal) {
        return badges.badges(accounts.current(principal).getId()).stream()
                .map(badge -> new BadgeResponse(badge.badge(), badge.awardedAt()))
                .toList();
    }
}
