package app.lingora.core.lesson;

import app.lingora.core.plan.FocusRequest;
import app.lingora.domain.SkillTag;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;

/**
 * PRD F7: a skill tag with at least {@value #MIN_WRONG_ANSWERS} wrong first answers in one lesson suggests a focus
 * lesson. Only tags that lesson exercises at or below the learner's level practise qualify, since a focus lesson is
 * made of them; of several, the one with the most wrong answers wins, then the first by id.
 */
public final class FocusSuggestion {

    public static final int MIN_WRONG_ANSWERS = 3;

    private FocusSuggestion() {
    }

    /** The first answer to one exercise of the lesson: the tags of the exercise and whether it was wrong. */
    public record FirstAnswer(List<SkillTag> tags, boolean wrong) {

        public FirstAnswer {
            tags = List.copyOf(tags);
        }
    }

    public static Optional<FocusRequest> of(List<FirstAnswer> firstAnswers, Set<SkillTag> practisable) {
        Map<SkillTag, Integer> wrongByTag = new TreeMap<>(Comparator.comparing(SkillTag::id));
        firstAnswers.stream()
                .filter(FirstAnswer::wrong)
                .flatMap(answer -> answer.tags().stream())
                .filter(practisable::contains)
                .forEach(tag -> wrongByTag.merge(tag, 1, Integer::sum));
        return wrongByTag.entrySet().stream()
                .filter(entry -> entry.getValue() >= MIN_WRONG_ANSWERS)
                .max(Map.Entry.<SkillTag, Integer>comparingByValue()
                        .thenComparing(Map.Entry.comparingByKey(Comparator.comparing(SkillTag::id).reversed())))
                .map(entry -> new FocusRequest(entry.getKey(), entry.getValue()));
    }
}
