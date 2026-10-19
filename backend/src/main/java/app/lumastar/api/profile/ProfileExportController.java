package app.lumastar.api.profile;

import app.lumastar.api.auth.AccountService;
import app.lumastar.api.auth.AuthenticatedUser;
import app.lumastar.api.error.ApiProblemException;
import app.lumastar.api.error.Problems;
import app.lumastar.export.BackupExporter;
import app.lumastar.export.BackupFile;
import app.lumastar.export.BackupImporter;
import app.lumastar.export.BackupRejectedException;
import app.lumastar.export.ImportResult;
import app.lumastar.export.ProfileDocument;
import app.lumastar.export.ProfileDocuments;
import app.lumastar.export.RenderedDocument;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.io.IOException;
import java.io.InputStream;
import java.util.UUID;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/profile")
@Tag(name = "profile", description = "The signed-in learner")
public class ProfileExportController {

    private static final MediaType MARKDOWN = MediaType.parseMediaType(ProfileDocument.MARKDOWN);
    private static final String ZIP = "application/zip";

    private final ProfileDocuments documents;
    private final BackupExporter exporter;
    private final BackupImporter importer;
    private final AccountService accounts;

    ProfileExportController(ProfileDocuments documents, BackupExporter exporter, BackupImporter importer,
                            AccountService accounts) {
        this.documents = documents;
        this.exporter = exporter;
        this.importer = importer;
        this.accounts = accounts;
    }

    @GetMapping("/documents/{name}")
    @Operation(operationId = "getProfileDocument", summary = "One learner profile document",
            description = "Generated from the current learning state. The JSON documents are learner_profile.json, "
                    + "skill_mastery.json, recent_errors.json (last 50 errors) and learning_plan.json; "
                    + "learner_summary.md is Markdown.")
    @ApiResponse(responseCode = "200", description = "The document", content = {
            @Content(mediaType = ProfileDocument.JSON, schema = @Schema(types = {"object", "array"},
                    description = "JSON document; recent_errors.json is an array")),
            @Content(mediaType = "text/markdown", schema = @Schema(type = "string"))})
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "404", description = "Unknown document (code document_not_found)", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public ResponseEntity<byte[]> getProfileDocument(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Parameter(schema = @Schema(allowableValues = {"learner_profile.json", "skill_mastery.json", "recent_errors.json",
                    "learning_plan.json", "learner_summary.md"})) @PathVariable String name) {
        ProfileDocument document = ProfileDocument.byFileName(name).orElseThrow(() -> new ApiProblemException(
                HttpStatus.NOT_FOUND, "document_not_found", "There is no profile document '%s'.".formatted(name)));
        RenderedDocument rendered = documents.render(accountId(principal), document);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(document.mediaType())).body(rendered.content());
    }

    @GetMapping("/summary")
    @Operation(operationId = "getLearnerSummary", summary = "Compact Markdown summary for an AI chat",
            description = "learner_summary.md, for the button \"KI-Zusammenfassung kopieren\".")
    @ApiResponse(responseCode = "200", description = "The summary in German",
            content = @Content(mediaType = "text/markdown", schema = @Schema(type = "string")))
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public ResponseEntity<String> getLearnerSummary(@AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.ok().contentType(MARKDOWN).body(documents.summary(accountId(principal)));
    }

    @GetMapping("/export")
    @Operation(operationId = "exportProfile", summary = "Download the complete learning state as ZIP",
            description = "manifest.json, the profile documents under documents/ and all learner data under data/. "
                    + "The file name is lumastar-export-<yyyy-MM-dd>.zip.")
    @ApiResponse(responseCode = "200", description = "The export",
            content = @Content(mediaType = ZIP, schema = @Schema(type = "string", format = "binary")))
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public ResponseEntity<byte[]> exportProfile(@AuthenticationPrincipal AuthenticatedUser principal) {
        BackupFile export = exporter.export(accountId(principal));
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(ZIP))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(export.fileName()).build().toString())
                .body(export.content());
    }

    @PostMapping(path = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(operationId = "importProfile", summary = "Restore an export",
            description = "Replaces all learning data of the signed-in account with the content of the file in one "
                    + "transaction; the account (e-mail, password) stays. Exports of older versions are upgraded; an "
                    + "export of another account can be imported as well.")
    @ApiResponse(responseCode = "200", description = "The rows restored per table")
    @ApiResponse(responseCode = "400", description = "No file part (code bad_request)", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "401", description = "Not signed in", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "413", description = "File or unpacked content too large (code upload_too_large)",
            content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "422", description = "Not importable: invalid_backup_archive, unsupported_schema_version, "
            + "invalid_backup_data (with errors) or unknown_content_references (with unknownReferences)", content = @Content(
            mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    public ImportResult importProfile(@AuthenticationPrincipal AuthenticatedUser principal,
                                      @RequestPart("file") MultipartFile file) throws IOException {
        try (InputStream archive = file.getInputStream()) {
            return importer.importBackup(accountId(principal), archive, file.getSize());
        }
    }

    /** A session whose account no longer exists counts as not signed in. */
    private UUID accountId(AuthenticatedUser principal) {
        return accounts.current(principal).getId();
    }

    @ExceptionHandler(BackupRejectedException.class)
    ResponseEntity<ProblemDetail> handleRejectedBackup(BackupRejectedException rejection) {
        ProblemDetail problem = switch (rejection.reason()) {
            case TOO_LARGE -> Problems.of(HttpStatus.CONTENT_TOO_LARGE, Problems.UPLOAD_TOO_LARGE, rejection.getMessage());
            case INVALID_ARCHIVE -> Problems.of(HttpStatus.UNPROCESSABLE_CONTENT, "invalid_backup_archive", rejection.getMessage());
            case UNSUPPORTED_SCHEMA_VERSION ->
                    Problems.of(HttpStatus.UNPROCESSABLE_CONTENT, "unsupported_schema_version", rejection.getMessage());
            case INVALID_DATA -> Problems.of(HttpStatus.UNPROCESSABLE_CONTENT, "invalid_backup_data", rejection.getMessage());
            case UNKNOWN_CONTENT ->
                    Problems.of(HttpStatus.UNPROCESSABLE_CONTENT, "unknown_content_references", rejection.getMessage());
        };
        if (!rejection.issues().isEmpty()) {
            problem.setProperty("errors", rejection.issues());
        }
        if (rejection.unknownReferences() != null) {
            problem.setProperty("unknownReferences", rejection.unknownReferences());
        }
        return ResponseEntity.status(problem.getStatus()).body(problem);
    }
}
