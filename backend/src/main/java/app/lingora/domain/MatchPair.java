package app.lingora.domain;

/** A Gheg expression ({@code left}) and its German meaning ({@code right}). */
public record MatchPair(String left, String right) {

    public MatchPair {
        Require.notBlank(left, "left side of a pair");
        Require.notBlank(right, "right side of a pair");
    }
}
