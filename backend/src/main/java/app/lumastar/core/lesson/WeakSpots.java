package app.lumastar.core.lesson;

import app.lumastar.domain.SkillMastery;
import app.lumastar.domain.SkillTag;
import app.lumastar.domain.SkillTagErrorRate;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * The learner's weak skill tags, weakest first: first the tags with wrong answers in the
 * {@linkplain SkillTagErrorRate#RECENT_PERIOD recent period}, most wrong answers first, then the tags not yet
 * {@linkplain SkillMastery#MASTERED mastered}, lowest mastery first.
 */
final class WeakSpots {

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
                .filter(entry -> !entry.getValue().isMastered())
                .sorted(Comparator.comparingDouble((Map.Entry<SkillTag, SkillMastery.Entry> entry) -> entry.getValue().mastery())
                        .thenComparing(entry -> entry.getKey().id()))
                .forEach(entry -> tags.add(entry.getKey()));
        return tags.stream().limit(limit).toList();
    }
}
