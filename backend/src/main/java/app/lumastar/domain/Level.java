package app.lumastar.domain;

import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Optional;

/** Learning stage: A0 plus three sub-stages per CEFR band. The declaration order is the level order. */
public enum Level implements Coded {
    A0("A0", CefrBand.A0),
    A1_1("A1.1", CefrBand.A1),
    A1_2("A1.2", CefrBand.A1),
    A1_3("A1.3", CefrBand.A1),
    A2_1("A2.1", CefrBand.A2),
    A2_2("A2.2", CefrBand.A2),
    A2_3("A2.3", CefrBand.A2),
    B1_1("B1.1", CefrBand.B1),
    B1_2("B1.2", CefrBand.B1),
    B1_3("B1.3", CefrBand.B1),
    B2_1("B2.1", CefrBand.B2),
    B2_2("B2.2", CefrBand.B2),
    B2_3("B2.3", CefrBand.B2),
    C1_1("C1.1", CefrBand.C1),
    C1_2("C1.2", CefrBand.C1),
    C1_3("C1.3", CefrBand.C1),
    C2_1("C2.1", CefrBand.C2),
    C2_2("C2.2", CefrBand.C2),
    C2_3("C2.3", CefrBand.C2);

    private static final Level[] ORDERED = values();

    private final String code;
    private final CefrBand band;

    Level(String code, CefrBand band) {
        this.code = code;
        this.band = band;
    }

    public static Level fromCode(String code) {
        return Coded.fromCode(Level.class, code);
    }

    public static Level lowest() {
        return ORDERED[0];
    }

    public static Level highest() {
        return ORDERED[ORDERED.length - 1];
    }

    @JsonValue
    @Override
    public String code() {
        return code;
    }

    public CefrBand band() {
        return band;
    }

    public Optional<Level> next() {
        return this == highest() ? Optional.empty() : Optional.of(ORDERED[ordinal() + 1]);
    }

    public Optional<Level> previous() {
        return this == lowest() ? Optional.empty() : Optional.of(ORDERED[ordinal() - 1]);
    }

    public boolean isAbove(Level other) {
        return compareTo(other) > 0;
    }
}
