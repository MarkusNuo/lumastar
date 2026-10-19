package app.lumastar.domain;

import com.fasterxml.jackson.annotation.JsonValue;

/**
 * The learner's own estimate in the onboarding (PRD F1), with the German option text. It sets the level at which
 * the first placement test starts; "Ich kann kein Wort" may skip the test and start at A0.
 */
public enum SelfAssessment implements Coded {
    NOTHING("nothing", "Ich kann kein Wort", Level.A0),
    FEW_WORDS("few_words", "Ich kenne ein paar Wörter", Level.A1_1),
    SIMPLE_SENTENCES("simple_sentences", "Ich kann einfache Sätze bilden", Level.A1_3),
    EVERYDAY_CONVERSATION("everyday_conversation", "Ich kann mich im Alltag unterhalten", Level.A2_2),
    UNDERSTAND_MUCH("understand_much", "Ich verstehe viel, will aber besser schreiben", Level.B1_2);

    private final String code;
    private final String label;
    private final Level startLevel;

    SelfAssessment(String code, String label, Level startLevel) {
        this.code = code;
        this.label = label;
        this.startLevel = startLevel;
    }

    public static SelfAssessment fromCode(String code) {
        return Coded.fromCode(SelfAssessment.class, code);
    }

    @JsonValue
    @Override
    public String code() {
        return code;
    }

    public String label() {
        return label;
    }

    public Level startLevel() {
        return startLevel;
    }

    /** Only an absolute beginner may skip the first placement test (PRD F1). */
    public boolean allowsSkippingPlacement() {
        return this == NOTHING;
    }
}
