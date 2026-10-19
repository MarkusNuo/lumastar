package app.lumastar.core.lesson;

import static org.assertj.core.api.Assertions.assertThat;

import app.lumastar.core.lesson.FocusSuggestion.FirstAnswer;
import app.lumastar.core.plan.FocusRequest;
import app.lumastar.domain.SkillTag;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import java.util.Set;
import org.junit.jupiter.api.Test;

class FocusSuggestionTest {

    private static final SkillTag CASES = SkillTag.of("grammar.case");
    private static final SkillTag CLITICS = SkillTag.of("grammar.clitics");
    private static final SkillTag FAMILY = SkillTag.of("vocab.family");
    private static final Set<SkillTag> PRACTISABLE = Set.of(CASES, CLITICS, FAMILY);

    @Test
    void threeWrongAnswersOnATagSuggestAFocusLesson() {
        List<FirstAnswer> answers = answers(wrong(CASES, FAMILY), wrong(CASES), right(CASES), wrong(CASES, CLITICS), wrong(FAMILY));

        assertThat(FocusSuggestion.of(answers, PRACTISABLE)).contains(new FocusRequest(CASES, 3));
    }

    @Test
    void twoWrongAnswersAreNotEnough() {
        assertThat(FocusSuggestion.of(answers(wrong(CASES), wrong(CASES), right(CASES), right(CASES)), PRACTISABLE)).isEmpty();
    }

    @Test
    void theTagWithMostWrongAnswersWinsThenTheFirstById() {
        assertThat(FocusSuggestion.of(answers(wrong(CLITICS, FAMILY), wrong(CLITICS, FAMILY), wrong(CLITICS, FAMILY),
                wrong(FAMILY)), PRACTISABLE)).contains(new FocusRequest(FAMILY, 4));
        assertThat(FocusSuggestion.of(answers(wrong(FAMILY, CLITICS), wrong(FAMILY, CLITICS), wrong(FAMILY, CLITICS)),
                PRACTISABLE)).contains(new FocusRequest(CLITICS, 3));
    }

    @Test
    void theSameAnswersInAnyOrderSuggestTheSameSingleTag() {
        List<FirstAnswer> answers = answers(wrong(FAMILY, CASES), wrong(CASES), wrong(FAMILY), wrong(CASES, CLITICS),
                wrong(FAMILY), wrong(CLITICS), wrong(CLITICS));

        for (int seed = 0; seed < 10; seed++) {
            Collections.shuffle(answers, new Random(seed));
            assertThat(FocusSuggestion.of(answers, PRACTISABLE)).contains(new FocusRequest(CASES, 3));
        }
    }

    @Test
    void onlyTagsThatLessonExercisesPractiseQualify() {
        assertThat(FocusSuggestion.of(answers(wrong(CASES), wrong(CASES), wrong(CASES)), Set.of(FAMILY))).isEmpty();
    }

    private static List<FirstAnswer> answers(FirstAnswer... answers) {
        return new ArrayList<>(List.of(answers));
    }

    private static FirstAnswer wrong(SkillTag... tags) {
        return new FirstAnswer(List.of(tags), true);
    }

    private static FirstAnswer right(SkillTag... tags) {
        return new FirstAnswer(List.of(tags), false);
    }
}
