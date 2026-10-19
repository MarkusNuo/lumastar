package app.lumastar.core.plan;

import app.lumastar.domain.SkillMastery;
import app.lumastar.domain.SkillMastery.Entry;
import app.lumastar.domain.SkillTag;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * The mastery a plan may skip or shorten units by: only tags backed by at least {@value #MIN_FIRST_ANSWERS}
 * first answers from at least {@value #MIN_LESSONS} lessons. A few lucky answers, and placement estimates alone, never
 * skip a unit at or above the placed stage, the only units a plan holds.
 */
public final class ProvenMastery {

    public static final int MIN_FIRST_ANSWERS = 8;
    public static final int MIN_LESSONS = 2;

    private ProvenMastery() {
    }

    /** @param lessonsByTag the number of lessons with first answers per skill tag */
    public static SkillMastery of(SkillMastery mastery, Map<SkillTag, Integer> lessonsByTag) {
        return new SkillMastery(mastery.entries().entrySet().stream()
                .filter(entry -> isProven(entry.getValue(), lessonsByTag.getOrDefault(entry.getKey(), 0)))
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue)));
    }

    private static boolean isProven(Entry entry, int lessons) {
        return entry.attempts() >= MIN_FIRST_ANSWERS && lessons >= MIN_LESSONS;
    }
}
