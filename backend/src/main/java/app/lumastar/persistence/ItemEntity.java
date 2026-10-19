package app.lumastar.persistence;

import app.lumastar.domain.Gender;
import app.lumastar.domain.Item;
import app.lumastar.domain.ItemKind;
import app.lumastar.domain.PartOfSpeech;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.util.List;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "content_items")
public class ItemEntity extends SeededContentEntity {

    private String unitId;

    private ItemKind kind;

    private String gheg;

    private String de;

    private PartOfSpeech partOfSpeech;

    private Gender gender;

    private String definite;

    private String plural;

    @JdbcTypeCode(SqlTypes.ARRAY)
    private List<String> alternatives;

    private String note;

    private boolean reviewed;

    protected ItemEntity() {
    }

    public ItemEntity(String id) {
        super(id);
    }

    public void update(Item item, String unitId) {
        this.unitId = unitId;
        kind = item.kind();
        gheg = item.gheg();
        de = item.de();
        partOfSpeech = item.partOfSpeech();
        gender = item.gender();
        definite = item.definite();
        plural = item.plural();
        alternatives = item.alternatives();
        note = item.note();
        reviewed = item.reviewed();
        reactivate();
    }

    public Item toItem() {
        return new Item(getId(), kind, gheg, de, partOfSpeech, gender, definite, plural, alternatives, note, reviewed);
    }
}
