package app.lumastar.domain;

import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Where the learner stands in the first-start journey: the profile questions of the onboarding, then the
 * placement test (or its skip), then done.
 */
public enum OnboardingStep implements Coded {
    PROFILE("profile"),
    PLACEMENT("placement"),
    DONE("done");

    private final String code;

    OnboardingStep(String code) {
        this.code = code;
    }

    @JsonValue
    @Override
    public String code() {
        return code;
    }
}
