package app.lingora.core.evaluation;

/**
 * Damerau-Levenshtein distance in its optimal-string-alignment form: insertions, deletions, substitutions and swaps of
 * two adjacent characters each cost one edit. A written character that {@link CharacterMatch} accepts for the expected
 * one costs nothing.
 */
final class EditDistance {

    /** Whether a written character counts as the expected one. */
    @FunctionalInterface
    interface CharacterMatch {

        boolean matches(char written, char expected);
    }

    private EditDistance() {
    }

    static int between(String written, String expected, CharacterMatch match) {
        int[] beforePrevious = new int[expected.length() + 1];
        int[] previous = new int[expected.length() + 1];
        int[] current = new int[expected.length() + 1];
        for (int j = 0; j <= expected.length(); j++) {
            previous[j] = j;
        }
        for (int i = 1; i <= written.length(); i++) {
            current[0] = i;
            for (int j = 1; j <= expected.length(); j++) {
                int substitution = match.matches(written.charAt(i - 1), expected.charAt(j - 1)) ? 0 : 1;
                int distance = Math.min(Math.min(previous[j] + 1, current[j - 1] + 1), previous[j - 1] + substitution);
                if (i > 1 && j > 1 && match.matches(written.charAt(i - 1), expected.charAt(j - 2))
                        && match.matches(written.charAt(i - 2), expected.charAt(j - 1))) {
                    distance = Math.min(distance, beforePrevious[j - 2] + 1);
                }
                current[j] = distance;
            }
            int[] recycled = beforePrevious;
            beforePrevious = previous;
            previous = current;
            current = recycled;
        }
        return previous[expected.length()];
    }
}
