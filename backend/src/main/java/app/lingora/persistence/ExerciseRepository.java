package app.lingora.persistence;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ExerciseRepository extends JpaRepository<ExerciseEntity, String> {

    /** Global exercises, i.e. those owned by the content files rather than generated for one learner. */
    List<ExerciseEntity> findByOwnerUserIdIsNull();

    List<ExerciseEntity> findByUnitIdAndPoolAndOwnerUserIdIsNullAndRetiredAtIsNullOrderById(String unitId, ExercisePool pool);

    List<ExerciseEntity> findByPoolAndOwnerUserIdIsNullAndRetiredAtIsNullOrderById(ExercisePool pool);

    /** Active global lesson exercises carrying the skill tag on one of the given levels. */
    @Query(value = """
            SELECT * FROM exercises
            WHERE pool = 'lesson' AND owner_user_id IS NULL AND retired_at IS NULL
              AND :tag = ANY (skill_tags) AND level = ANY (:levels)
            ORDER BY id""", nativeQuery = true)
    List<ExerciseEntity> findLessonExercisesWithSkillTag(String tag, String[] levels);

    /** Active global lesson exercises practising at least one of the items. */
    @Query(value = """
            SELECT * FROM exercises
            WHERE pool = 'lesson' AND owner_user_id IS NULL AND retired_at IS NULL AND item_ids && CAST(:items AS text[])
            ORDER BY id""", nativeQuery = true)
    List<ExerciseEntity> findLessonExercisesWithItems(String[] items);

    /** The levels of the active global lesson exercises carrying the skill tag. */
    @Query(value = """
            SELECT DISTINCT level FROM exercises
            WHERE pool = 'lesson' AND owner_user_id IS NULL AND retired_at IS NULL AND :tag = ANY (skill_tags)""",
            nativeQuery = true)
    List<String> findLessonLevelsWithSkillTag(String tag);

    /** The skill tags of the active global lesson exercises on the given levels. */
    @Query(value = """
            SELECT DISTINCT unnest(skill_tags) FROM exercises
            WHERE pool = 'lesson' AND owner_user_id IS NULL AND retired_at IS NULL AND level = ANY (:levels)""", nativeQuery = true)
    List<String> findLessonSkillTags(String[] levels);
}
