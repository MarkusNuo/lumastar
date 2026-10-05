package app.lingora.api.lesson;

import app.lingora.api.auth.AccountService;
import app.lingora.api.auth.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/review")
@Tag(name = "review", description = "Spaced repetition with FSRS: due items and review lessons")
public class ReviewController {

    private final LessonService lessons;
    private final ReviewForecast forecast;
    private final AccountService accounts;

    ReviewController(LessonService lessons, ReviewForecast forecast, AccountService accounts) {
        this.lessons = lessons;
        this.forecast = forecast;
        this.accounts = accounts;
    }

    @GetMapping("/summary")
    @Operation(operationId = "getReviewSummary", summary = "Items due for review now and tomorrow")
    @ApiResponse(responseCode = "200", description = "The counts")
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public ReviewSummaryResponse getReviewSummary(@AuthenticationPrincipal AuthenticatedUser principal) {
        return forecast.summary(accounts.current(principal));
    }

    @PostMapping("/lessons")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(operationId = "startReviewLesson", summary = "Compose and start a review lesson of the due items",
            description = "Up to 12 exercises that practise the most overdue items, one exercise per item and mixed "
                    + "types, at or below the learner's level; an item met only above it, e.g. before a re-placement "
                    + "downwards, is practised on the lowest level with exercises of it. It is played like any lesson: "
                    + "answers go to POST /api/lessons/{sessionId}/attempts and it is finished with "
                    + "POST /api/lessons/{sessionId}/complete.")
    @ApiResponse(responseCode = "201", description = "The review lesson (kind review, unitId review)")
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Nothing is due, i.e. dueNow of the summary is 0 (code no_reviews_due)",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public LessonResponse startReviewLesson(@AuthenticationPrincipal AuthenticatedUser principal) {
        return lessons.startReview(accounts.current(principal));
    }
}
