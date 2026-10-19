package app.lumastar.api.curriculum;

import app.lumastar.domain.Level;
import app.lumastar.persistence.StageRepository;
import app.lumastar.persistence.UnitEntity;
import app.lumastar.persistence.UnitRepository;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class CurriculumService {

    private final StageRepository stages;
    private final UnitRepository units;

    CurriculumService(StageRepository stages, UnitRepository units) {
        this.stages = stages;
        this.units = units;
    }

    @Transactional(readOnly = true)
    CurriculumResponse current() {
        Map<Level, List<CurriculumResponse.Unit>> unitsByLevel = units.findByRetiredAtIsNullOrderByPosition().stream()
                .collect(Collectors.groupingBy(UnitEntity::getLevel,
                        Collectors.mapping(CurriculumService::toUnit, Collectors.toList())));
        return new CurriculumResponse(stages.findByRetiredAtIsNullOrderByPosition().stream()
                .map(stage -> new CurriculumResponse.Stage(stage.getLevel(), stage.getTitle(),
                        unitsByLevel.getOrDefault(stage.getLevel(), List.of())))
                .toList());
    }

    private static CurriculumResponse.Unit toUnit(UnitEntity unit) {
        return new CurriculumResponse.Unit(unit.getId(), unit.getTitle(), unit.getDescription(), unit.getColor(),
                unit.getIcon(), unit.getSkillTags(), unit.getEstimatedLessons(), unit.hasContent());
    }
}
