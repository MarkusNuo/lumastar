package app.lingora.persistence;

import app.lingora.domain.GrammarNote;
import app.lingora.domain.Level;
import app.lingora.domain.SkillTag;
import app.lingora.domain.Unit;
import app.lingora.domain.UnitColor;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.List;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "content_units")
public class UnitEntity extends SeededContentEntity {

    private Level level;

    private int position;

    private String title;

    private String description;

    @JdbcTypeCode(SqlTypes.ARRAY)
    private List<String> goals;

    @JdbcTypeCode(SqlTypes.ARRAY)
    private List<String> skillTags;

    private UnitColor color;

    private String icon;

    private Integer estimatedLessons;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<GrammarNote> grammar;

    private boolean hasContent;

    protected UnitEntity() {
    }

    public UnitEntity(String id) {
        super(id);
    }

    public void update(Unit unit, int position) {
        level = unit.level();
        this.position = position;
        title = unit.title();
        description = unit.description();
        goals = unit.goals();
        skillTags = unit.skillTags().stream().map(SkillTag::id).toList();
        color = unit.color();
        icon = unit.icon();
        estimatedLessons = unit.estimatedLessons();
        grammar = unit.grammar();
        hasContent = !unit.isSkeleton();
        reactivate();
    }
}
