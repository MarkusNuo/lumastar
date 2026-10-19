package app.lumastar.persistence;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StageRepository extends JpaRepository<StageEntity, String> {

    /** The stages of the current curriculum in level order. */
    List<StageEntity> findByRetiredAtIsNullOrderByPosition();
}
