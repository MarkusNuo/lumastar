package app.lumastar.persistence;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ItemRepository extends JpaRepository<ItemEntity, String> {

    List<ItemEntity> findByUnitIdAndRetiredAtIsNull(String unitId);
}
