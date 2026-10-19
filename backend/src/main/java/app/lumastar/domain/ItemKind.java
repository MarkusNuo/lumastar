package app.lumastar.domain;

import com.fasterxml.jackson.annotation.JsonValue;

/** Kind of learnable item. */
public enum ItemKind implements Coded {
    WORD("word"),
    PHRASE("phrase"),
    GRAMMAR("grammar");

    private final String code;

    ItemKind(String code) {
        this.code = code;
    }

    public static ItemKind fromCode(String code) {
        return Coded.fromCode(ItemKind.class, code);
    }

    @JsonValue
    @Override
    public String code() {
        return code;
    }
}
