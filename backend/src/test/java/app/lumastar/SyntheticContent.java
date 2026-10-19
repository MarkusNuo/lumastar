package app.lumastar;

import app.lumastar.content.ContentBundle;
import app.lumastar.domain.AnswerLang;
import app.lumastar.domain.Competence;
import app.lumastar.domain.Curriculum;
import app.lumastar.domain.Exercise;
import app.lumastar.domain.ExercisePayload;
import app.lumastar.domain.ExerciseSource;
import app.lumastar.domain.Level;
import app.lumastar.domain.Prompt;
import app.lumastar.domain.SkillArea;
import app.lumastar.domain.SkillTag;
import app.lumastar.domain.SkillTagDefinition;
import app.lumastar.domain.Stage;
import app.lumastar.domain.Unit;
import app.lumastar.domain.UnitColor;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * A complete, predictable content set for API tests, independent of the evolving repository content. Every stage
 * {@code <key>} (e.g. {@code a1_1}) has
 * <ul>
 *   <li>the tags {@code vocab.<key>}, {@code grammar.<key>}, {@code phrase.<key>} and {@code reading.<key>},</li>
 *   <li>two units: {@code <key>_words} (vocab, 4 lessons) and {@code <key>_grammar} (grammar and phrase, 5 lessons);
 *       only the word units of A0 and A1.1 have exercises (three each, tagged {@code vocab.<key>}),</li>
 *   <li>six placement items like the real bank: two vocabulary, two grammar, one translation and one reading item
 *       (a second translation item below A2.1). Every exercise is a multiple choice whose solution is "ja".</li>
 * </ul>
 */
public final class SyntheticContent {

    private SyntheticContent() {
    }

    public static ContentBundle bundle() {
        List<Stage> stages = new ArrayList<>();
        List<SkillTagDefinition> tags = new ArrayList<>();
        List<Exercise> placement = new ArrayList<>();
        for (Level level : Level.values()) {
            String key = key(level);
            tags.add(new SkillTagDefinition(vocab(level), "Wortschatz " + level.code(), SkillArea.VOCAB));
            tags.add(new SkillTagDefinition(grammar(level), "Grammatik " + level.code(), SkillArea.GRAMMAR));
            tags.add(new SkillTagDefinition(phrase(level), "Wendungen " + level.code(), SkillArea.PHRASE));
            tags.add(new SkillTagDefinition(reading(level), "Lesen " + level.code(), SkillArea.READING));
            boolean playable = level == Level.A0 || level == Level.A1_1;
            List<Exercise> exercises = playable
                    ? List.of(exercise("ex_" + key + "_001", level, vocab(level), null),
                            exercise("ex_" + key + "_002", level, vocab(level), null),
                            exercise("ex_" + key + "_003", level, vocab(level), null))
                    : List.of();
            stages.add(new Stage(level, "Stufe " + level.code(), List.of(
                    unit(wordsUnit(level), level, "Wörter " + level.code(), List.of(vocab(level)), UnitColor.VIOLET, 4, exercises),
                    unit(grammarUnit(level), level, "Grammatik " + level.code(), List.of(grammar(level), phrase(level)),
                            UnitColor.TEAL, 5, List.of()))));
            boolean withReading = !Level.A2_1.isAbove(level);
            placement.add(exercise("pl_" + key + "_001", level, vocab(level), Competence.VOCABULARY));
            placement.add(exercise("pl_" + key + "_002", level, vocab(level), Competence.VOCABULARY));
            placement.add(exercise("pl_" + key + "_003", level, grammar(level), Competence.GRAMMAR));
            placement.add(exercise("pl_" + key + "_004", level, grammar(level), Competence.GRAMMAR));
            placement.add(exercise("pl_" + key + "_005", level, phrase(level), Competence.TRANSLATION));
            placement.add(withReading
                    ? exercise("pl_" + key + "_006", level, reading(level), Competence.READING)
                    : exercise("pl_" + key + "_006", level, phrase(level), Competence.TRANSLATION));
        }
        return new ContentBundle(new Curriculum("gheg-kosovo", stages), tags, placement);
    }

    public static String wordsUnit(Level level) {
        return key(level) + "_words";
    }

    public static String grammarUnit(Level level) {
        return key(level) + "_grammar";
    }

    public static SkillTag vocab(Level level) {
        return SkillTag.of("vocab." + key(level));
    }

    public static SkillTag grammar(Level level) {
        return SkillTag.of("grammar." + key(level));
    }

    public static SkillTag phrase(Level level) {
        return SkillTag.of("phrase." + key(level));
    }

    public static SkillTag reading(Level level) {
        return SkillTag.of("reading." + key(level));
    }

    private static String key(Level level) {
        return level.code().toLowerCase(Locale.ROOT).replace('.', '_');
    }

    private static Unit unit(String id, Level level, String title, List<SkillTag> tags, UnitColor color, int lessons,
                             List<Exercise> exercises) {
        return new Unit(id, level, title, null, List.of(), tags, color, "star", lessons, List.of(), List.of(), exercises);
    }

    private static Exercise exercise(String id, Level level, SkillTag tag, Competence competence) {
        return new Exercise(id, level, 1, List.of(tag), List.of(), competence, new Prompt(AnswerLang.GERMAN, "Was heisst „po“?"),
                "„Po“ heisst „ja“.", List.of(), ExerciseSource.MANUAL, false, null,
                new ExercisePayload.MultipleChoice(List.of("ja", "nein", "danke", "bitte"), List.of("ja")));
    }
}
