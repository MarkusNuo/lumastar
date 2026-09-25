package app.lingora.persistence;

import app.lingora.domain.Outcome;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AttemptRepository extends JpaRepository<AttemptEntity, UUID> {

    long countBySessionId(UUID sessionId);

    boolean existsBySessionIdAndExerciseId(UUID sessionId, String exerciseId);

    /** Whether an answer to the exercise in this lesson counted as correct; {@code wrong} is the only other outcome. */
    boolean existsBySessionIdAndExerciseIdAndOutcomeNot(UUID sessionId, String exerciseId, Outcome wrong);

    /** The first answer to each exercise of the lesson; retries at the end of the lesson are left out. */
    List<AttemptEntity> findBySessionIdAndRetryFalseOrderByPosition(UUID sessionId);
}
