package app.lingora.core.evaluation;

import app.lingora.core.evaluation.FeedbackHints.WordSwap;
import app.lingora.domain.AnswerLang;
import app.lingora.domain.ErrorCategory;
import app.lingora.domain.ErrorHint;
import app.lingora.domain.EvaluationResult;
import app.lingora.domain.Exercise;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.function.Predicate;

/**
 * Tolerant check of a typed or assembled sentence (PRD F5, LANGUAGE_GUIDE section 11), in this order: exact match,
 * Standard form, missing diacritics, Standard form without diacritics, known error, word order, typo, wrong.
 */
final class TextAnswerCheck {

    private static final String CIRCUMFLEX_VOWELS = "âêîôû";
    private static final int ONE_TYPO_MIN_LETTERS = 6;
    private static final int TWO_TYPOS_MIN_LETTERS = 16;

    private final StandardFormLexicon lexicon;

    /** What a text exercise accepts: {@code standardForms} are complete Standard Albanian variants of a solution. */
    record Expected(AnswerLang answerLang, List<String> solutions, List<String> standardForms) {
    }

    TextAnswerCheck(StandardFormLexicon lexicon) {
        this.lexicon = lexicon;
    }

    EvaluationResult evaluate(Exercise exercise, Expected expected, String text) {
        Phrase answer = Phrase.of(text);
        List<Phrase> solutions = expected.solutions().stream().map(Phrase::of).toList();
        List<Phrase> standardForms = expected.standardForms().stream().map(Phrase::of).toList();
        boolean gheg = expected.answerLang() == AnswerLang.GHEG;

        Optional<Phrase> exact = first(solutions, solution -> solution.normalized().equals(answer.normalized()));
        if (exact.isPresent()) {
            return Results.correct(exercise, exact.get().text());
        }
        Optional<EvaluationResult> standardForm = standardForm(exercise, answer, solutions, standardForms, gheg, false);
        if (standardForm.isPresent()) {
            return standardForm.get();
        }
        Optional<Phrase> withoutDiacritics = first(solutions, solution -> solution.folded().equals(answer.folded()));
        if (withoutDiacritics.isPresent()) {
            return missingDiacritics(exercise, answer, withoutDiacritics.get());
        }
        Optional<EvaluationResult> foldedStandardForm = standardForm(exercise, answer, solutions, standardForms, gheg, true);
        if (foldedStandardForm.isPresent()) {
            return foldedStandardForm.get();
        }
        return mistake(exercise, answer, solutions);
    }

    private Optional<EvaluationResult> standardForm(Exercise exercise, Phrase answer, List<Phrase> solutions,
                                                    List<Phrase> standardForms, boolean gheg, boolean folded) {
        Optional<Phrase> listed = first(standardForms, form -> form(form, folded).equals(form(answer, folded)));
        if (listed.isPresent()) {
            Phrase solution = closest(solutions, answer);
            return Optional.of(Results.standardForm(exercise, solution.text(),
                    FeedbackHints.standardForm(swaps(answer, solution), solution.text())));
        }
        if (!gheg) {
            return Optional.empty();
        }
        for (Phrase solution : solutions) {
            Optional<List<WordSwap>> swaps = lexiconSwaps(answer, solution, folded);
            if (swaps.isPresent()) {
                return Optional.of(Results.standardForm(exercise, solution.text(),
                        FeedbackHints.standardForm(swaps.get(), solution.text())));
            }
        }
        return Optional.empty();
    }

    /** The word swaps if every word that differs from the solution is a Standard form of the solution word. */
    private Optional<List<WordSwap>> lexiconSwaps(Phrase answer, Phrase solution, boolean folded) {
        List<String> answerWords = folded ? answer.foldedWords() : answer.words();
        List<String> solutionWords = folded ? solution.foldedWords() : solution.words();
        if (answerWords.size() != solutionWords.size()) {
            return Optional.empty();
        }
        List<WordSwap> swaps = new ArrayList<>();
        for (int i = 0; i < answerWords.size(); i++) {
            if (answerWords.get(i).equals(solutionWords.get(i))) {
                continue;
            }
            if (!lexicon.isStandardFormOf(answerWords.get(i), solutionWords.get(i), folded)) {
                return Optional.empty();
            }
            swaps.add(new WordSwap(solution.words().get(i), answer.words().get(i)));
        }
        return Optional.of(swaps);
    }

    private static EvaluationResult missingDiacritics(Exercise exercise, Phrase answer, Phrase solution) {
        boolean circumflexMissing = false;
        boolean otherDiacriticMissing = false;
        for (int i = 0; i < solution.normalized().length(); i++) {
            char expected = solution.normalized().charAt(i);
            if (answer.normalized().charAt(i) != expected) {
                if (CIRCUMFLEX_VOWELS.indexOf(expected) >= 0) {
                    circumflexMissing = true;
                } else {
                    otherDiacriticMissing = true;
                }
            }
        }
        List<String> words = differingWords(answer, solution);
        // LANGUAGE_GUIDE section 11: a missing circumflex together with a missing ë or ç counts as spelling.diacritics.
        return circumflexMissing && !otherDiacriticMissing
                ? Results.almostCorrect(exercise, ErrorCategory.SPELLING_NASAL_VOWEL, solution.text(), FeedbackHints.missingCircumflex(words))
                : Results.almostCorrect(exercise, ErrorCategory.SPELLING_DIACRITICS, solution.text(), FeedbackHints.missingDiacritics(words));
    }

    /** Known errors and reorderings are real mistakes, so they are classified before any typo tolerance. */
    private static EvaluationResult mistake(Exercise exercise, Phrase answer, List<Phrase> solutions) {
        Phrase closest = closest(solutions, answer);
        Optional<ErrorHint> hint = WrongAnswers.matchingHint(exercise, answer.normalized());
        if (hint.isPresent()) {
            return Results.wrong(exercise, hint.get().category(), closest.text(), hint.get().hint());
        }
        if (solutions.stream().anyMatch(solution -> isReordering(answer, solution))) {
            return Results.wrong(exercise, ErrorCategory.GRAMMAR_WORD_ORDER, closest.text(), FeedbackHints.wordOrder());
        }
        List<Phrase> withinTypoTolerance = solutions.stream().filter(solution -> isTypo(answer, solution)).toList();
        if (!withinTypoTolerance.isEmpty()) {
            Phrase solution = closest(withinTypoTolerance, answer);
            return Results.almostCorrect(exercise, ErrorCategory.SPELLING_OTHER, solution.text(),
                    FeedbackHints.typo(differingWords(answer, solution)));
        }
        return Results.wrong(exercise, WrongAnswers.categoryFromSkillTags(exercise, ErrorCategory.VOCAB_UNKNOWN),
                closest.text(), null);
    }

    private static boolean isReordering(Phrase answer, Phrase solution) {
        return sorted(answer.foldedWords()).equals(sorted(solution.foldedWords()));
    }

    private static boolean isTypo(Phrase answer, Phrase solution) {
        int letters = solution.letterCount();
        int allowedEdits = letters >= TWO_TYPOS_MIN_LETTERS ? 2 : letters >= ONE_TYPO_MIN_LETTERS ? 1 : 0;
        return allowedEdits > 0 && EditDistance.between(answer.folded(), solution.folded()) <= allowedEdits;
    }

    /** The solution words the answer got wrong, or the whole solution if the word counts differ. */
    private static List<String> differingWords(Phrase answer, Phrase solution) {
        if (answer.words().size() != solution.words().size()) {
            return List.of(solution.text());
        }
        List<String> differing = new ArrayList<>();
        for (int i = 0; i < solution.words().size(); i++) {
            if (!answer.words().get(i).equals(solution.words().get(i))) {
                differing.add(solution.writtenWord(i));
            }
        }
        return differing;
    }

    private static List<WordSwap> swaps(Phrase answer, Phrase solution) {
        if (answer.words().size() != solution.words().size()) {
            return List.of();
        }
        List<WordSwap> swaps = new ArrayList<>();
        for (int i = 0; i < solution.words().size(); i++) {
            if (!answer.words().get(i).equals(solution.words().get(i))) {
                swaps.add(new WordSwap(solution.words().get(i), answer.words().get(i)));
            }
        }
        return swaps;
    }

    /** The solution with the fewest edits to the answer; the earlier solution wins a tie. */
    private static Phrase closest(List<Phrase> solutions, Phrase answer) {
        Phrase closest = solutions.getFirst();
        int fewestEdits = EditDistance.between(answer.folded(), closest.folded());
        for (Phrase solution : solutions.subList(1, solutions.size())) {
            int edits = EditDistance.between(answer.folded(), solution.folded());
            if (edits < fewestEdits) {
                closest = solution;
                fewestEdits = edits;
            }
        }
        return closest;
    }

    private static String form(Phrase phrase, boolean folded) {
        return folded ? phrase.folded() : phrase.normalized();
    }

    private static List<String> sorted(List<String> words) {
        return words.stream().sorted().toList();
    }

    private static Optional<Phrase> first(List<Phrase> phrases, Predicate<Phrase> condition) {
        return phrases.stream().filter(condition).findFirst();
    }
}
