package app.lingora.persistence;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface UserRepository extends JpaRepository<UserEntity, UUID> {

    /** The account of this single-user instance, if it has been set up. */
    Optional<UserEntity> findFirstByOrderByCreatedAtAsc();

    /** Adds XP in the database, so that concurrent lesson completions cannot overwrite each other. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update UserEntity u set u.xpTotal = u.xpTotal + :xp where u.id = :id")
    int addXp(UUID id, int xp);

    @Query("select u.xpTotal from UserEntity u where u.id = :id")
    int xpTotalOf(UUID id);
}
