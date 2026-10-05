package app.lingora.persistence;

import app.lingora.domain.Coded;

/** Why a day counted for the streak (table {@code streak_days}). */
public enum StreakDayKind implements Coded {
    GOAL_MET("goal_met"),
    /** A missed day bridged by the weekly streak freeze. */
    FREEZE("freeze");

    private final String code;

    StreakDayKind(String code) {
        this.code = code;
    }

    @Override
    public String code() {
        return code;
    }
}
