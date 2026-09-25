package app.lingora.domain;

import com.fasterxml.jackson.annotation.JsonValue;

/** Exercise types of PRD F4. Only the P0 types have a content format and an {@link ExercisePayload} yet. */
public enum ExerciseType implements Coded {
    MULTIPLE_CHOICE("multiple_choice", Priority.P0),
    TRANSLATE_WORDBANK("translate_wordbank", Priority.P0),
    TRANSLATE_FREE("translate_free", Priority.P0),
    FILL_GAP("fill_gap", Priority.P0),
    MATCH_PAIRS("match_pairs", Priority.P0),
    WORD_ORDER("word_order", Priority.P0),
    CONJUGATION_DRILL("conjugation_drill", Priority.P1),
    DECLENSION_DRILL("declension_drill", Priority.P1),
    READING("reading", Priority.P1),
    FREE_WRITING("free_writing", Priority.P2),
    LISTEN_SELECT("listen_select", Priority.P2);

    public enum Priority { P0, P1, P2 }

    private final String code;
    private final Priority priority;

    ExerciseType(String code, Priority priority) {
        this.code = code;
        this.priority = priority;
    }

    public static ExerciseType fromCode(String code) {
        return Coded.fromCode(ExerciseType.class, code);
    }

    @JsonValue
    @Override
    public String code() {
        return code;
    }

    public Priority priority() {
        return priority;
    }

    public boolean isP0() {
        return priority == Priority.P0;
    }
}
