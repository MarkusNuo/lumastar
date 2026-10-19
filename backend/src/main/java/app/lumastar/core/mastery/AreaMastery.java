package app.lumastar.core.mastery;

import app.lumastar.domain.SkillArea;
import app.lumastar.domain.SkillMastery;
import app.lumastar.domain.SkillMastery.Entry;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.OptionalDouble;

/**
 * Mastery per area for the statistics (PRD F10): the average of the skill tags of the area that have a mastery value,
 * practised or estimated by the placement test.
 *
 * @param average empty while no tag of the area has a value
 */
public record AreaMastery(SkillArea area, int skillTags, OptionalDouble average) {

    /** One entry per area, in the order of {@link SkillArea}; pass the effective (decayed) mastery. */
    public static List<AreaMastery> of(SkillMastery mastery) {
        return Arrays.stream(SkillArea.values()).map(area -> of(area, mastery)).toList();
    }

    private static AreaMastery of(SkillArea area, SkillMastery mastery) {
        List<Double> values = mastery.entries().entrySet().stream()
                .filter(entry -> entry.getKey().area() == area)
                .map(Map.Entry::getValue)
                .map(Entry::mastery)
                .toList();
        return new AreaMastery(area, values.size(), values.stream().mapToDouble(Double::doubleValue).average());
    }
}
