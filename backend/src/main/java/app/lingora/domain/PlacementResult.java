package app.lingora.domain;

import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Outcome of the placement test: level, initial mastery per skill tag, the top strengths and weaknesses and the
 * answers per competence. {@code competenceScores} holds only the competences that were tested.
 */
public record PlacementResult(
        Level level,
        Map<SkillTag, Double> initialMastery,
        List<SkillTag> strengths,
        List<SkillTag> weaknesses,
        Map<Competence, CompetenceScore> competenceScores) {

    public static final int TOP_COUNT = 3;

    public PlacementResult {
        Objects.requireNonNull(level, "level");
        initialMastery = Map.copyOf(initialMastery);
        strengths = List.copyOf(strengths);
        weaknesses = List.copyOf(weaknesses);
        competenceScores = Map.copyOf(competenceScores);
        Require.that(initialMastery.values().stream().allMatch(value -> value >= 0 && value <= 1),
                "initial mastery values must be between 0 and 1");
        Require.that(strengths.size() <= TOP_COUNT && weaknesses.size() <= TOP_COUNT,
                "at most %d strengths and %d weaknesses", TOP_COUNT, TOP_COUNT);
    }

    /** The result of a skipped test: the given level without any estimate. */
    public static PlacementResult withoutAnswers(Level level) {
        return new PlacementResult(level, Map.of(), List.of(), List.of(), Map.of());
    }

    /** Placement items answered in one competence and how many of them counted as correct. */
    public record CompetenceScore(int answered, int correct) {

        public CompetenceScore {
            Require.that(answered > 0 && correct >= 0 && correct <= answered,
                    "correct (%d) must be between 0 and answered (%d)", correct, answered);
        }
    }
}
