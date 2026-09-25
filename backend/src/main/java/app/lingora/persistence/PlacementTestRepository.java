package app.lingora.persistence;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface PlacementTestRepository extends JpaRepository<PlacementTestEntity, UUID> {

    Optional<PlacementTestEntity> findByIdAndUserId(UUID id, UUID userId);

    /** Locks the test row, so that the answers of one test are recorded one after another. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<PlacementTestEntity> findForUpdateByIdAndUserId(UUID id, UUID userId);

    /** Marks the unfinished test of the learner, if any, as abandoned; a learner has at most one. */
    default void abandonUnfinished(UUID userId, Instant at) {
        replaceStatus(userId, PlacementStatus.IN_PROGRESS, PlacementStatus.ABANDONED, at);
    }

    @Modifying(flushAutomatically = true)
    @Query("update PlacementTestEntity t set t.status = :to, t.finishedAt = :at where t.userId = :userId and t.status = :from")
    int replaceStatus(UUID userId, PlacementStatus from, PlacementStatus to, Instant at);
}
