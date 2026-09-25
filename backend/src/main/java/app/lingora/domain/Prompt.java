package app.lingora.domain;

import java.util.Objects;

/** The task text shown to the learner. */
public record Prompt(AnswerLang lang, String text) {

    public Prompt {
        Objects.requireNonNull(lang, "prompt language");
        Require.notBlank(text, "prompt text");
    }
}
