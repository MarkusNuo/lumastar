package app.lumastar.core.evaluation;

import app.lumastar.domain.AnswerLang;
import app.lumastar.domain.ErrorHint;
import app.lumastar.domain.Exercise;
import app.lumastar.domain.ExercisePayload;
import app.lumastar.domain.ExerciseSource;
import app.lumastar.domain.Level;
import app.lumastar.domain.MatchPair;
import app.lumastar.domain.Prompt;
import app.lumastar.domain.SkillTag;
import java.util.List;

/** Small exercises for evaluator tests; the explanation is always {@link #EXPLANATION}. */
final class TestExercises {

    static final String EXPLANATION = "Erklärung zur Aufgabe.";

    private TestExercises() {
    }

    static Exercise translateFree(List<String> solutions, List<String> standardForms, ErrorHint... hints) {
        return exercise(new ExercisePayload.TranslateFree(AnswerLang.GHEG, solutions, standardForms), List.of("vocab.home"), hints);
    }

    static Exercise translateFreeTagged(List<String> solutions, String... tags) {
        return exercise(new ExercisePayload.TranslateFree(AnswerLang.GHEG, solutions, List.of()), List.of(tags));
    }

    static Exercise germanTranslation(List<String> solutions, List<String> wordBank, ErrorHint... hints) {
        return exercise(new ExercisePayload.TranslateWordbank(AnswerLang.GERMAN, solutions, wordBank), List.of("vocab.greetings"), hints);
    }

    static Exercise wordBank(List<String> solutions, List<String> wordBank, ErrorHint... hints) {
        return exercise(new ExercisePayload.TranslateWordbank(AnswerLang.GHEG, solutions, wordBank), List.of("vocab.greetings"), hints);
    }

    static Exercise wordOrder(List<String> tokens, List<String> solutions, ErrorHint... hints) {
        return exercise(new ExercisePayload.WordOrder(AnswerLang.GHEG, tokens, solutions), List.of("phrase.small_talk"), hints);
    }

    static Exercise typedGap(List<String> solutions, List<String> standardForms) {
        return exercise(new ExercisePayload.FillGap(AnswerLang.GHEG, "Nâna ___ në shpi.", solutions, List.of(), standardForms),
                List.of("grammar.verbs.jam"));
    }

    static Exercise choiceGap(List<String> solutions, List<String> choices, ErrorHint... hints) {
        return exercise(new ExercisePayload.FillGap(AnswerLang.GHEG, "Nâna ___ në shpi.", solutions, choices, List.of()),
                List.of("vocab.family"), hints);
    }

    static Exercise multipleChoice(List<String> choices, String solution, List<String> tags, ErrorHint... hints) {
        return exercise(new ExercisePayload.MultipleChoice(choices, List.of(solution)), tags, hints);
    }

    static Exercise matchPairs() {
        return exercise(new ExercisePayload.MatchPairs(List.of(new MatchPair("po", "ja"), new MatchPair("jo", "nein"),
                new MatchPair("mirëdita", "guten Tag"), new MatchPair("faleminderit", "danke"),
                new MatchPair("mirupafshim", "auf Wiedersehen"))), List.of("vocab.greetings"));
    }

    private static Exercise exercise(ExercisePayload payload, List<String> tags, ErrorHint... hints) {
        return new Exercise("ex_test_unit_001", Level.A1_1, 1, tags.stream().map(SkillTag::of).toList(), List.of(), null,
                new Prompt(AnswerLang.GERMAN, "Übersetze."), EXPLANATION, List.of(hints), ExerciseSource.MANUAL, false, null,
                payload);
    }
}
