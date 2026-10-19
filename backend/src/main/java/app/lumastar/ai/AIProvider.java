package app.lumastar.ai;

import app.lumastar.domain.AITask;
import app.lumastar.domain.LearnerContext;

/**
 * Phase 2 AI backend (e.g. a hosted model or a mock) that answers in a fixed, validated JSON schema (PRD 10.1, 10.2).
 * Not implemented in Phase 1.
 */
public interface AIProvider {

    <T> T generate(AITask task, LearnerContext context, Class<T> responseType);
}
