package app.lingora.core.placement;

import app.lingora.domain.Competence;
import app.lingora.domain.Level;
import app.lingora.domain.Outcome;
import app.lingora.domain.PlacementResult;
import app.lingora.domain.PlacementResult.CompetenceScore;
import app.lingora.domain.PlacementState.Step;
import app.lingora.domain.SkillTag;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * The details of a placement result, derived from the answers once the level is known.
 * <ul>
 *   <li><b>Initial mastery</b> per skill tag: the mean score of the answers carrying the tag. A correct answer (or a
 *       Standard form) scores {@value #CORRECT_AT_OR_ABOVE_LEVEL} on an item at or above the placed level and
 *       {@value #CORRECT_BELOW_LEVEL} on an easier one, an almost correct answer {@value #ALMOST_CORRECT_PENALTY}
 *       less, a wrong answer {@value #WRONG}.</li>
 *   <li><b>Strengths</b>: tags with an estimate of at least {@value #STRENGTH_THRESHOLD}, highest first; on a tie
 *       the tag proven on the harder item comes first.</li>
 *   <li><b>Weaknesses</b>: tags below {@value #WEAKNESS_THRESHOLD}, lowest first; on a tie the gap on the easier item
 *       comes first.</li>
 * </ul>
 */
final class PlacementEvaluation {

    static final double CORRECT_AT_OR_ABOVE_LEVEL = 0.9;
    static final double CORRECT_BELOW_LEVEL = 0.8;
    static final double ALMOST_CORRECT_PENALTY = 0.1;
    static final double WRONG = 0.3;
    static final double STRENGTH_THRESHOLD = 0.7;
    static final double WEAKNESS_THRESHOLD = 0.5;

    private PlacementEvaluation() {
    }

    private static final class TagEvidence {

        private double scoreSum;
        private int answers;
        private Level easiestItem;
        private Level hardestItem;

        void add(double score, Level itemLevel) {
            scoreSum += score;
            answers++;
            easiestItem = easiestItem == null || easiestItem.isAbove(itemLevel) ? itemLevel : easiestItem;
            hardestItem = hardestItem == null || itemLevel.isAbove(hardestItem) ? itemLevel : hardestItem;
        }

        double estimate() {
            return Math.round(scoreSum / answers * 100) / 100.0;
        }
    }

    static PlacementResult evaluate(Level placedLevel, List<Step> steps) {
        Map<SkillTag, TagEvidence> evidence = new HashMap<>();
        for (Step step : steps) {
            double score = score(step, placedLevel);
            step.skillTags().forEach(tag -> evidence.computeIfAbsent(tag, key -> new TagEvidence()).add(score, step.level()));
        }
        Map<SkillTag, Double> estimates = evidence.entrySet().stream()
                .collect(Collectors.toMap(Map.Entry::getKey, entry -> entry.getValue().estimate()));
        return new PlacementResult(placedLevel, estimates, strengths(evidence), weaknesses(evidence),
                competenceScores(steps));
    }

    private static double score(Step step, Level placedLevel) {
        if (step.outcome() == Outcome.WRONG) {
            return WRONG;
        }
        double correct = placedLevel.isAbove(step.level()) ? CORRECT_BELOW_LEVEL : CORRECT_AT_OR_ABOVE_LEVEL;
        return step.outcome() == Outcome.ALMOST_CORRECT ? correct - ALMOST_CORRECT_PENALTY : correct;
    }

    private static List<SkillTag> strengths(Map<SkillTag, TagEvidence> evidence) {
        return evidence.entrySet().stream()
                .filter(entry -> entry.getValue().estimate() >= STRENGTH_THRESHOLD)
                .sorted(Comparator.<Map.Entry<SkillTag, TagEvidence>>comparingDouble(entry -> -entry.getValue().estimate())
                        .thenComparing(entry -> entry.getValue().hardestItem, Comparator.reverseOrder())
                        .thenComparing(entry -> entry.getKey().id()))
                .limit(PlacementResult.TOP_COUNT)
                .map(Map.Entry::getKey)
                .toList();
    }

    private static List<SkillTag> weaknesses(Map<SkillTag, TagEvidence> evidence) {
        return evidence.entrySet().stream()
                .filter(entry -> entry.getValue().estimate() < WEAKNESS_THRESHOLD)
                .sorted(Comparator.<Map.Entry<SkillTag, TagEvidence>>comparingDouble(entry -> entry.getValue().estimate())
                        .thenComparing(entry -> entry.getValue().easiestItem)
                        .thenComparing(entry -> entry.getKey().id()))
                .limit(PlacementResult.TOP_COUNT)
                .map(Map.Entry::getKey)
                .toList();
    }

    private static Map<Competence, CompetenceScore> competenceScores(List<Step> steps) {
        Map<Competence, CompetenceScore> scores = new EnumMap<>(Competence.class);
        for (Step step : steps) {
            CompetenceScore before = scores.get(step.competence());
            int answered = before == null ? 1 : before.answered() + 1;
            int correct = (before == null ? 0 : before.correct()) + (step.outcome().isAccepted() ? 1 : 0);
            scores.put(step.competence(), new CompetenceScore(answered, correct));
        }
        return scores;
    }
}
