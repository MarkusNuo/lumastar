package app.lumastar.persistence;

import app.lumastar.domain.Exercise;
import app.lumastar.domain.GrammarNote;
import app.lumastar.domain.Item;
import app.lumastar.domain.Level;
import app.lumastar.domain.SkillTag;
import app.lumastar.domain.Unit;
import app.lumastar.domain.UnitColor;
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

    /** The unit as a domain record with the given (active) items and exercises. */
    public Unit toUnit(List<Item> items, List<Exercise> exercises) {
        return new Unit(getId(), level, title, description, goals, skillTags.stream().map(SkillTag::of).toList(), color, icon,
                estimatedLessons, grammar, items, exercises);
    }

    public Level getLevel() {
        return level;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public List<String> getSkillTags() {
        return skillTags;
    }

    public UnitColor getColor() {
        return color;
    }

    public String getIcon() {
        return icon;
    }

    public Integer getEstimatedLessons() {
        return estimatedLessons;
    }

    public boolean hasContent() {
        return hasContent;
    }
}
