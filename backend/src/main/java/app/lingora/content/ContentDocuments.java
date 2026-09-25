package app.lingora.content;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.util.List;

/**
 * JSON documents of {@code /content} exactly as described in docs/CONTENT_FORMAT.md. Codes stay strings here so
 * that an unknown value is reported with its location instead of aborting the whole file.
 */
final class ContentDocuments {

    static final int SCHEMA_VERSION = 1;

    private static final String REQUIRED = "is required";
    private static final String UNSUPPORTED_SCHEMA_VERSION = "must be " + SCHEMA_VERSION;

    private ContentDocuments() {
    }

    record CurriculumFile(
            @NotNull(message = REQUIRED) @Min(value = SCHEMA_VERSION, message = UNSUPPORTED_SCHEMA_VERSION)
            @Max(value = SCHEMA_VERSION, message = UNSUPPORTED_SCHEMA_VERSION) Integer schemaVersion,
            @NotBlank(message = REQUIRED) String variety,
            @NotNull(message = REQUIRED) List<@NotNull(message = REQUIRED) @Valid StageDocument> stages) {
    }

    record StageDocument(
            @NotBlank(message = REQUIRED) String level,
            @NotBlank(message = REQUIRED) String title,
            List<@NotNull(message = REQUIRED) @Valid UnitDocument> units) {
    }

    record UnitDocument(
            @NotBlank(message = REQUIRED) String id,
            @NotBlank(message = REQUIRED) String title,
            String description,
            List<@NotBlank(message = REQUIRED) String> goals,
            List<@NotBlank(message = REQUIRED) String> skillTags,
            String color,
            String icon,
            @Positive(message = "must be positive") Integer estimatedLessons,
            String file) {
    }

    record SkillTagsFile(
            @NotNull(message = REQUIRED) @Min(value = SCHEMA_VERSION, message = UNSUPPORTED_SCHEMA_VERSION)
            @Max(value = SCHEMA_VERSION, message = UNSUPPORTED_SCHEMA_VERSION) Integer schemaVersion,
            @NotNull(message = REQUIRED) List<@NotNull(message = REQUIRED) @Valid SkillTagDocument> tags) {
    }

    record SkillTagDocument(
            @NotBlank(message = REQUIRED) String id,
            @NotBlank(message = REQUIRED) String label,
            @NotBlank(message = REQUIRED) String area) {
    }

    record UnitFile(
            @NotNull(message = REQUIRED) @Min(value = SCHEMA_VERSION, message = UNSUPPORTED_SCHEMA_VERSION)
            @Max(value = SCHEMA_VERSION, message = UNSUPPORTED_SCHEMA_VERSION) Integer schemaVersion,
            @NotBlank(message = REQUIRED) String unitId,
            @NotBlank(message = REQUIRED) String level,
            List<@NotNull(message = REQUIRED) @Valid GrammarDocument> grammar,
            List<@NotNull(message = REQUIRED) @Valid ItemDocument> items,
            List<@NotNull(message = REQUIRED) @Valid ExerciseDocument> exercises) {
    }

    record GrammarDocument(
            @NotBlank(message = REQUIRED) String title,
            @NotBlank(message = REQUIRED) String explanation) {
    }

    record ItemDocument(
            @NotBlank(message = REQUIRED) String id,
            @NotBlank(message = REQUIRED) String kind,
            @NotBlank(message = REQUIRED) String gheg,
            @NotBlank(message = REQUIRED) String de,
            String partOfSpeech,
            String gender,
            String definite,
            String plural,
            List<@NotBlank(message = REQUIRED) String> alternatives,
            String note,
            Boolean reviewed) {
    }

    record PlacementFile(
            @NotNull(message = REQUIRED) @Min(value = SCHEMA_VERSION, message = UNSUPPORTED_SCHEMA_VERSION)
            @Max(value = SCHEMA_VERSION, message = UNSUPPORTED_SCHEMA_VERSION) Integer schemaVersion,
            @NotNull(message = REQUIRED) List<@NotNull(message = REQUIRED) @Valid ExerciseDocument> exercises) {
    }

    /** Common and type-specific exercise fields in one flat document, as in the content files. */
    record ExerciseDocument(
            @NotBlank(message = REQUIRED) String id,
            @NotBlank(message = REQUIRED) String type,
            @NotBlank(message = REQUIRED) String level,
            @NotNull(message = REQUIRED) @Min(value = 1, message = "must be between 1 and 3")
            @Max(value = 3, message = "must be between 1 and 3") Integer difficulty,
            @NotEmpty(message = "needs at least one skill tag") List<@NotBlank(message = REQUIRED) String> skillTags,
            List<@NotBlank(message = REQUIRED) String> itemIds,
            String competence,
            @NotNull(message = REQUIRED) @Valid PromptDocument prompt,
            @NotBlank(message = REQUIRED) String explanation,
            List<@NotNull(message = REQUIRED) @Valid ErrorHintDocument> errorHints,
            Boolean reviewed,
            String source,
            String note,
            String answerLang,
            List<String> choices,
            List<String> solutions,
            List<String> wordBank,
            List<String> standardForms,
            String text,
            List<@NotNull(message = REQUIRED) @Valid PairDocument> pairs,
            List<String> tokens) {
    }

    record PromptDocument(
            @NotBlank(message = REQUIRED) String lang,
            @NotBlank(message = REQUIRED) String text) {
    }

    record ErrorHintDocument(
            @NotBlank(message = REQUIRED) String pattern,
            @NotBlank(message = REQUIRED) String category,
            String hint) {
    }

    record PairDocument(
            @NotBlank(message = REQUIRED) String left,
            @NotBlank(message = REQUIRED) String right) {
    }
}
