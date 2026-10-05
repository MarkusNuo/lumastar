package app.lingora.core.lesson;

import app.lingora.domain.SkillMastery;
import app.lingora.domain.SkillTag;
import app.lingora.domain.SkillTagErrorRate;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * The learner's weak skill tags, weakest first (PRD F7): first the tags with wrong answers in the last 14 days, most
 * wrong answers first, then the tags below {@value #WEAK_BELOW} mastery, lowest first.
 */
final class WeakSpots {

    /** Below the mastery at which the plan skips a unit as mastered (PRD F3). */
    static final double WEAK_BELOW = 0.8;

    private WeakSpots() {
    }

    static List<SkillTag> rank(LessonContext context, int limit) {
        Set<SkillTag> tags = new LinkedHashSet<>();
        context.recentErrorRates().stream()
                .filter(rate -> rate.wrong() > 0)
                .sorted(Comparator.comparingInt(SkillTagErrorRate::wrong).reversed()
                        .thenComparing(Comparator.comparingDouble(SkillTagErrorRate::errorRate).reversed())
                        .thenComparing(rate -> rate.tag().id()))
                .forEach(rate -> tags.add(rate.tag()));
        context.mastery().entries().entrySet().stream()
                .filter(entry -> entry.getValue().mastery() < WEAK_BELOW)
                .sorted(Comparator.comparingDouble((Map.Entry<SkillTag, SkillMastery.Entry> entry) -> entry.getValue().mastery())
                        .thenComparing(entry -> entry.getKey().id()))
                .forEach(entry -> tags.add(entry.getKey()));
        return tags.stream().limit(limit).toList();
    }
}
