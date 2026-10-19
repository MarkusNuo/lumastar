package app.lumastar.domain;

import com.fasterxml.jackson.annotation.JsonValue;

/** Tasks an AI provider performs in the planned AI integration. */
public enum AITask implements Coded {
    PLACEMENT("placement"),
    PLAN("plan"),
    GENERATE_EXERCISES("generate_exercises"),
    EVALUATE_FREE_TEXT("evaluate_free_text"),
    EXPLAIN("explain");

    private final String code;

    AITask(String code) {
        this.code = code;
    }

    @JsonValue
    @Override
    public String code() {
        return code;
    }
}
