package app.lumastar.core.reminder;

import app.lumastar.domain.Coded;

/** What {@link ReminderPolicy} decides to send a learner now. */
public enum Reminder implements Coded {
    NONE("none"),
    /** The reminder of the daily goal at the learner's chosen time. */
    DAILY_REMINDER("daily_reminder"),
    /** The streak rescue in the evening: missing today would end the streak. */
    STREAK_AT_RISK("streak_at_risk");

    private final String code;

    Reminder(String code) {
        this.code = code;
    }

    @Override
    public String code() {
        return code;
    }
}
