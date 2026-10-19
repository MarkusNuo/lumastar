package app.lumastar.content;

import app.lumastar.domain.Exercise;
import app.lumastar.domain.Item;
import app.lumastar.domain.Stage;
import app.lumastar.domain.Unit;
import app.lumastar.persistence.ExerciseEntity;
import app.lumastar.persistence.ExercisePayloadCodec;
import app.lumastar.persistence.ExercisePool;
import app.lumastar.persistence.ExerciseRepository;
import app.lumastar.persistence.ItemEntity;
import app.lumastar.persistence.ItemRepository;
import app.lumastar.persistence.SeededContentEntity;
import app.lumastar.persistence.SkillTagEntity;
import app.lumastar.persistence.SkillTagRepository;
import app.lumastar.persistence.StageEntity;
import app.lumastar.persistence.StageRepository;
import app.lumastar.persistence.UnitEntity;
import app.lumastar.persistence.UnitRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.BiConsumer;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.util.stream.Stream;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Upserts a validated {@link ContentBundle} in one transaction. Unchanged rows are not written, so a second run
 * leaves the database untouched. Global rows missing from the bundle are retired; exercises generated for a
 * single learner ({@code owner_user_id} set) are never touched.
 */
@Service
public class ContentSeeder {

    private final SkillTagRepository skillTags;
    private final StageRepository stages;
    private final UnitRepository units;
    private final ItemRepository items;
    private final ExerciseRepository exercises;
    private final ExercisePayloadCodec payloadCodec;
    private final Clock clock;

    private record Positioned<T>(T value, int position) {
    }

    private record UnitItem(Item item, String unitId) {
    }

    private record PooledExercise(Exercise exercise, ExercisePool pool, String unitId) {
    }

    public ContentSeeder(SkillTagRepository skillTags, StageRepository stages, UnitRepository units, ItemRepository items,
                         ExerciseRepository exercises, ExercisePayloadCodec payloadCodec, Clock clock) {
        this.skillTags = skillTags;
        this.stages = stages;
        this.units = units;
        this.items = items;
        this.exercises = exercises;
        this.payloadCodec = payloadCodec;
        this.clock = clock;
    }

    @Transactional
    public SeedSummary seed(ContentBundle bundle) {
        Instant now = clock.instant();
        List<Stage> curriculumStages = bundle.curriculum().stages();
        List<Unit> curriculumUnits = bundle.curriculum().units();

        SeedSummary.Count tagCount = sync(skillTags, skillTags.findAll(),
                byId(bundle.skillTags(), definition -> definition.tag().id()),
                SkillTagEntity::new, SkillTagEntity::update, now);
        SeedSummary.Count stageCount = sync(stages, stages.findAll(),
                byId(positioned(curriculumStages), stage -> stage.value().level().code()),
                StageEntity::new, (entity, stage) -> entity.update(stage.value(), stage.position()), now);
        SeedSummary.Count unitCount = sync(units, units.findAll(),
                byId(positioned(curriculumUnits), unit -> unit.value().id()),
                UnitEntity::new, (entity, unit) -> entity.update(unit.value(), unit.position()), now);
        SeedSummary.Count itemCount = sync(items, items.findAll(),
                byId(unitItems(curriculumUnits), unitItem -> unitItem.item().id()),
                ItemEntity::new, (entity, unitItem) -> entity.update(unitItem.item(), unitItem.unitId()), now);
        SeedSummary.Count exerciseCount = sync(exercises, exercises.findByOwnerUserIdIsNull(),
                byId(pooledExercises(bundle), pooled -> pooled.exercise().id()),
                ExerciseEntity::new, this::updateExercise, now);

        return new SeedSummary(tagCount, stageCount, unitCount, itemCount, exerciseCount);
    }

    private void updateExercise(ExerciseEntity entity, PooledExercise pooled) {
        Exercise exercise = pooled.exercise();
        entity.update(exercise, pooled.pool(), pooled.unitId(), payloadCodec.toJson(exercise.payload()));
    }

    private static <E extends SeededContentEntity, V> SeedSummary.Count sync(
            JpaRepository<E, String> repository, Collection<E> existing, Map<String, V> desired,
            Function<String, E> newEntity, BiConsumer<E, V> update, Instant now) {
        Map<String, E> remaining = existing.stream().collect(Collectors.toMap(SeededContentEntity::getId, Function.identity()));
        int created = 0;
        for (Map.Entry<String, V> entry : desired.entrySet()) {
            E entity = remaining.remove(entry.getKey());
            if (entity == null) {
                entity = newEntity.apply(entry.getKey());
                update.accept(entity, entry.getValue());
                repository.save(entity);
                created++;
            } else {
                update.accept(entity, entry.getValue());
            }
        }
        int retired = (int) remaining.values().stream().filter(entity -> entity.retire(now)).count();
        repository.flush();
        return new SeedSummary.Count(desired.size(), created, retired);
    }

    private static <V> Map<String, V> byId(List<V> values, Function<V, String> id) {
        return values.stream().collect(Collectors.toMap(id, Function.identity(), (first, second) -> {
            throw new IllegalStateException("Duplicate content id " + id.apply(first) + " passed validation");
        }, LinkedHashMap::new));
    }

    private static <T> List<Positioned<T>> positioned(List<T> values) {
        return IntStream.range(0, values.size()).mapToObj(i -> new Positioned<>(values.get(i), i)).toList();
    }

    private static List<UnitItem> unitItems(List<Unit> units) {
        return units.stream().flatMap(unit -> unit.items().stream().map(item -> new UnitItem(item, unit.id()))).toList();
    }

    private static List<PooledExercise> pooledExercises(ContentBundle bundle) {
        List<PooledExercise> lesson = bundle.curriculum().units().stream()
                .flatMap(unit -> unit.exercises().stream().map(exercise -> new PooledExercise(exercise, ExercisePool.LESSON, unit.id())))
                .toList();
        List<PooledExercise> placement = bundle.placementExercises().stream()
                .map(exercise -> new PooledExercise(exercise, ExercisePool.PLACEMENT, null))
                .toList();
        return Stream.concat(lesson.stream(), placement.stream()).toList();
    }
}
