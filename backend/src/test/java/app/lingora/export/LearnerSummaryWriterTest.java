package app.lingora.export;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.junit.jupiter.api.Test;

class LearnerSummaryWriterTest {

    private final LearnerSummaryWriter writer = new LearnerSummaryWriter();

    @Test
    void summarisesTheLearnerCompactlyInGerman() {
        assertThat(writer.write(LearnerSnapshots.erza())).isEqualTo("""
                # Lernstand Erza – 25.09.2026 (Gheg, Kosovo)
                - Niveau: A1.2 (Ziel C2), 12 Tage Streak, 340 Wörter
                - Stärken: Begrüssung (95 %), Familie (88 %), Bestimmter Artikel (feminin) (72 %)
                - Schwächen: Infinitiv me + Partizip (31 %), Verbindungsartikel (44 %)
                - Häufige Fehler (30 Tage): Zirkumflex vergessen (5×), bestimmter Artikel (3×)
                - Letzte typische Fehler:
                  - „Shpi âsht e madhe“ → „Shpija âsht e madhe“ (bestimmter Artikel)
                  - „Nana âsht në shpi“ → „Nâna âsht në shpi“ (Zirkumflex vergessen)
                """);
    }

    @Test
    void saysSoWhenThereIsNothingToReportYet() {
        assertThat(writer.write(LearnerSnapshots.newLearner(LearnerSnapshots.TAKEN_AT, 0, 0))).isEqualTo("""
                # Lernstand Erza – 25.09.2026 (Gheg, Kosovo)
                - Niveau: noch nicht eingestuft (Ziel C2), 0 Tage Streak, 0 Wörter
                - Stärken: noch keine
                - Schwächen: noch keine
                - Häufige Fehler (30 Tage): keine
                - Letzte typische Fehler: keine
                """);
    }

    @Test
    void usesTheSingularAndTheLearnersLocalDate() {
        String summary = writer.write(LearnerSnapshots.newLearner(Instant.parse("2026-09-25T22:30:00Z"), 1, 1));

        assertThat(summary).startsWith("""
                # Lernstand Erza – 26.09.2026 (Gheg, Kosovo)
                - Niveau: noch nicht eingestuft (Ziel C2), 1 Tag Streak, 1 Wort
                """);
    }

    @Test
    void leavesOutSkillTagsWithTooFewAnswers() {
        String summary = writer.write(LearnerSnapshots.erza());

        assertThat(summary).doesNotContain("Höflichkeit", "vocab.home");
    }
}
