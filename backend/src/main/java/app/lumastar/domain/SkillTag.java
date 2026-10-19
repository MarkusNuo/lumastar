package app.lumastar.domain;

import java.util.regex.Pattern;

/** Fine-grained competence such as {@code grammar.definite_article.fem}. */
public record SkillTag(String id) {

    /** The format of a tag id, e.g. for request validation. */
    public static final String FORMAT_REGEX = "^(vocab|phrase|grammar|spelling|reading)(\\.[a-z0-9_]+)+$";
    private static final Pattern FORMAT = Pattern.compile(FORMAT_REGEX);

    public SkillTag {
        Require.that(id != null && FORMAT.matcher(id).matches(),
                "invalid skill tag '%s'; expected <area>.<name>[.<name>…] in lower case", id);
    }

    public static SkillTag of(String id) {
        return new SkillTag(id);
    }

    public SkillArea area() {
        return SkillArea.fromCode(id.substring(0, id.indexOf('.')));
    }

    @Override
    public String toString() {
        return id;
    }
}
