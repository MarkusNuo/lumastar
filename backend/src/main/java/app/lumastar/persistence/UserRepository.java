package app.lumastar.persistence;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface UserRepository extends JpaRepository<UserEntity, UUID> {

    /** The account signing in with this address, regardless of case (index {@code users_email_key}). */
    @Query("select u from UserEntity u where lower(u.email) = lower(:email)")
    Optional<UserEntity> findByEmail(String email);

    /** The account created before e-mail sign-in, which signs in without e-mail until it adds one. */
    Optional<UserEntity> findFirstByEmailIsNullOrderByCreatedAtAsc();

    boolean existsByEmailIsNull();

    /** Locks the account row: placement, plan and onboarding changes of one learner run one after another. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<UserEntity> findForUpdateById(UUID id);

    /** Adds XP in the database, so that concurrent lesson completions cannot overwrite each other. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update UserEntity u set u.xpTotal = u.xpTotal + :xp where u.id = :id")
    int addXp(UUID id, int xp);

    @Query("select u.xpTotal from UserEntity u where u.id = :id")
    int xpTotalOf(UUID id);
}
