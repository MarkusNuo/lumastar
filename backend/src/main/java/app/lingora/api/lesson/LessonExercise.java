package app.lingora.api.lesson;

import app.lingora.domain.AnswerLang;
import app.lingora.domain.ErrorCategory;
import app.lingora.domain.Exercise;
import app.lingora.domain.ExercisePayload;
import app.lingora.domain.ExercisePayload.FillGap;
import app.lingora.domain.ExercisePayload.MatchPairs;
import app.lingora.domain.ExercisePayload.MultipleChoice;
import app.lingora.domain.ExercisePayload.TranslateFree;
import app.lingora.domain.ExercisePayload.TranslateWordbank;
import app.lingora.domain.ExercisePayload.WordOrder;
import app.lingora.domain.ExerciseType;
import app.lingora.domain.Level;
import app.lingora.domain.SkillTag;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/**
 * An exercise with everything the app needs to render it and to pre-check answers (PRD 11.2): the solutions and
 * accepted Standard forms are included on purpose. Fields that do not apply to the type are absent.
 */
public record LessonExercise(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String id,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) ExerciseType type,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Level level,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "1 (easy) to 3 (hard)") int difficulty,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Prompt prompt,
        @Schema(description = "Language of the answer; all types except multiple_choice and match_pairs") AnswerLang answerLang,
        @Schema(description = "multiple_choice (4 options) and fill_gap answered by picking a chip") List<String> choices,
        @Schema(description = "translate_wordbank: word chips including distractors") List<String> wordBank,
        @Schema(description = "word_order: the words of the first solution in the correct order; the app shuffles them")
        List<String> tokens,
        @Schema(description = "fill_gap: sentence with exactly one ___ gap") String text,
        @Schema(description = "match_pairs: 5 pairs; the app shuffles both sides") List<Pair> pairs,
        @Schema(description = "Accepted solutions, the first one is canonical; absent for match_pairs") List<String> solutions,
        @Schema(description = "Standard Albanian variants that count as correct with a hint (variant.standard_form)")
        List<String> standardForms,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Known wrong answers; the first one whose "
                + "pattern matches classifies a wrong answer. Typed answers (translate_free, fill_gap without choices) are "
                + "checked in this order: exact, Standard form, missing diacritics only, Standard form with missing "
                + "diacritics, errorHints, same words reordered (grammar.word_order), typo, wrong. Picked options: exact, "
                + "errorHints, wrong. Word tiles: exact, same tokens reordered (grammar.word_order), errorHints, wrong.")
        List<ErrorHint> errorHints,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "German explanation for the feedback sheet")
        String explanation,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<String> skillTags,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<String> itemIds,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "false until the author has checked the content")
        boolean reviewed) {

    @Schema(name = "ExercisePrompt")
    public record Prompt(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) AnswerLang lang,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String text) {
    }

    @Schema(name = "ExerciseErrorHint", description = "A typical wrong answer: pattern is a regular expression matched "
            + "case-insensitively (Unicode) against the normalised answer, diacritics kept (docs/CONTENT_FORMAT.md points 1–3)")
    public record ErrorHint(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String pattern,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) ErrorCategory category,
            @Schema(description = "German hint for the feedback sheet") String hint) {
    }

    @Schema(name = "ExercisePair", description = "A Gheg expression and its German meaning")
    public record Pair(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String left,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String right) {
    }

    private record TypeFields(AnswerLang answerLang, List<String> choices, List<String> wordBank, List<String> tokens,
                              String text, List<Pair> pairs, List<String> solutions, List<String> standardForms) {

        static TypeFields of(ExercisePayload payload) {
            return switch (payload) {
                case MultipleChoice p -> new TypeFields(null, p.choices(), null, null, null, null, p.solutions(), null);
                case TranslateWordbank p ->
                        new TypeFields(p.answerLang(), null, p.wordBank(), null, null, null, p.solutions(), null);
                case TranslateFree p -> new TypeFields(p.answerLang(), null, null, null, null, null, p.solutions(),
                        absentIfEmpty(p.standardForms()));
                case FillGap p -> new TypeFields(p.answerLang(), absentIfEmpty(p.choices()), null, null, p.text(), null,
                        p.solutions(), absentIfEmpty(p.standardForms()));
                case MatchPairs p -> new TypeFields(null, null, null, null, null,
                        p.pairs().stream().map(pair -> new Pair(pair.left(), pair.right())).toList(), null, null);
                case WordOrder p -> new TypeFields(p.answerLang(), null, null, p.tokens(), null, null, p.solutions(), null);
            };
        }

        private static List<String> absentIfEmpty(List<String> values) {
            return values.isEmpty() ? null : values;
        }
    }

    static LessonExercise of(Exercise exercise) {
        TypeFields fields = TypeFields.of(exercise.payload());
        return new LessonExercise(exercise.id(), exercise.type(), exercise.level(), exercise.difficulty(),
                new Prompt(exercise.prompt().lang(), exercise.prompt().text()), fields.answerLang(), fields.choices(),
                fields.wordBank(), fields.tokens(), fields.text(), fields.pairs(), fields.solutions(), fields.standardForms(),
                exercise.errorHints().stream().map(hint -> new ErrorHint(hint.pattern(), hint.category(), hint.hint())).toList(),
                exercise.explanation(), exercise.skillTags().stream().map(SkillTag::id).toList(), exercise.itemIds(),
                exercise.reviewed());
    }
}
