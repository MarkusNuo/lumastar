package app.lingora.persistence;

import app.lingora.domain.Stage;
import jakarta.persistence.AttributeOverride;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/** A curriculum stage; its id is the level code. */
@Entity
@Table(name = "content_stages")
@AttributeOverride(name = "id", column = @Column(name = "level"))
public class StageEntity extends SeededContentEntity {

    private String title;

    private int position;

    protected StageEntity() {
    }

    public StageEntity(String levelCode) {
        super(levelCode);
    }

    public void update(Stage stage, int position) {
        title = stage.title();
        this.position = position;
        reactivate();
    }
}
