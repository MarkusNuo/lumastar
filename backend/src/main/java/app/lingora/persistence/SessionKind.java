package app.lingora.persistence;

import app.lingora.domain.Coded;

/** Kind of a learning session (table {@code sessions}); PRD F5 lessons, F7 focus lessons, F8 reviews, checkpoints. */
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
