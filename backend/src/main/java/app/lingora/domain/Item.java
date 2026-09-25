package app.lingora.domain;

import java.util.List;
import java.util.Objects;
import java.util.regex.Pattern;

/**
 * Learnable unit for spaced repetition: a word, a phrase or a grammar rule. Optional fields are {@code null}
 * when absent; {@code alternatives} lists further accepted Gheg spellings.
 */
public record Item(
        String id,
        ItemKind kind,
        String gheg,
        String de,
        PartOfSpeech partOfSpeech,
        Gender gender,
        String definite,
        String plural,
        List<String> alternatives,
        String note,
        boolean reviewed) {

    private static final Pattern ID_FORMAT = Pattern.compile("^item_[a-z0-9_]+$");

    public Item {
        Require.that(id != null && ID_FORMAT.matcher(id).matches(), "invalid item id '%s'; expected item_<name>", id);
        Objects.requireNonNull(kind, "item kind");
        Require.notBlank(gheg, "gheg of item " + id);
        Require.notBlank(de, "de of item " + id);
        alternatives = Require.listOrEmpty(alternatives);
        Require.allNotBlank(alternatives, "alternatives of item " + id);
    }
}
