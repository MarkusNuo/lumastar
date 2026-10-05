package app.lingora.core.srs;

/** Creates the scheduler for one learner's settings. */
@FunctionalInterface
public interface SpacedRepetitionSchedulerFactory {

    SpacedRepetitionScheduler create(SrsSettings settings);
}
