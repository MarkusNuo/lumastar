package app.lingora.persistence;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

public interface LessonSessionRepository extends JpaRepository<LessonSessionEntity, UUID> {

    /** Locks the session row, so that attempts and the completion of one lesson run one after another. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<LessonSessionEntity> findForUpdateByIdAndUserId(UUID id, UUID userId);
}
