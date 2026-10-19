package app.lumastar.persistence;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UnitRepository extends JpaRepository<UnitEntity, String> {

    /** The units of the current curriculum in path order. */
    List<UnitEntity> findByRetiredAtIsNullOrderByPosition();

    Optional<UnitEntity> findByIdAndRetiredAtIsNull(String id);
}
