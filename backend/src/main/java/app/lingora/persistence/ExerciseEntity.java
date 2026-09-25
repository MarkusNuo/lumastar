package app.lingora.persistence;

import app.lingora.domain.AnswerLang;
import app.lingora.domain.Competence;
import app.lingora.domain.ErrorHint;
import app.lingora.domain.Exercise;
import app.lingora.domain.ExerciseSource;
import app.lingora.domain.ExerciseType;
import app.lingora.domain.Level;
import app.lingora.domain.SkillTag;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** An exercise of the lesson or placement bank. {@code payload} holds the type-specific fields as JSON. */
@Entity
@Table(name = "exercises")
public class ExerciseEntity extends SeededContentEntity {

    private ExercisePool pool;

    private String unitId;

    private ExerciseType type;

    private Level level;

    private int difficulty;

    @JdbcTypeCode(SqlTypes.ARRAY)
    private List<String> skillTags;

    @JdbcTypeCode(SqlTypes.ARRAY)
    private List<String> itemIds;

    private Competence competence;

    private AnswerLang promptLang;

    private String promptText;

    private String explanation;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<ErrorHint> errorHints;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> payload;

    private ExerciseSource source;

    private UUID ownerUserId;

    private boolean reviewed;

    private String note;

    protected ExerciseEntity() {
    }

    public ExerciseEntity(String id) {
        super(id);
    }

    public void update(Exercise exercise, ExercisePool pool, String unitId, Map<String, Object> payload) {
        this.pool = pool;
        this.unitId = unitId;
        type = exercise.type();
        level = exercise.level();
        difficulty = exercise.difficulty();
        skillTags = exercise.skillTags().stream().map(SkillTag::id).toList();
        itemIds = exercise.itemIds();
        competence = exercise.competence();
        promptLang = exercise.prompt().lang();
        promptText = exercise.prompt().text();
        explanation = exercise.explanation();
        errorHints = exercise.errorHints();
        this.payload = payload;
        source = exercise.source();
        reviewed = exercise.reviewed();
        note = exercise.note();
        reactivate();
    }

    public ExerciseType getType() {
        return type;
    }

    public Map<String, Object> getPayload() {
        return payload;
    }
}
