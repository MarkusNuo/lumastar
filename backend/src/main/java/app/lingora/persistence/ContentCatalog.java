package app.lingora.persistence;

import app.lingora.domain.Exercise;
import app.lingora.domain.Item;
import app.lingora.domain.Unit;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Reads seeded content as domain records for the engines. */
@Component
public class ContentCatalog {

    private final UnitRepository units;
    private final ItemRepository items;
    private final ExerciseRepository exercises;
    private final ExercisePayloadCodec payloadCodec;

    public ContentCatalog(UnitRepository units, ItemRepository items, ExerciseRepository exercises,
                          ExercisePayloadCodec payloadCodec) {
        this.units = units;
        this.items = items;
        this.exercises = exercises;
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
