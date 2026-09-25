package app.lingora.api.placement;

import app.lingora.api.lesson.LessonExercise;
import app.lingora.domain.AnswerLang;
import app.lingora.domain.Competence;
import app.lingora.domain.Exercise;
import app.lingora.domain.ExercisePayload.FillGap;
import app.lingora.domain.ExercisePayload.MatchPairs;
import app.lingora.domain.ExercisePayload.MultipleChoice;
import app.lingora.domain.ExercisePayload.TranslateFree;
import app.lingora.domain.ExercisePayload.TranslateWordbank;
import app.lingora.domain.ExercisePayload.WordOrder;
import app.lingora.domain.ExerciseType;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;

/**
 * A placement item as the learner sees it. Unlike a lesson exercise it carries no solutions, accepted variants or
 * explanation, since the placement test gives no feedback; choices, word chips and word-order tokens come shuffled.
 */
@Schema(description = "A placement item without solutions or explanation; choices, word chips and tokens are shuffled. "
        + "Fields that do not apply to the type are absent. The answer is sent like a lesson answer (SubmittedAnswer).")
public record PlacementItem(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String id,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED,
                description = "multiple_choice, fill_gap, translate_wordbank, translate_free or word_order") ExerciseType type,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Competence competence,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) LessonExercise.Prompt prompt,
        @Schema(description = "Language of the answer; all types except multiple_choice") AnswerLang answerLang,
        @Schema(description = "multiple_choice (4 options) and fill_gap answered by picking a chip") List<String> choices,
        @Schema(description = "translate_wordbank: word chips including distractors") List<String> wordBank,
        @Schema(description = "word_order: the words to put in order") List<String> tokens,
        @Schema(description = "fill_gap: sentence with exactly one ___ gap") String text,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "false until the author has checked the content")
        boolean reviewed) {

    /** The shuffle depends only on {@code seed}, so the same item always looks the same within one test. */
    static PlacementItem of(Exercise item, long seed) {
        Random random = new Random(seed);
        LessonExercise.Prompt prompt = new LessonExercise.Prompt(item.prompt().lang(), item.prompt().text());
        return switch (item.payload()) {
            case MultipleChoice p -> new PlacementItem(item.id(), item.type(), item.competence(), prompt, null,
                    shuffled(p.choices(), random), null, null, null, item.reviewed());
            case FillGap p -> new PlacementItem(item.id(), item.type(), item.competence(), prompt, p.answerLang(),
                    p.choices().isEmpty() ? null : shuffled(p.choices(), random), null, null, p.text(), item.reviewed());
            case TranslateWordbank p -> new PlacementItem(item.id(), item.type(), item.competence(), prompt, p.answerLang(),
                    null, shuffled(p.wordBank(), random), null, null, item.reviewed());
            case TranslateFree p -> new PlacementItem(item.id(), item.type(), item.competence(), prompt, p.answerLang(),
                    null, null, null, null, item.reviewed());
            case WordOrder p -> new PlacementItem(item.id(), item.type(), item.competence(), prompt, p.answerLang(),
                    null, null, shuffled(p.tokens(), random), null, item.reviewed());
            case MatchPairs p -> throw new IllegalArgumentException("match_pairs cannot be a placement item: " + item.id());
        };
    }

    private static List<String> shuffled(List<String> values, Random random) {
        List<String> copy = new ArrayList<>(values);
        Collections.shuffle(copy, random);
        return copy;
    }
}
