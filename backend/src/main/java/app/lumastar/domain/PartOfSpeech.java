package app.lumastar.domain;

import com.fasterxml.jackson.annotation.JsonValue;

public enum PartOfSpeech implements Coded {
    NOUN("noun"),
    VERB("verb"),
    ADJECTIVE("adjective"),
    ADVERB("adverb"),
    PRONOUN("pronoun"),
    PREPOSITION("preposition"),
    CONJUNCTION("conjunction"),
    NUMERAL("numeral"),
    INTERJECTION("interjection"),
    PARTICLE("particle"),
    PHRASE("phrase"),
    OTHER("other");

    private final String code;

    PartOfSpeech(String code) {
        this.code = code;
    }

    public static PartOfSpeech fromCode(String code) {
        return Coded.fromCode(PartOfSpeech.class, code);
    }

    @JsonValue
    @Override
    public String code() {
        return code;
    }
}
