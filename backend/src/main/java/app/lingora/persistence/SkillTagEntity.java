package app.lingora.persistence;

import app.lingora.domain.SkillArea;
import app.lingora.domain.SkillTagDefinition;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "content_skill_tags")
public class SkillTagEntity extends SeededContentEntity {

    private String label;

    private SkillArea area;

    protected SkillTagEntity() {
    }

    public SkillTagEntity(String id) {
        super(id);
    }

    public String getLabel() {
        return label;
    }

    public void update(SkillTagDefinition definition) {
        label = definition.label();
        area = definition.area();
        reactivate();
    }
}
