package app.lumastar.core.evaluation;

import static org.assertj.core.api.Assertions.assertThat;

import app.lumastar.content.GhegBlocklistReader;
import app.lumastar.core.evaluation.StandardFormLexicon.Replacement;
import app.lumastar.core.evaluation.StandardFormLexicon.Replacement.Kind;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

class StandardFormLexiconTest {

    private static final StandardFormLexicon BLOCKLIST = GhegBlocklistReader.read(Path.of("../content", GhegBlocklistReader.FILE));

    @Nested
    class RealBlocklist {

        @Test
        void linksListedStandardWordsToTheirGhegForm() {
            assertThat(BLOCKLIST.isStandardFormOf("është", "âsht", false)).isTrue();
            assertThat(BLOCKLIST.isStandardFormOf("një", "nji", false)).isTrue();
            assertThat(BLOCKLIST.isStandardFormOf("nëna", "nâna", false)).isTrue();
        }

        @Test
        void acceptsEveryGhegAlternativeOfAWord() {
            assertThat(BLOCKLIST.isStandardFormOf("qenë", "kânë", false)).isTrue();
            assertThat(BLOCKLIST.isStandardFormOf("qenë", "kjenë", false)).isTrue();
            assertThat(BLOCKLIST.isStandardFormOf("tani", "tashti", false)).isTrue();
            assertThat(BLOCKLIST.isStandardFormOf("shqipëri", "shqipni", false)).isTrue();
        }

        @Test
        void linksStandardParticiplesByPattern() {
            assertThat(BLOCKLIST.isStandardFormOf("punuar", "punue", false)).isTrue();
            assertThat(BLOCKLIST.isStandardFormOf("martuar", "martuem", false)).isTrue();
            assertThat(BLOCKLIST.isStandardFormOf("dhënë", "dhânë", false)).isTrue();
        }

        @Test
        void linksAllFormsOfTheStandardHouse() {
            assertThat(BLOCKLIST.isStandardFormOf("shtëpi", "shpi", false)).isTrue();
            assertThat(BLOCKLIST.isStandardFormOf("shtëpia", "shpija", false)).isTrue();
            assertThat(BLOCKLIST.isStandardFormOf("shtëpisë", "shpisë", false)).isTrue();
            assertThat(BLOCKLIST.isStandardFormOf("shtëpi", "shpija", false)).isFalse();
        }

        @Test
        void respectsThePatternExceptions() {
            assertThat(BLOCKLIST.isStandardFormOf("duar", "duer", false)).isFalse();
            assertThat(BLOCKLIST.isStandardFormOf("gëzuar", "gëzue", false)).isFalse();
        }

        @Test
        void linksOnlyToTheMatchingGhegWord() {
            assertThat(BLOCKLIST.isStandardFormOf("është", "jam", false)).isFalse();
            assertThat(BLOCKLIST.isStandardFormOf("punuar", "shkue", false)).isFalse();
            assertThat(BLOCKLIST.isStandardFormOf("âsht", "âsht", false)).isFalse();
        }

        @Test
        void readsTheRulesWithPatternIdsAndReplacementKinds() {
            assertThat(BLOCKLIST.words()).contains(new StandardFormLexicon.Word("tani", List.of("tash", "tashti")),
                    new StandardFormLexicon.Word("shqipëri", List.of("shqipni")));
            assertThat(pattern("participle_uar").gheg())
                    .containsExactly(new Replacement(Kind.SUFFIX, "ue"), new Replacement(Kind.SUFFIX, "uem"));
            assertThat(pattern("participle_uar").exceptions()).containsExactly("duar", "gëzuar");
            assertThat(pattern("house_shtepi").gheg()).containsExactly(new Replacement(Kind.PREFIX, "shpi"));
        }

        private StandardFormLexicon.WordPattern pattern(String id) {
            return BLOCKLIST.patterns().stream().filter(pattern -> pattern.id().equals(id)).findFirst().orElseThrow();
        }

        @Test
        void recognisesStandardFormsWithoutDiacriticsWhenFolded() {
            assertThat(BLOCKLIST.isStandardFormOf("eshte", "asht", true)).isTrue();
            assertThat(BLOCKLIST.isStandardFormOf("shtepia", "shpija", true)).isTrue();
            assertThat(BLOCKLIST.isStandardFormOf("eshte", "asht", false)).isFalse();
        }
    }

    @Test
    void anEmptyLexiconKnowsNoStandardForms() {
        assertThat(StandardFormLexicon.empty().isStandardFormOf("është", "âsht", false)).isFalse();
    }

    @Test
    void aPatternReplacementWithoutHyphenReplacesTheWholeWord() {
        StandardFormLexicon lexicon = StandardFormLexicon.of(List.of(), List.of(new StandardFormLexicon.WordPattern("what",
                "^çfar", List.of(StandardFormLexicon.Replacement.parse("çka")), List.of())));

        assertThat(lexicon.isStandardFormOf("çfarë", "çka", false)).isTrue();
    }

    @Test
    void parsesTheReplacementKindFromTheHyphen() {
        assertThat(StandardFormLexicon.Replacement.parse("-ue")).isEqualTo(new Replacement(Kind.SUFFIX, "ue"));
        assertThat(StandardFormLexicon.Replacement.parse(" shpi- ")).isEqualTo(new Replacement(Kind.PREFIX, "shpi"));
        assertThat(StandardFormLexicon.Replacement.parse("âsht")).isEqualTo(new Replacement(Kind.WORD, "âsht"));
    }

    @Test
    void keepsItsRulesNormalisedForTheApp() {
        StandardFormLexicon lexicon = StandardFormLexicon.of(
                List.of(new StandardFormLexicon.Word("Shqipëri", List.of("Shqipni"))),
                List.of(new StandardFormLexicon.WordPattern("house", "^shtëpi", List.of(new Replacement(Kind.PREFIX, "Shpi")),
                        List.of("Shtëpiak"))));

        assertThat(lexicon.words()).containsExactly(new StandardFormLexicon.Word("shqipëri", List.of("shqipni")));
        assertThat(lexicon.patterns()).containsExactly(new StandardFormLexicon.WordPattern("house", "^shtëpi",
                List.of(new Replacement(Kind.PREFIX, "shpi")), List.of("shtëpiak")));
        assertThat(lexicon.isStandardFormOf("shtëpia", "shpija", false)).isTrue();
        assertThat(lexicon.isStandardFormOf("shtëpiak", "shpiak", false)).isFalse();
    }
}
