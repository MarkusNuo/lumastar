package app.lingora.domain;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Type-specific part of an exercise (docs/CONTENT_FORMAT.md). Each record enforces the rules of its type.
 * {@code solutions} hold Gheg forms only; Standard Albanian forms go to {@code standardForms}.
 */
public sealed interface ExercisePayload {

    ExerciseType type();

    record MultipleChoice(List<String> choices, List<String> solutions) implements ExercisePayload {

        public MultipleChoice {
            choices = Require.listOrEmpty(choices);
            solutions = Require.listOrEmpty(solutions);
            Require.that(choices.size() == 4, "multiple_choice needs exactly 4 choices, found %d", choices.size());
            Require.allNotBlank(choices, "choices");
            Require.distinct(choices, "choices");
            Require.that(solutions.size() == 1, "multiple_choice needs exactly 1 solution, found %d", solutions.size());
            Require.that(choices.contains(solutions.getFirst()), "solution '%s' is not one of the choices", solutions.getFirst());
        }

        @Override
        public ExerciseType type() {
            return ExerciseType.MULTIPLE_CHOICE;
        }
    }

    record TranslateWordbank(AnswerLang answerLang, List<String> solutions, List<String> wordBank) implements ExercisePayload {

        private static final int MIN_DISTRACTORS = 2;
        private static final int MAX_DISTRACTORS = 4;

        public TranslateWordbank {
            Objects.requireNonNull(answerLang, "answerLang");
            solutions = requireSolutions(solutions);
            wordBank = Require.listOrEmpty(wordBank);
            List<String> solutionWords = Words.of(solutions.getFirst());
            List<String> bankWords = Words.of(wordBank);
            Require.that(containsAll(bankWords, solutionWords),
                    "wordBank must contain every word of '%s'", solutions.getFirst());
            int distractors = bankWords.size() - solutionWords.size();
            Require.that(distractors >= MIN_DISTRACTORS && distractors <= MAX_DISTRACTORS,
                    "wordBank needs %d–%d distractors besides the words of the first solution, found %d",
                    MIN_DISTRACTORS, MAX_DISTRACTORS, distractors);
        }

        @Override
        public ExerciseType type() {
            return ExerciseType.TRANSLATE_WORDBANK;
        }

        private static boolean containsAll(List<String> bank, List<String> required) {
            Map<String, Integer> available = new HashMap<>();
            bank.forEach(word -> available.merge(word, 1, Integer::sum));
            return required.stream().allMatch(word -> available.merge(word, -1, Integer::sum) >= 0);
        }
    }

    record TranslateFree(AnswerLang answerLang, List<String> solutions, List<String> standardForms) implements ExercisePayload {

        public TranslateFree {
            Objects.requireNonNull(answerLang, "answerLang");
            solutions = requireSolutions(solutions);
            standardForms = Require.listOrEmpty(standardForms);
        }

        @Override
        public ExerciseType type() {
            return ExerciseType.TRANSLATE_FREE;
        }
    }

    record FillGap(AnswerLang answerLang, String text, List<String> solutions, List<String> choices,
                   List<String> standardForms) implements ExercisePayload {

        public static final String GAP = "___";

        public FillGap {
            Objects.requireNonNull(answerLang, "answerLang");
            Require.notBlank(text, "text");
            Require.that(text.split(GAP, -1).length == 2, "text must contain exactly one gap '%s': '%s'", GAP, text);
            solutions = requireSolutions(solutions);
            choices = Require.listOrEmpty(choices);
            standardForms = Require.listOrEmpty(standardForms);
            Require.that(choices.isEmpty() || choices.contains(solutions.getFirst()),
                    "choices must contain the first solution '%s'", solutions.getFirst());
        }

        @Override
        public ExerciseType type() {
            return ExerciseType.FILL_GAP;
        }
    }

    record MatchPairs(List<MatchPair> pairs) implements ExercisePayload {

        public static final int PAIR_COUNT = 5;

        public MatchPairs {
            pairs = Require.listOrEmpty(pairs);
            Require.that(pairs.size() == PAIR_COUNT, "match_pairs needs exactly %d pairs, found %d", PAIR_COUNT, pairs.size());
            Require.distinct(pairs.stream().map(MatchPair::left).toList(), "left sides of the pairs");
            Require.distinct(pairs.stream().map(MatchPair::right).toList(), "right sides of the pairs");
        }

        @Override
        public ExerciseType type() {
            return ExerciseType.MATCH_PAIRS;
        }
    }

    record WordOrder(AnswerLang answerLang, List<String> tokens, List<String> solutions) implements ExercisePayload {

        public WordOrder {
            Objects.requireNonNull(answerLang, "answerLang");
            tokens = Require.listOrEmpty(tokens);
            solutions = requireSolutions(solutions);
            Require.notEmpty(tokens, "tokens");
            Require.that(Words.of(tokens).equals(Words.of(solutions.getFirst())),
                    "tokens %s must be the words of '%s' in order", tokens, solutions.getFirst());
        }

        @Override
        public ExerciseType type() {
            return ExerciseType.WORD_ORDER;
        }
    }

    private static List<String> requireSolutions(List<String> solutions) {
        List<String> copy = Require.listOrEmpty(solutions);
        Require.notEmpty(copy, "solutions");
        Require.allNotBlank(copy, "solutions");
        return copy;
    }
}
