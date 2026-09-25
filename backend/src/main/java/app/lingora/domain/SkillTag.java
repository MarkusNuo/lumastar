package app.lingora.domain;

import java.util.regex.Pattern;

/** Fine-grained competence such as {@code grammar.definite_article.fem}. */
public record SkillTag(String id) {

    private static final Pattern FORMAT = Pattern.compile("^(vocab|phrase|grammar|spelling|reading)(\\.[a-z0-9_]+)+$");

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
