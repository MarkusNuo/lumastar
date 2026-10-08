package app.lingora.api.streak;

import app.lingora.persistence.StreakDayKind;
import com.fasterxml.jackson.annotation.JsonValue;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "met: the daily goal was met; frozen: a missed day bridged by the streak freeze (yesterday "
        + "included while the freeze bridges it)")
public enum StreakDayStatus {
    MET("met"),
    FROZEN("frozen");

    private final String code;

    StreakDayStatus(String code) {
        this.code = code;
    }

    @JsonValue
    public String code() {
        return code;
    }

    static StreakDayStatus of(StreakDayKind kind) {
        return switch (kind) {
            case GOAL_MET -> MET;
            case FREEZE -> FROZEN;
        };
    }
}
