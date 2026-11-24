package app.lumastar.content;

/** Published after the startup seed, so that learner data can follow the changed content. */
public record ContentSeeded(SeedSummary summary) {
}
