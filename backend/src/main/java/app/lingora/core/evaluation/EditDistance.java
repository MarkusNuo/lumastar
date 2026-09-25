package app.lingora.core.evaluation;

/**
 * Damerau-Levenshtein distance in its optimal-string-alignment form: insertions, deletions, substitutions and swaps of
 * two adjacent characters each cost one edit.
 */
final class EditDistance {

    private EditDistance() {
    }

    static int between(String a, String b) {
        int[] beforePrevious = new int[b.length() + 1];
        int[] previous = new int[b.length() + 1];
        int[] current = new int[b.length() + 1];
        for (int j = 0; j <= b.length(); j++) {
            previous[j] = j;
        }
        for (int i = 1; i <= a.length(); i++) {
            current[0] = i;
            for (int j = 1; j <= b.length(); j++) {
                int substitution = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
                int distance = Math.min(Math.min(previous[j] + 1, current[j - 1] + 1), previous[j - 1] + substitution);
                if (i > 1 && j > 1 && a.charAt(i - 1) == b.charAt(j - 2) && a.charAt(i - 2) == b.charAt(j - 1)) {
                    distance = Math.min(distance, beforePrevious[j - 2] + 1);
                }
                current[j] = distance;
            }
            int[] recycled = beforePrevious;
            beforePrevious = previous;
            previous = current;
            current = recycled;
        }
        return previous[b.length()];
    }
}
