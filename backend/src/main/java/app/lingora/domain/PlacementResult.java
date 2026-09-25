package app.lingora.domain;

import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Outcome of the placement test: level, initial mastery per skill tag and the top strengths and weaknesses. */
public record PlacementResult(
        Level level,
        Map<SkillTag, Double> initialMastery,
        List<SkillTag> strengths,
        List<SkillTag> weaknesses) {

    public static final int TOP_COUNT = 3;

    public PlacementResult {
        Objects.requireNonNull(level, "level");
        initialMastery = Map.copyOf(initialMastery);
        strengths = List.copyOf(strengths);
        weaknesses = List.copyOf(weaknesses);
        Require.that(initialMastery.values().stream().allMatch(value -> value >= 0 && value <= 1),
                "initial mastery values must be between 0 and 1");
        Require.that(strengths.size() <= TOP_COUNT && weaknesses.size() <= TOP_COUNT,
                "at most %d strengths and %d weaknesses", TOP_COUNT, TOP_COUNT);
    }
}
