package app.lingora.core.evaluation;

import app.lingora.domain.AnswerNormalizer;

/**
 * The diacritic tolerance of docs/CONTENT_FORMAT.md (point 4): a missing diacritic is tolerated, an added or wrong one
 * never, so {@code asht} stands for {@code âsht}, but {@code jâm} does not stand for {@code jam}.
 */
final class MissingDiacritics {

    private MissingDiacritics() {
    }

    /** Whether the written character is the expected one or its plain letter. */
    static boolean sameOrMissing(char written, char expected) {
        return written == expected || written == AnswerNormalizer.fold(expected);
    }

    /** Whether the normalised {@code written} text differs from {@code expected} in missing diacritics at most. */
    static boolean atMost(String written, String expected) {
        if (written.length() != expected.length()) {
            return false;
        }
        for (int i = 0; i < expected.length(); i++) {
            if (!sameOrMissing(written.charAt(i), expected.charAt(i))) {
                return false;
            }
        }
        return true;
    }
}
