package app.lumastar.persistence;

import app.lumastar.domain.Coded;

/** Which bank an exercise belongs to: unit lessons or the placement test. */
public enum ExercisePool implements Coded {
    LESSON("lesson"),
    PLACEMENT("placement");

    private final String code;

    ExercisePool(String code) {
        this.code = code;
    }

    @Override
    public String code() {
        return code;
    }
}
