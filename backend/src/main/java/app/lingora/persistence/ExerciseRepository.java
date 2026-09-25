package app.lingora.persistence;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExerciseRepository extends JpaRepository<ExerciseEntity, String> {

    /** Global exercises, i.e. those owned by the content files rather than generated for one learner. */
    List<ExerciseEntity> findByOwnerUserIdIsNull();

    List<ExerciseEntity> findByUnitIdAndPoolAndOwnerUserIdIsNullAndRetiredAtIsNullOrderById(String unitId, ExercisePool pool);
}
