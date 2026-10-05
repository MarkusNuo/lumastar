package app.lingora.core.plan;

import app.lingora.domain.LearnerProfile;
import app.lingora.domain.LearningPlan;
import app.lingora.domain.LearningPlan.PlanStage;
import app.lingora.domain.LearningPlan.PlanUnit;
import app.lingora.domain.Level;
import app.lingora.domain.PlanUnitStatus;
import app.lingora.domain.SkillMastery;
import app.lingora.domain.SkillTag;
import app.lingora.domain.Stage;
import app.lingora.domain.Unit;
import app.lingora.domain.UnitColor;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Stream;

/**
 * A small curriculum for the plan tests:
 * <pre>
 * A1.2  a1_food (vocab.food, 5)       a1_home (vocab.home + grammar.prepositions, 4)
 * A1.3  a1_infinitive (grammar.infinitive, 4)   a1_review (no tags, no estimate → 4)
 * A2.1  a2_past (grammar.past, 5)
 * B1.1  b1_opinions (phrase.opinions, 6)
 * </pre>
 */
final class PlanFixtures {

    static final Instant NOW = Instant.parse("2026-09-25T10:05:00.123Z");
    static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

    static final SkillTag FOOD = SkillTag.of("vocab.food");
    static final SkillTag HOME = SkillTag.of("vocab.home");
    static final SkillTag PREPOSITIONS = SkillTag.of("grammar.prepositions");
    static final SkillTag INFINITIVE = SkillTag.of("grammar.infinitive");
    static final SkillTag PAST = SkillTag.of("grammar.past");
    static final SkillTag OPINIONS = SkillTag.of("phrase.opinions");
    static final SkillTag ARTICLE = SkillTag.of("grammar.definite_article.fem");

    static final Map<SkillTag, String> LABELS = Map.of(
            FOOD, "Essen", HOME, "Zuhause", PREPOSITIONS, "Präpositionen", INFINITIVE, "Infinitiv me + Partizip",
            PAST, "Vergangenheit", OPINIONS, "Meinungen", ARTICLE, "Bestimmter Artikel (feminin)");

    static final List<Stage> CURRICULUM = List.of(
            new Stage(Level.A1_2, "Alltag zu Hause", List.of(
                    unit("a1_food", Level.A1_2, "Essen & Trinken", 5, FOOD),
                    unit("a1_home", Level.A1_2, "Zuhause", 4, HOME, PREPOSITIONS))),
            new Stage(Level.A1_3, "Tun & beschreiben", List.of(
                    unit("a1_infinitive", Level.A1_3, "Infinitiv me", 4, INFINITIVE),
                    unit("a1_review", Level.A1_3, "Wiederholung", null))),
            new Stage(Level.A2_1, "Mein Alltag", List.of(unit("a2_past", Level.A2_1, "Vergangenheit", 5, PAST))),
            new Stage(Level.B1_1, "Erzählen & wohnen", List.of(unit("b1_opinions", Level.B1_1, "Meinungen", 6, OPINIONS))));

    private PlanFixtures() {
    }

    /** Estimates by the lessons alone, so that the small curriculum shows their effect. */
    static final EstimateRules LESSONS_ONLY = new EstimateRules(4, 0, 0, 0, 0, 0, 0);

    static RuleBasedPlanGenerator generator() {
        return generator(LESSONS_ONLY);
    }

    static RuleBasedPlanGenerator generator(EstimateRules rules) {
        return new RuleBasedPlanGenerator(CURRICULUM, LABELS, CLOCK, rules);
    }

    static LearnerProfile learner(Level level, int dailyGoalMinutes) {
        return new LearnerProfile(UUID.fromString("00000000-0000-0000-0000-000000000001"), "Erza", Set.of(),
                dailyGoalMinutes, level, 0);
    }

    /** Mastery values given as tag, value, tag, value, … */
    static SkillMastery mastery(Object... tagsAndValues) {
        Map<SkillTag, SkillMastery.Entry> entries = new HashMap<>();
        for (int i = 0; i < tagsAndValues.length; i += 2) {
            entries.put((SkillTag) tagsAndValues[i], new SkillMastery.Entry((Double) tagsAndValues[i + 1], 0, 0, null));
        }
        return new SkillMastery(entries);
    }

    static SkillMastery noMastery() {
        return new SkillMastery(Map.of());
    }

    /** The plan with the given statuses applied, as a live overlay would pass it to revise. */
    static LearningPlan withStatuses(LearningPlan plan, Map<String, PlanUnitStatus> statuses) {
        return new LearningPlan(plan.generatedAt(), plan.generatedBy(), plan.startLevel(),
                plan.stages().stream()
                        .map(stage -> new PlanStage(stage.level(), stage.units().stream()
                                .map(unit -> unit.withStatus(statuses.getOrDefault(unit.unitId(), unit.status())))
                                .toList()))
                        .toList(),
                plan.estimates());
    }

    /** The plan with {@code extra} units appended to the stage of {@code level}. */
    static LearningPlan withUnits(LearningPlan plan, Level level, PlanUnit... extra) {
        return new LearningPlan(plan.generatedAt(), plan.generatedBy(), plan.startLevel(),
                plan.stages().stream()
                        .map(stage -> stage.level() != level ? stage : new PlanStage(stage.level(),
                                Stream.concat(stage.units().stream(), Arrays.stream(extra)).toList()))
                        .toList(),
                plan.estimates());
    }

    static List<String> unitIds(LearningPlan plan) {
        return plan.units().map(PlanUnit::unitId).toList();
    }

    private static Unit unit(String id, Level level, String title, Integer lessons, SkillTag... tags) {
        return new Unit(id, level, title, null, List.of(), List.of(tags), UnitColor.VIOLET, null, lessons, List.of(), List.of(),
                List.of());
    }
}
