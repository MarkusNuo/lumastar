package app.lingora.persistence;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AttemptRepository extends JpaRepository<AttemptEntity, UUID> {

    long countBySessionId(UUID sessionId);

    boolean existsBySessionIdAndExerciseId(UUID sessionId, String exerciseId);

    /** The first answer to each exercise of the lesson; retries at the end of the lesson are left out. */
    List<AttemptEntity> findBySessionIdAndRetryFalseOrderByPosition(UUID sessionId);
}
