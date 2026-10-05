package app.lingora.export;

import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.domain.ErrorCategory;
import app.lingora.domain.ExerciseType;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class LearnerSummaryWriterTest {

    private final LearnerSummaryWriter writer = new LearnerSummaryWriter();

    @Test
    void summarisesTheLearnerCompactlyInGerman() {
        assertThat(writer.write(LearnerSnapshots.erza())).isEqualTo("""
                # Lernstand Erza – 25.09.2026 (Gheg, Kosovo)
                Ich spreche Deutsch und lerne Gheg-Albanisch (Kosovo). Bitte antworte auf Deutsch und verwende auf \
                Albanisch nur Gheg-Formen, keine Standard-Formen (z. B. *âsht* statt *është*).

                - Niveau: A1.2 (Ziel C2), 12 Tage Streak, 340 Wörter
                - Aktuelle Einheit: Zuhause (A1.2)
                - Stärken: Begrüssung 95 %, Familie 88 %, Bestimmter Artikel (feminin) 72 %
                - Schwächen: Infinitiv me + Partizip 31 %, Verbindungsartikel 44 %
                - Häufige Fehler (30 Tage): Zirkumflex vergessen 5×, bestimmter Artikel 3×
                - Letzte typische Fehler:
                  - Aufgabe „Das Haus ist gross“: „Shpi âsht e madhe“ → „Shpija âsht e madhe“ (bestimmter Artikel)
                  - Aufgabe „Die Mutter ist zu Hause“: „Nana âsht në shpi“ → „Nâna âsht në shpi“ (Zirkumflex vergessen)
                """);
    }

    @Test
    void saysSoWhenThereIsNothingToReportYet() {
        assertThat(writer.write(LearnerSnapshots.newLearner(LearnerSnapshots.TAKEN_AT, 0, 0))).isEqualTo("""
                # Lernstand Erza – 25.09.2026 (Gheg, Kosovo)
                Ich spreche Deutsch und lerne Gheg-Albanisch (Kosovo). Bitte antworte auf Deutsch und verwende auf \
                Albanisch nur Gheg-Formen, keine Standard-Formen (z. B. *âsht* statt *është*).

                - Niveau: noch nicht eingestuft (Ziel C2), 0 Tage Streak, 0 Wörter
                - Aktuelle Einheit: noch keine
                - Stärken: noch keine
                - Schwächen: noch keine
                - Häufige Fehler (30 Tage): keine
                - Letzte typische Fehler: keine
                """);
    }

    @Test
    void usesTheSingularAndTheLearnersLocalDate() {
        String summary = writer.write(LearnerSnapshots.newLearner(Instant.parse("2026-09-25T22:30:00Z"), 1, 1));

        assertThat(summary).startsWith("# Lernstand Erza – 26.09.2026 (Gheg, Kosovo)\n")
                .contains("\n- Niveau: noch nicht eingestuft (Ziel C2), 1 Tag Streak, 1 Wort\n");
    }

    @Test
    void leavesOutSkillTagsWithTooFewAnswers() {
        String summary = writer.write(LearnerSnapshots.erza());

        assertThat(summary).doesNotContain("Höflichkeit", "vocab.home");
    }

    @Test
    void putsAReadingTextWithItsQuestionOnTheLineOfItsError() {
        String summary = writer.write(LearnerSnapshots.withRecentErrors(LearnerSnapshots.error("2026-09-25T10:00:00Z",
                ExerciseType.READING, "reading.a1", ErrorCategory.VOCAB_UNKNOWN,
                "Arta banon në Prishtinë.\nAjo punon në shkollë.\n\nFrage: Wo arbeitet Arta?", "In der Schule.",
                "Im Spital\n")));

        assertThat(summary).endsWith("""
                - Letzte typische Fehler:
                  - Aufgabe „Arta banon në Prishtinë. / Ajo punon në shkollë. / Frage: Wo arbeitet Arta?“: „Im Spital“ → \
                „In der Schule“ (Wort nicht gewusst)
                """);
    }

    @Test
    void namesNoErrorCategoryWithBracketsOfItsOwn() {
        for (ErrorCategory category : ErrorCategory.values()) {
            assertThat(category.label()).doesNotContain("(", ")");
        }
    }
}
