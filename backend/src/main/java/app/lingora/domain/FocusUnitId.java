package app.lingora.domain;

import java.util.Objects;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Id of a focus unit that the plan inserts for a weak skill tag (PRD F3): {@code focus_<skill tag>_<n>}, e.g.
 * {@code focus_grammar.verbs.infinitive_me_1}, where {@code n} counts the focus units of that tag in a row.
 */
public record FocusUnitId(SkillTag tag, int number) {

    private static final String PREFIX = "focus_";
    private static final Pattern FORMAT = Pattern.compile("^" + PREFIX + "(.+)_([1-9][0-9]*)$");

    public FocusUnitId {
        Objects.requireNonNull(tag, "tag");
        Require.that(number >= 1, "number must be positive");
    }

    /** The focus unit behind a plan unit id; empty for curriculum units and malformed ids. */
    public static Optional<FocusUnitId> parse(String unitId) {
        Matcher matcher = FORMAT.matcher(unitId);
        if (!matcher.matches()) {
            return Optional.empty();
        }
        try {
            return Optional.of(new FocusUnitId(SkillTag.of(matcher.group(1)), Integer.parseInt(matcher.group(2))));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    public static boolean isFocus(String unitId) {
        return parse(unitId).isPresent();
    }

    public String id() {
        return PREFIX + tag.id() + "_" + number;
    }

    @Override
    public String toString() {
        return id();
    }
}
