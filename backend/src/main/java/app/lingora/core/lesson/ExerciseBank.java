package app.lingora.core.lesson;

import app.lingora.domain.Exercise;
import app.lingora.domain.Level;
import app.lingora.domain.SkillTag;
import java.util.Collection;
import java.util.List;

/** The lesson exercises of all units, as far as the composer looks beyond the current unit (PRD F7). */
public interface ExerciseBank {

    /** Active lesson exercises carrying the tag, not above {@code maxLevel}, in a stable order. */
    List<Exercise> withSkillTag(SkillTag tag, Level maxLevel);

    /**
     * Active lesson exercises practising at least one of the items, of every level, in a stable order; reviews choose
     * the levels per item, see {@link MetContent}.
     */
    List<Exercise> withItems(Collection<String> itemIds);
}
