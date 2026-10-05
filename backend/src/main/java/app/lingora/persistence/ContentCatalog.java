package app.lingora.persistence;

import app.lingora.core.lesson.ExerciseBank;
import app.lingora.domain.Exercise;
import app.lingora.domain.Item;
import app.lingora.domain.Level;
import app.lingora.domain.SkillTag;
import app.lingora.domain.Stage;
import app.lingora.domain.Unit;
import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Reads seeded content as domain records for the engines; it is the composer's bank of all units (PRD F7). */
@Component
public class ContentCatalog implements ExerciseBank {

    private final StageRepository stages;
    private final UnitRepository units;
    private final ItemRepository items;
    private final ExerciseRepository exercises;
    private final SkillTagRepository skillTags;
    private final ExercisePayloadCodec payloadCodec;

    public ContentCatalog(StageRepository stages, UnitRepository units, ItemRepository items, ExerciseRepository exercises,
                          SkillTagRepository skillTags, ExercisePayloadCodec payloadCodec) {
        this.stages = stages;
        this.units = units;
        this.items = items;
        this.exercises = exercises;
        this.skillTags = skillTags;
        this.payloadCodec = payloadCodec;
    }

    /** An active unit with its active items and lesson exercises; a unit without exercises is a skeleton. */
    @Transactional(readOnly = true)
    public Optional<Unit> activeUnit(String unitId) {
        return units.findByIdAndRetiredAtIsNull(unitId).map(unit -> unit.toUnit(
                items.findByUnitIdAndRetiredAtIsNull(unitId).stream().map(ItemEntity::toItem).toList(),
                exercises.findByUnitIdAndPoolAndOwnerUserIdIsNullAndRetiredAtIsNullOrderById(unitId, ExercisePool.LESSON)
                        .stream().map(this::toExercise).toList()));
    }

    /**
     * The active stages with their units in path order, as an outline for the plan: the units carry their tags and
     * lesson estimates but neither items nor exercises.
     */
    @Transactional(readOnly = true)
    public List<Stage> curriculumOutline() {
        Map<Level, List<Unit>> unitsByLevel = units.findByRetiredAtIsNullOrderByPosition().stream()
                .collect(Collectors.groupingBy(UnitEntity::getLevel,
                        Collectors.mapping(unit -> unit.toUnit(List.of(), List.of()), Collectors.toList())));
        return stages.findByRetiredAtIsNullOrderByPosition().stream()
                .map(stage -> new Stage(stage.getLevel(), stage.getTitle(), unitsByLevel.getOrDefault(stage.getLevel(), List.of())))
                .toList();
    }

    /** German labels of all registered skill tags, retired ones included, since old answers still carry them. */
    @Transactional(readOnly = true)
    public Map<SkillTag, String> skillTagLabels() {
        return skillTags.findAll().stream()
                .collect(Collectors.toMap(tag -> SkillTag.of(tag.getId()), SkillTagEntity::getLabel));
    }

    /** The active items of the placement test. */
    @Transactional(readOnly = true)
    public List<Exercise> placementBank() {
        return exercises.findByPoolAndOwnerUserIdIsNullAndRetiredAtIsNullOrderById(ExercisePool.PLACEMENT).stream()
                .map(this::toExercise)
                .toList();
    }

    /** Active lesson exercises of any unit that carry the skill tag and are not above {@code maxLevel}. */
    @Transactional(readOnly = true)
    public List<Exercise> lessonExercisesWithSkillTag(SkillTag tag, Level maxLevel) {
        return exercises.findLessonExercisesWithSkillTag(tag.id(), levelsUpTo(maxLevel)).stream().map(this::toExercise).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Exercise> withSkillTag(SkillTag tag, Level maxLevel) {
        return lessonExercisesWithSkillTag(tag, maxLevel);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Exercise> withItems(Collection<String> itemIds, Level maxLevel) {
        return exercises.findLessonExercisesWithItems(itemIds.toArray(String[]::new), levelsUpTo(maxLevel)).stream()
                .map(this::toExercise)
                .toList();
    }

    /** The skill tags that active lesson exercises not above {@code maxLevel} practise. */
    @Transactional(readOnly = true)
    public Set<SkillTag> lessonSkillTags(Level maxLevel) {
        return exercises.findLessonSkillTags(levelsUpTo(maxLevel)).stream().map(SkillTag::of).collect(Collectors.toSet());
    }

    private static String[] levelsUpTo(Level maxLevel) {
        return Arrays.stream(Level.values()).filter(level -> !level.isAbove(maxLevel)).map(Level::code).toArray(String[]::new);
    }

    /** Exercises by id, retired ones included, because lessons and attempts keep referring to them. */
    @Transactional(readOnly = true)
    public Map<String, Exercise> exercises(Collection<String> ids) {
        return exercises.findAllById(ids).stream()
                .map(this::toExercise)
                .collect(Collectors.toMap(Exercise::id, Function.identity()));
    }

    @Transactional(readOnly = true)
    public List<Item> items(Collection<String> ids) {
        return items.findAllById(ids).stream().map(ItemEntity::toItem).toList();
    }

    private Exercise toExercise(ExerciseEntity entity) {
        return entity.toExercise(payloadCodec.fromJson(entity.getType(), entity.getPayload()));
    }
}
