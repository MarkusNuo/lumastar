package app.lingora.core.lesson;

import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.domain.AnswerLang;
import app.lingora.domain.Exercise;
import app.lingora.domain.ExercisePayload;
import app.lingora.domain.ExerciseSource;
import app.lingora.domain.ExerciseType;
import app.lingora.domain.LearnerProfile;
import app.lingora.domain.Level;
import app.lingora.domain.MatchPair;
import app.lingora.domain.Prompt;
import app.lingora.domain.SkillMastery;
import app.lingora.domain.SkillTag;
import app.lingora.domain.Unit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.UUID;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class RuleBasedLessonComposerTest {

    private static final LearnerProfile LEARNER = new LearnerProfile(UUID.randomUUID(), "Erza", Set.of(), 10, Level.A1_1, 0);
    private static final List<ExerciseType> P0_TYPES = List.of(ExerciseType.MULTIPLE_CHOICE, ExerciseType.TRANSLATE_WORDBANK,
            ExerciseType.TRANSLATE_FREE, ExerciseType.FILL_GAP, ExerciseType.MATCH_PAIRS, ExerciseType.WORD_ORDER);

    private final List<Exercise> exercises = new ArrayList<>();

    @Test
    void takesAllExercisesOfASmallUnit() {
        add(ExerciseType.TRANSLATE_FREE, 2, 3);
        add(ExerciseType.MULTIPLE_CHOICE, 1, 2);

        assertThat(compose(1)).containsExactlyInAnyOrderElementsOf(exercises);
    }

    @Test
    void takesTwelveDistinctExercisesOfALargeUnit() {
        P0_TYPES.forEach(type -> add(type, 1, 4));

        List<Exercise> lesson = compose(1);

        assertThat(lesson).hasSize(RuleBasedLessonComposer.LESSON_SIZE).doesNotHaveDuplicates();
        assertThat(exercises).containsAll(lesson);
    }

    @Test
    void ordersByRisingDifficulty() {
        P0_TYPES.forEach(type -> {
            add(type, 3, 1);
            add(type, 1, 1);
            add(type, 2, 1);
        });

        for (int seed = 0; seed < 20; seed++) {
            assertThat(compose(seed).stream().map(Exercise::difficulty).toList()).isSorted();
        }
    }

    @Test
    void showsEveryTypeOfTheUnit() {
        add(ExerciseType.TRANSLATE_FREE, 1, 15);
        P0_TYPES.stream().filter(type -> type != ExerciseType.TRANSLATE_FREE).forEach(type -> add(type, 1, 1));

        for (int seed = 0; seed < 20; seed++) {
            assertThat(compose(seed).stream().map(Exercise::type).distinct()).containsExactlyInAnyOrderElementsOf(P0_TYPES);
        }
    }

    @Test
    void alternatesTypesWherePossible() {
        add(ExerciseType.MULTIPLE_CHOICE, 1, 6);
        add(ExerciseType.TRANSLATE_FREE, 1, 6);

        for (int seed = 0; seed < 20; seed++) {
            List<Exercise> lesson = compose(seed);
            IntStream.range(1, lesson.size())
                    .forEach(i -> assertThat(lesson.get(i).type()).isNotEqualTo(lesson.get(i - 1).type()));
        }
    }

    @Test
    void isDeterministicForAGivenSeedAndVariesAcrossSeeds() {
        P0_TYPES.forEach(type -> add(type, 1, 3));

        assertThat(compose(42)).isEqualTo(compose(42));
        assertThat(IntStream.range(0, 10).mapToObj(this::compose).distinct().count()).isGreaterThan(1);
    }

    @Test
    void composesNothingForASkeletonUnit() {
        assertThat(compose(1)).isEmpty();
    }

    private List<Exercise> compose(int seed) {
        Unit unit = new Unit("a1_u01_greetings", Level.A1_1, "Begrüssung", null, List.of(), List.of(), null, null, null,
                List.of(), List.of(), exercises);
        return new RuleBasedLessonComposer(new Random(seed))
                .compose(unit, LEARNER, new SkillMastery(Map.of()), List.of(), List.of());
    }

    private void add(ExerciseType type, int difficulty, int count) {
        for (int i = 0; i < count; i++) {
            String id = "ex_a1_u01_greetings_%03d".formatted(exercises.size() + 1);
            exercises.add(new Exercise(id, Level.A1_1, difficulty, List.of(SkillTag.of("vocab.greetings")), List.of(), null,
                    new Prompt(AnswerLang.GERMAN, "Aufgabe " + id), "Erklärung.", List.of(), ExerciseSource.MANUAL, false,
                    null, payload(type)));
        }
    }

    private static ExercisePayload payload(ExerciseType type) {
        return switch (type) {
            case MULTIPLE_CHOICE -> new ExercisePayload.MultipleChoice(List.of("po", "jo", "mirë", "si"), List.of("po"));
            case TRANSLATE_WORDBANK -> new ExercisePayload.TranslateWordbank(AnswerLang.GHEG, List.of("Mirë jam."),
                    List.of("Mirë", "jam", "je", "jeni"));
            case TRANSLATE_FREE -> new ExercisePayload.TranslateFree(AnswerLang.GHEG, List.of("Si je?"), List.of());
            case FILL_GAP -> new ExercisePayload.FillGap(AnswerLang.GHEG, "Mirë ___.", List.of("jam"), List.of(), List.of());
            case MATCH_PAIRS -> new ExercisePayload.MatchPairs(List.of(new MatchPair("po", "ja"), new MatchPair("jo", "nein"),
                    new MatchPair("mirë", "gut"), new MatchPair("si", "wie"), new MatchPair("jam", "ich bin")));
            case WORD_ORDER -> new ExercisePayload.WordOrder(AnswerLang.GHEG, List.of("Mirë", "jam"), List.of("Mirë jam."));
            default -> throw new IllegalArgumentException("no test payload for " + type);
        };
    }
}
