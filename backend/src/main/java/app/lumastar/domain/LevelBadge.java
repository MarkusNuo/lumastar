package app.lumastar.domain;

import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Optional;

/** The badge for completing a CEFR band by its checkpoints; A0 has none. */
public enum LevelBadge implements Coded {
    A1(CefrBand.A1),
    A2(CefrBand.A2),
    B1(CefrBand.B1),
    B2(CefrBand.B2),
    C1(CefrBand.C1),
    C2(CefrBand.C2);

    private final CefrBand band;

    LevelBadge(CefrBand band) {
        this.band = band;
    }

    public static Optional<LevelBadge> of(CefrBand band) {
        for (LevelBadge badge : values()) {
            if (badge.band == band) {
                return Optional.of(badge);
            }
        }
        return Optional.empty();
    }

    @JsonValue
    @Override
    public String code() {
        return name();
    }

    public CefrBand band() {
        return band;
    }
}
