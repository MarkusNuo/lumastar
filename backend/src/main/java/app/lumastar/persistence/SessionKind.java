package app.lumastar.persistence;

import app.lumastar.domain.Coded;

/**
 * Kind of a learning session (table {@code sessions}): PRD F5 lessons, F7 focus lessons, F8 reviews, checkpoints and
 * F10 practice lessons on a chosen skill tag.
 */
public enum SessionKind implements Coded {
    LESSON("lesson"),
    FOCUS("focus"),
    REVIEW("review"),
    CHECKPOINT("checkpoint"),
    PRACTICE("practice");

    private final String code;

    SessionKind(String code) {
        this.code = code;
    }

    @Override
    public String code() {
        return code;
    }
}
