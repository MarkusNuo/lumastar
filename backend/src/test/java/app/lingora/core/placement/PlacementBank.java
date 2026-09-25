package app.lingora.core.placement;

import app.lingora.domain.AnswerLang;
import app.lingora.domain.Competence;
import app.lingora.domain.Exercise;
import app.lingora.domain.ExercisePayload;
import app.lingora.domain.ExerciseSource;
import app.lingora.domain.Level;
import app.lingora.domain.Prompt;
import app.lingora.domain.SkillTag;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Synthetic placement items shaped like the real bank: six items per stage (two vocabulary, two grammar, one
 * translation and, from A2.1, one reading item instead of a second translation). Every item carries the tag
 * {@code <area>.<competence>.<stage>} of its competence and stage, e.g. {@code grammar.grammar.a2_1}.
 */
final class PlacementBank {

    private PlacementBank() {
    }

    static List<Exercise> full() {
        List<Exercise> bank = new ArrayList<>();
        for (Level level : Level.values()) {
            boolean withReading = !Level.A2_1.isAbove(level);
            bank.add(item(level, Competence.VOCABULARY, 1));
            bank.add(item(level, Competence.VOCABULARY, 2));
            bank.add(item(level, Competence.GRAMMAR, 3));
            bank.add(item(level, Competence.GRAMMAR, 4));
            bank.add(item(level, Competence.TRANSLATION, 5));
            bank.add(item(level, withReading ? Competence.READING : Competence.TRANSLATION, 6));
        }
        return bank;
    }

    static Exercise item(Level level, Competence competence, int number) {
        return item("pl_%s_%03d".formatted(stageKey(level), number), level, competence, tag(level, competence));
    }

    static Exercise item(String id, Level level, Competence competence, SkillTag tag) {
        return new Exercise(id, level, 1, List.of(tag), List.of(), competence, new Prompt(AnswerLang.GERMAN, "Was heisst „po“?"),
                "„Po“ heisst „ja“.", List.of(), ExerciseSource.MANUAL, false, null,
                new ExercisePayload.MultipleChoice(List.of("ja", "nein", "danke", "bitte"), List.of("ja")));
    }

    static SkillTag tag(Level level, Competence competence) {
        String area = switch (competence) {
            case VOCABULARY -> "vocab";
            case GRAMMAR -> "grammar";
            case READING -> "reading";
            case TRANSLATION -> "phrase";
        };
        return SkillTag.of("%s.%s.%s".formatted(area, competence.code(), stageKey(level)));
    }

    private static String stageKey(Level level) {
        return level.code().toLowerCase(Locale.ROOT).replace('.', '_');
    }
}
