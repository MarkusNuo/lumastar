package app.lingora.persistence;

import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostPersist;
import jakarta.persistence.Transient;
import java.time.Instant;
import org.springframework.data.domain.Persistable;

/**
 * A global content row owned by the seed import. Rows that disappear from the content files are retired instead
 * of deleted, because learner history (attempts, SRS cards) keeps referencing them.
 */
@MappedSuperclass
public abstract class SeededContentEntity implements Persistable<String> {

    @Id
    private String id;

    private Instant retiredAt;

    // Content ids are assigned, so Spring Data cannot tell new rows from existing ones by the id.
    @Transient
    private boolean isNew = true;

    protected SeededContentEntity() {
    }

    protected SeededContentEntity(String id) {
        this.id = id;
    }

    @Override
    public String getId() {
        return id;
    }

    @Override
    public boolean isNew() {
        return isNew;
    }

    @PostLoad
    @PostPersist
    void markPersisted() {
        isNew = false;
    }

    /** Returns {@code true} if the row was active before. */
    public boolean retire(Instant at) {
        boolean active = retiredAt == null;
        if (active) {
            retiredAt = at;
        }
        return active;
    }

    protected void reactivate() {
        retiredAt = null;
    }
}
