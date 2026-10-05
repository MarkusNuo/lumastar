package app.lingora.core.lesson;

import app.lingora.domain.Exercise;
import app.lingora.domain.Stage;
import app.lingora.domain.Unit;
import java.util.List;

/**
 * Composes every lesson from the learner profile (PRD F7): new content, weak spots and due reviews. Unlike PRD 10.2,
 * the profile, mastery, due cards and recent errors arrive together as a {@link LessonContext}, and focus, review and
 * checkpoint lessons have their own compositions.
 */
public interface LessonComposer {

    /** A lesson of a curriculum unit. */
    List<Exercise> compose(Unit unit, LessonContext context);

    /** A focus lesson on a weak skill tag (PRD F3); {@code focusUnit} holds the exercises carrying the tag. */
    List<Exercise> composeFocus(Unit focusUnit, LessonContext context);

    /** A lesson of the due reviews (PRD F8); empty when nothing due can be practised. */
    List<Exercise> composeReview(LessonContext context);

    /** The checkpoint at the end of a stage (PRD chapter 5); {@code stage} holds its units with their exercises. */
    List<Exercise> composeCheckpoint(Stage stage, LessonContext context);
}
