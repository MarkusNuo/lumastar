package app.lingora.persistence;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<UserEntity, UUID> {

    /** The account of this single-user instance, if it has been set up. */
    Optional<UserEntity> findFirstByOrderByCreatedAtAsc();
}
