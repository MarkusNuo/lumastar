package app.lumastar.core.evaluation;

import app.lumastar.domain.ErrorCategory;
import app.lumastar.domain.SkillTag;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Derives the error category of a wrong answer from the grammar skill tags of its exercise, e.g.
 * {@code grammar.definite_article.fem} → {@code grammar.definite_article}. Tags are matched by prefix; the first
 * matching prefix wins, so specific verb tags come before {@code grammar.verbs}.
 */
final class SkillTagErrorCategories {

    private static final List<Map.Entry<String, ErrorCategory>> BY_TAG_PREFIX = List.of(
            Map.entry("grammar.definite_article", ErrorCategory.GRAMMAR_DEFINITE_ARTICLE),
            Map.entry("grammar.linking_article", ErrorCategory.GRAMMAR_LINKING_ARTICLE),
            Map.entry("grammar.case", ErrorCategory.GRAMMAR_CASE),
            Map.entry("grammar.clitics", ErrorCategory.GRAMMAR_CLITICS),
            Map.entry("grammar.adjective_agreement", ErrorCategory.GRAMMAR_GENDER),
            Map.entry("grammar.infinitive", ErrorCategory.GRAMMAR_INFINITIVE),
            Map.entry("grammar.verbs.infinitive", ErrorCategory.GRAMMAR_INFINITIVE),
            Map.entry("grammar.participle", ErrorCategory.GRAMMAR_PARTICIPLE),
            Map.entry("grammar.verbs.participle", ErrorCategory.GRAMMAR_PARTICIPLE),
            Map.entry("grammar.verbs.past_simple", ErrorCategory.GRAMMAR_VERB_TENSE),
            Map.entry("grammar.verbs.perfect", ErrorCategory.GRAMMAR_VERB_TENSE),
            Map.entry("grammar.verbs.imperfect", ErrorCategory.GRAMMAR_VERB_TENSE),
            Map.entry("grammar.verbs.future", ErrorCategory.GRAMMAR_VERB_TENSE),
            Map.entry("grammar.verbs.subjunctive", ErrorCategory.GRAMMAR_VERB_TENSE),
            Map.entry("grammar.verbs.conditional", ErrorCategory.GRAMMAR_VERB_TENSE),
            Map.entry("grammar.verbs.admirative", ErrorCategory.GRAMMAR_VERB_TENSE),
            Map.entry("grammar.verbs.optative", ErrorCategory.GRAMMAR_VERB_TENSE),
            Map.entry("grammar.verbs", ErrorCategory.GRAMMAR_VERB_CONJUGATION));

    private SkillTagErrorCategories() {
    }

    /** The category of the first tag that maps to one, in the tag order of the exercise. */
    static Optional<ErrorCategory> of(List<SkillTag> tags) {
        return tags.stream()
                .flatMap(tag -> categoryOf(tag.id()).stream())
                .findFirst();
    }

    private static Optional<ErrorCategory> categoryOf(String tagId) {
        return BY_TAG_PREFIX.stream()
                .filter(entry -> tagId.startsWith(entry.getKey()))
                .map(Map.Entry::getValue)
                .findFirst();
    }
}
