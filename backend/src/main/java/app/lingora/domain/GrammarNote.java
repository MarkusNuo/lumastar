package app.lingora.domain;

/** Grammar explanation of a unit; {@code explanation} is German Markdown. */
public record GrammarNote(String title, String explanation) {

    public GrammarNote {
        Require.notBlank(title, "grammar note title");
        Require.notBlank(explanation, "grammar note explanation");
    }
}
