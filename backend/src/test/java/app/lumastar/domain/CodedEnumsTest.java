package app.lumastar.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import java.util.Arrays;
import java.util.EnumSet;
import org.junit.jupiter.api.Test;

class CodedEnumsTest {

    @Test
    void knowsExactlyTheSixP0ExerciseTypes() {
        assertThat(EnumSet.allOf(ExerciseType.class).stream().filter(ExerciseType::isP0).map(ExerciseType::code))
                .containsExactly("multiple_choice", "translate_wordbank", "translate_free", "fill_gap", "match_pairs", "word_order");
        assertThat(ExerciseType.fromCode("reading").priority()).isEqualTo(ExerciseType.Priority.P1);
        assertThat(ExerciseType.fromCode("free_writing").priority()).isEqualTo(ExerciseType.Priority.P2);
    }

    @Test
    void usesTheSixteenDottedErrorCategoryIds() {
        assertThat(Arrays.stream(ErrorCategory.values()).map(ErrorCategory::code)).containsExactly(
                "vocab.unknown", "vocab.confused", "spelling.diacritics", "spelling.nasal_vowel", "spelling.other",
                "variant.standard_form", "grammar.definite_article", "grammar.case", "grammar.linking_article",
                "grammar.gender", "grammar.infinitive", "grammar.participle", "grammar.verb_conjugation",
                "grammar.verb_tense", "grammar.word_order", "grammar.clitics");
        assertThat(ErrorCategory.fromCode("grammar.definite_article")).isEqualTo(ErrorCategory.GRAMMAR_DEFINITE_ARTICLE);
    }

    @Test
    void parsesContentCodes() {
        assertThat(AnswerLang.fromCode("sq")).isEqualTo(AnswerLang.GHEG);
        assertThat(Competence.fromCode("translation")).isEqualTo(Competence.TRANSLATION);
        assertThat(Gender.fromCode("f")).isEqualTo(Gender.FEMININE);
        assertThat(UnitColor.fromCode("coral")).isEqualTo(UnitColor.CORAL);
    }

    @Test
    void namesTheEnumInTheErrorForAnUnknownCode() {
        assertThatIllegalArgumentException()
                .isThrownBy(() -> ExerciseType.fromCode("multiple_choise"))
                .withMessage("Unknown ExerciseType 'multiple_choise'; expected one of: multiple_choice, translate_wordbank, "
                        + "translate_free, fill_gap, match_pairs, word_order, conjugation_drill, declension_drill, reading, "
                        + "free_writing, listen_select");
    }

    @Test
    void theSelfAssessmentSetsTheStartLevelAndOnlyAnAbsoluteBeginnerMaySkip() {
        assertThat(Arrays.stream(SelfAssessment.values()).map(SelfAssessment::startLevel))
                .containsExactly(Level.A0, Level.A1_1, Level.A1_3, Level.A2_2, Level.B1_2);
        assertThat(EnumSet.allOf(SelfAssessment.class).stream().filter(SelfAssessment::allowsSkippingPlacement))
                .containsExactly(SelfAssessment.NOTHING);
        assertThat(SelfAssessment.fromCode("understand_much").label()).isEqualTo("Ich verstehe viel, will aber besser schreiben");
    }

    @Test
    void acceptsOnlyAnswersThatAreNotWrong() {
        assertThat(EnumSet.allOf(Outcome.class).stream().filter(Outcome::isAccepted))
                .containsExactly(Outcome.CORRECT, Outcome.ALMOST_CORRECT, Outcome.CORRECT_STANDARD_FORM);
    }
}
