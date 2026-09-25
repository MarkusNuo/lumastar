package app.lingora.core.lesson;

import app.lingora.domain.ErrorEntry;
import app.lingora.domain.Exercise;
import app.lingora.domain.LearnerProfile;
import app.lingora.domain.SkillMastery;
import app.lingora.domain.SrsCard;
import app.lingora.domain.Unit;
import java.util.List;

/** Composes each lesson from new content, weak spots and due reviews (PRD F7). */
public interface LessonComposer {

    List<Exercise> compose(Unit unit, LearnerProfile profile, SkillMastery mastery, List<SrsCard> due, List<ErrorEntry> errors);
}
