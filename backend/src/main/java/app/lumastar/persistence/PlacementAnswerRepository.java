package app.lumastar.persistence;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlacementAnswerRepository extends JpaRepository<PlacementAnswerEntity, UUID> {
}
