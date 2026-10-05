package app.lingora.api.content;

import app.lingora.core.evaluation.StandardFormLexicon;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Duration;
import org.springframework.http.CacheControl;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/content")
@Tag(name = "content", description = "Content shared by the backend evaluator and the app's pre-check")
public class StandardFormsController {

    // The lexicon changes only with a new content release, i.e. a restart.
    private static final CacheControl ONE_DAY = CacheControl.maxAge(Duration.ofDays(1)).cachePrivate();

    private final StandardFormsResponse standardForms;

    StandardFormsController(StandardFormLexicon lexicon) {
        this.standardForms = StandardFormsResponse.of(lexicon);
    }

    @GetMapping("/standard-forms")
    @Operation(operationId = "getStandardForms", summary = "The Standard-form lexicon for the pre-check",
            description = "The rules with which the evaluator recognises Standard Albanian words in typed Gheg answers "
                    + "(correct_standard_form, variant.standard_form). An answer is a Standard form if it has as many words "
                    + "as a solution and every word that differs from the solution's word at the same position is a Standard "
                    + "form of it. A second pass after the missing-diacritics check also lets the other words lack "
                    + "diacritics and compares the Standard forms folded. Cacheable for a day.")
    @ApiResponse(responseCode = "200", description = "The lexicon")
    @ApiResponse(responseCode = "401", description = "Not signed in",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public ResponseEntity<StandardFormsResponse> standardForms() {
        return ResponseEntity.ok().cacheControl(ONE_DAY).body(standardForms);
    }
}
