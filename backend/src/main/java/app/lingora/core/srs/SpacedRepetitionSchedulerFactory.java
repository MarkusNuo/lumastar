package app.lingora.core.srs;

/** Creates the scheduler for one learner's settings. */
public interface SpacedRepetitionSchedulerFactory {

    SpacedRepetitionScheduler create(SrsSettings settings);

    /** The {@link SpacedRepetitionScheduler#version()} of the schedulers it creates, e.g. to pick matching weights. */
    String version();
}
