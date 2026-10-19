package app.lumastar.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class SkillTagTest {

    @ParameterizedTest
    @ValueSource(strings = {"vocab.family", "grammar.definite_article.fem", "spelling.nasal_vowel", "reading.short_text_1"})
    void acceptsAreaPlusLowerCaseSegments(String id) {
        assertThat(SkillTag.of(id).id()).isEqualTo(id);
    }

    @ParameterizedTest
    @ValueSource(strings = {"vocab", "family", "Vocab.family", "vocab.Family", "variant.standard_form", "vocab..family", "vocab.family."})
    void rejectsMalformedIds(String id) {
        assertThatIllegalArgumentException().isThrownBy(() -> SkillTag.of(id)).withMessageContaining(id);
    }

    @Test
    void derivesTheAreaFromTheFirstSegment() {
        assertThat(SkillTag.of("grammar.definite_article.fem").area()).isEqualTo(SkillArea.GRAMMAR);
        assertThat(SkillTag.of("phrase.politeness").area()).isEqualTo(SkillArea.PHRASE);
    }

    @Test
    void registryEntryMustAgreeWithTheIdPrefix() {
        assertThatIllegalArgumentException()
                .isThrownBy(() -> new SkillTagDefinition(SkillTag.of("vocab.family"), "Familie", SkillArea.GRAMMAR))
                .withMessageContaining("area 'grammar'");
    }
}
