package app.lumastar.ai;

import app.lumastar.domain.AITask;
import app.lumastar.domain.LearnerContext;

/**
 * An LLM provider for the planned AI integration (e.g. a hosted model or a mock) that answers in a fixed,
 * validated JSON schema. Not implemented yet.
 */
public interface AIProvider {

    <T> T generate(AITask task, LearnerContext context, Class<T> responseType);
}
