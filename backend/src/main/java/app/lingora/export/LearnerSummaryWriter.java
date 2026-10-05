package app.lingora.export;

import app.lingora.domain.ErrorCategoryCount;
import app.lingora.domain.ErrorEntry;
import app.lingora.domain.SkillMastery.Entry;
import app.lingora.domain.SkillTag;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * {@code learner_summary.md} (PRD F11, 8.3): a compact German summary to paste into an AI chat. It opens with the
 * framing the chat needs (who learns which variety, answer language, no Standard forms, PRD chapter 4). Strengths and
 * weaknesses consider only skill tags with at least {@value #MIN_ATTEMPTS} answers.
 */
final class LearnerSummaryWriter {

    static final int MIN_ATTEMPTS = 5;
    static final double STRENGTH_THRESHOLD = 0.7;
    static final int LISTED_SKILLS = 3;
    static final int TYPICAL_ERRORS = 5;

    private static final DateTimeFormatter SWISS_DATE = DateTimeFormatter.ofPattern("dd.MM.yyyy");
    private static final String NONE = "noch keine";
    static final String FRAMING = "Ich spreche Deutsch und lerne Gheg-Albanisch (Kosovo). Bitte antworte auf Deutsch und "
            + "verwende auf Albanisch nur Gheg-Formen, keine Standard-Formen (z. B. *âsht* statt *është*).";

    String write(LearnerSnapshot snapshot) {
        List<String> lines = new ArrayList<>();
        lines.add("# Lernstand %s – %s (Gheg, Kosovo)".formatted(snapshot.profile().displayName(),
                SWISS_DATE.format(snapshot.date())));
        lines.add(FRAMING);
        lines.add("");
        lines.add("- Niveau: %s (Ziel %s), %s Streak, %s".formatted(level(snapshot), ProfileDocumentRenderer.TARGET_LEVEL,
                count(snapshot.streak().current(), "Tag", "Tage"), count(snapshot.learnedWords(), "Wort", "Wörter")));
        lines.add("- Aktuelle Einheit: " + currentUnit(snapshot));
        Comparator<Map.Entry<SkillTag, Entry>> byLabel = Comparator.comparing(skill -> snapshot.label(skill.getKey()));
        Comparator<Map.Entry<SkillTag, Entry>> byMastery = Comparator.comparingDouble(skill -> skill.getValue().mastery());
        lines.add("- Stärken: " + skills(snapshot, ratedSkills(snapshot).stream()
                .filter(skill -> skill.getValue().mastery() >= STRENGTH_THRESHOLD)
                .sorted(byMastery.reversed().thenComparing(byLabel))
                .limit(LISTED_SKILLS)
                .toList()));
        lines.add("- Schwächen: " + skills(snapshot, ratedSkills(snapshot).stream()
                .filter(skill -> skill.getValue().mastery() < STRENGTH_THRESHOLD)
                .sorted(byMastery.thenComparing(byLabel))
                .limit(LISTED_SKILLS)
                .toList()));
        lines.add("- Häufige Fehler (%d Tage): %s".formatted(LearnerSnapshotReader.FREQUENT_ERRORS_PERIOD.toDays(),
                frequentErrors(snapshot.frequentErrors())));
        lines.addAll(typicalErrors(snapshot.recentErrors()));
        return String.join("\n", lines) + "\n";
    }

    private static String level(LearnerSnapshot snapshot) {
        return snapshot.profile().currentLevel() == null ? "noch nicht eingestuft" : snapshot.profile().currentLevel().code();
    }

    private static String currentUnit(LearnerSnapshot snapshot) {
        LearnerSnapshot.CurrentUnit unit = snapshot.currentUnit();
        return unit == null ? NONE : "%s (%s)".formatted(unit.title(), unit.level().code());
    }

    private static List<Map.Entry<SkillTag, Entry>> ratedSkills(LearnerSnapshot snapshot) {
        return snapshot.mastery().entries().entrySet().stream()
                .filter(skill -> skill.getValue().attempts() >= MIN_ATTEMPTS)
                .toList();
    }

    private static String skills(LearnerSnapshot snapshot, List<Map.Entry<SkillTag, Entry>> skills) {
        if (skills.isEmpty()) {
            return NONE;
        }
        return skills.stream()
                .map(skill -> "%s %d %%".formatted(snapshot.label(skill.getKey()), Math.round(skill.getValue().mastery() * 100)))
                .collect(Collectors.joining(", "));
    }

    private static String frequentErrors(List<ErrorCategoryCount> counts) {
        if (counts.isEmpty()) {
            return "keine";
        }
        return counts.stream()
                .map(count -> "%s %d×".formatted(count.category().label(), count.count()))
                .collect(Collectors.joining(", "));
    }

    /** The latest distinct mistakes that have a solution to compare with, as "prompt: given → expected (category)". */
    private static List<String> typicalErrors(List<ErrorEntry> recentErrors) {
        Map<String, ErrorEntry> distinct = new LinkedHashMap<>();
        recentErrors.stream()
                .filter(error -> isPresent(error.given()) && isPresent(error.expected()))
                .forEach(error -> distinct.putIfAbsent(error.given() + "\n" + error.expected(), error));
        List<String> typical = distinct.values().stream()
                .limit(TYPICAL_ERRORS)
                .map(error -> "  - %s„%s“ → „%s“ (%s)".formatted(prompt(error), inline(error.given()),
                        inline(error.expected()), error.category().label()))
                .toList();
        if (typical.isEmpty()) {
            return List.of("- Letzte typische Fehler: keine");
        }
        List<String> lines = new ArrayList<>();
        lines.add("- Letzte typische Fehler:");
        lines.addAll(typical);
        return lines;
    }

    private static String prompt(ErrorEntry error) {
        return isPresent(error.prompt()) ? "Aufgabe „%s“: ".formatted(inline(error.prompt())) : "";
    }

    /**
     * The text on one line and without its final period, so that it fits into a list item; e.g. the text and the question
     * of a reading exercise are joined with " / ".
     */
    private static String inline(String text) {
        return withoutFinalPeriod(text.lines().map(String::strip).filter(line -> !line.isEmpty())
                .collect(Collectors.joining(" / ")));
    }

    private static String count(int count, String singular, String plural) {
        return count + " " + (count == 1 ? singular : plural);
    }

    private static boolean isPresent(String text) {
        return text != null && !text.isBlank();
    }

    private static String withoutFinalPeriod(String sentence) {
        String stripped = sentence.strip();
        return stripped.endsWith(".") ? stripped.substring(0, stripped.length() - 1) : stripped;
    }
}
