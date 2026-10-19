package app.lumastar.core.plan;

import app.lumastar.domain.SkillTag;
import java.util.Objects;

/** A focus unit asked for by one lesson, because the learner answered {@code wrongAnswers} exercises of the tag wrongly. */
public record FocusRequest(SkillTag tag, int wrongAnswers) {

    public FocusRequest {
        Objects.requireNonNull(tag, "tag");
        if (wrongAnswers < 1) {
            throw new IllegalArgumentException("a focus request needs wrong answers");
        }
    }
}
