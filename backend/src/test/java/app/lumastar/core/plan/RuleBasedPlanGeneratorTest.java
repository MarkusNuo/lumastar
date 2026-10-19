package app.lumastar.core.plan;

import static app.lumastar.core.plan.PlanFixtures.ARTICLE;
import static app.lumastar.core.plan.PlanFixtures.FOOD;
import static app.lumastar.core.plan.PlanFixtures.HOME;
import static app.lumastar.core.plan.PlanFixtures.INFINITIVE;
import static app.lumastar.core.plan.PlanFixtures.OPINIONS;
import static app.lumastar.core.plan.PlanFixtures.PAST;
import static app.lumastar.core.plan.PlanFixtures.PREPOSITIONS;
import static app.lumastar.core.plan.PlanFixtures.learner;
import static app.lumastar.core.plan.PlanFixtures.mastery;
import static app.lumastar.core.plan.PlanFixtures.noMastery;
import static app.lumastar.core.plan.PlanFixtures.unitIds;
import static app.lumastar.core.plan.PlanFixtures.withStatuses;
import static app.lumastar.core.plan.PlanFixtures.withUnits;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import app.lumastar.domain.CefrBand;
import app.lumastar.domain.LearningPlan;
import app.lumastar.domain.LearningPlan.PlanUnit;
import app.lumastar.domain.Level;
import app.lumastar.domain.PlanUnitStatus;
import app.lumastar.domain.SkillTagErrorRate;
import app.lumastar.domain.Stage;
import app.lumastar.domain.Unit;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

class RuleBasedPlanGeneratorTest {

    private final RuleBasedPlanGenerator generator = PlanFixtures.generator();

    private PlanUnit unit(LearningPlan plan, String unitId) {
        return plan.unit(unitId).orElseThrow();
    }

    @Nested
    class Generate {

        @Test
        void coversEveryStageFromTheCurrentLevelInCurriculumOrder() {
            LearningPlan plan = generator.generate(learner(Level.A1_3, 10), noMastery());

            assertThat(plan.stages()).extracting(LearningPlan.PlanStage::level).containsExactly(Level.A1_3, Level.A2_1, Level.B1_1);
            assertThat(unitIds(plan)).containsExactly("a1_infinitive", "a1_review", "a2_past", "b1_opinions");
            assertThat(plan.units()).allSatisfy(unit -> assertThat(unit.status()).isEqualTo(PlanUnitStatus.PLANNED));
            assertThat(plan.startLevel()).isEqualTo(Level.A1_3);
            assertThat(plan.generatedBy()).isEqualTo("rule_based_v1");
            assertThat(plan.generatedAt()).isEqualTo(Instant.parse("2026-09-25T10:05:00Z"));
        }

        @Test
        void takesTheLessonEstimatesOfTheCurriculum() {
            LearningPlan plan = generator.generate(learner(Level.A1_2, 10), noMastery());

            assertThat(unit(plan, "a1_food")).isEqualTo(new PlanUnit("a1_food", "Essen & Trinken", PlanUnitStatus.PLANNED, 5, null));
            assertThat(unit(plan, "a1_review").estimatedLessons()).isEqualTo(RuleBasedPlanGenerator.DEFAULT_LESSONS_PER_UNIT);
        }

        @Test
        void skipsUnitsWhoseTagsAreAllMastered() {
            LearningPlan plan = generator.generate(learner(Level.A1_2, 10),
                    mastery(FOOD, 0.8, HOME, 0.95, PREPOSITIONS, 0.79, INFINITIVE, 0.9));

            assertThat(unit(plan, "a1_food")).isEqualTo(
                    new PlanUnit("a1_food", "Essen & Trinken", PlanUnitStatus.SKIPPED, 5, "Bereits beherrscht"));
            assertThat(unit(plan, "a1_home").status()).isEqualTo(PlanUnitStatus.PLANNED);
            assertThat(unit(plan, "a1_infinitive").status()).isEqualTo(PlanUnitStatus.SKIPPED);
            assertThat(unit(plan, "a1_review").status()).as("a unit without tags").isEqualTo(PlanUnitStatus.PLANNED);
        }

        @Test
        void doesNotShortenPartlyMasteredUnits() {
            LearningPlan plan = generator.generate(learner(Level.A1_2, 10), mastery(HOME, 0.9));

            assertThat(unit(plan, "a1_home").estimatedLessons()).isEqualTo(4);
        }

        @Test
        void needsThePlacedLevel() {
            assertThatIllegalArgumentException().isThrownBy(() -> generator.generate(learner(null, 10), noMastery()));
        }
    }

    @Nested
    class Estimates {

        @Test
        void dateEveryCefrBandByTheLessonsLeftAtTheDailyGoal() {
            // A1: 5 + 4 + 4 + 4 lessons × 4 min = 68 min → 7 days; A2: +5 → 9 days; B1: +6 → 12 days
            LearningPlan plan = generator.generate(learner(Level.A1_2, 10), noMastery());

            assertThat(plan.estimates()).containsExactly(
                    Map.entry(CefrBand.A1, LocalDate.parse("2026-10-02")),
                    Map.entry(CefrBand.A2, LocalDate.parse("2026-10-04")),
                    Map.entry(CefrBand.B1, LocalDate.parse("2026-10-07")));
        }

        @Test
        void aLongerDailyGoalGetsThereSooner() {
            LearningPlan plan = generator.generate(learner(Level.A1_2, 20), noMastery());

            assertThat(plan.estimates().get(CefrBand.A1)).isEqualTo(LocalDate.parse("2026-09-29"));
            assertThat(plan.estimates().get(CefrBand.B1)).isEqualTo(LocalDate.parse("2026-10-01"));
        }

        @Test
        void skippedUnitsTakeNoTime() {
            LearningPlan plan = generator.generate(learner(Level.A1_2, 10), mastery(FOOD, 0.9));

            // 4 + 4 + 4 lessons × 4 min = 48 min → 5 days
            assertThat(plan.estimates().get(CefrBand.A1)).isEqualTo(LocalDate.parse("2026-09-30"));
        }

        @Test
        void aBeginnerNeedsTheGuidedLearningHoursOfEveryBand() {
            LearningPlan plan = PlanFixtures.generator(EstimateRules.DEFAULT).generate(learner(Level.A0, 10), noMastery());

            // A1 90 h, A2 190 h, B1 375 h from zero at 10 minutes a day: 540, 1140 and 2250 days
            assertThat(plan.estimates()).containsExactly(
                    Map.entry(CefrBand.A1, LocalDate.parse("2028-03-18")),
                    Map.entry(CefrBand.A2, LocalDate.parse("2029-11-08")),
                    Map.entry(CefrBand.B1, LocalDate.parse("2032-11-22")));
        }

        @Test
        void theGuidedLearningHoursStartAtTheLearnersStage() {
            LearningPlan plan = PlanFixtures.generator(EstimateRules.DEFAULT).generate(learner(Level.A1_2, 15), noMastery());

            // A1.2 starts a third into A1 (30 h): 60, 160 and 345 h left at 15 minutes a day
            assertThat(plan.estimates()).containsExactly(
                    Map.entry(CefrBand.A1, LocalDate.parse("2027-05-23")),
                    Map.entry(CefrBand.A2, LocalDate.parse("2028-06-26")),
                    Map.entry(CefrBand.B1, LocalDate.parse("2030-07-06")));
        }

        @Test
        void theLessonsCountWhenTheyTakeLongerThanTheHours() {
            EstimateRules fewHours = new EstimateRules(4, 1, 1, 1, 1, 1, 1);

            assertThat(PlanFixtures.generator(fewHours).generate(learner(Level.A1_2, 10), noMastery()).estimates())
                    .isEqualTo(generator.generate(learner(Level.A1_2, 10), noMastery()).estimates());
        }

        @Test
        void aBandAlreadyDoneIsReachedToday() {
            LearningPlan plan = generator.generate(learner(Level.A1_3, 10), mastery(INFINITIVE, 0.9));
            LearningPlan done = generator.revise(withStatuses(plan, Map.of("a1_review", PlanUnitStatus.COMPLETED)),
                    learner(Level.A1_3, 10), mastery(INFINITIVE, 0.9), List.of(), List.of());

            assertThat(done.estimates().get(CefrBand.A1)).isEqualTo(LocalDate.parse("2026-09-25"));
            assertThat(done.estimates()).doesNotContainKey(CefrBand.A0);
        }
    }

    @Nested
    class Revise {

        private final LearningPlan first = generator.generate(learner(Level.A1_2, 10), noMastery());

        @Test
        void keepsTheProgressOfThePreviousPlan() {
            LearningPlan live = withStatuses(first, Map.of("a1_food", PlanUnitStatus.COMPLETED,
                    "a1_home", PlanUnitStatus.IN_PROGRESS));

            LearningPlan revised = generator.revise(live, learner(Level.A1_2, 10), mastery(FOOD, 0.95), List.of(), List.of());

            assertThat(unit(revised, "a1_food").status()).isEqualTo(PlanUnitStatus.COMPLETED);
            assertThat(unit(revised, "a1_home").status()).isEqualTo(PlanUnitStatus.IN_PROGRESS);
            assertThat(unit(revised, "a1_infinitive").status()).isEqualTo(PlanUnitStatus.PLANNED);
        }

        @Test
        void neverSkipsTheUnitInProgressButShortensItOnceMastered() {
            LearningPlan live = withStatuses(first, Map.of("a1_food", PlanUnitStatus.IN_PROGRESS));

            LearningPlan revised = generator.revise(live, learner(Level.A1_2, 10), mastery(FOOD, 0.85), List.of(), List.of());

            assertThat(unit(revised, "a1_food")).isEqualTo(new PlanUnit("a1_food", "Essen & Trinken", PlanUnitStatus.IN_PROGRESS,
                    4, "Verkürzt: Essen bereits beherrscht"));
        }

        @Test
        void skipsAMasteredUnitStillToDo() {
            LearningPlan live = withStatuses(first, Map.of("a1_food", PlanUnitStatus.IN_PROGRESS));

            LearningPlan revised = generator.revise(live, learner(Level.A1_2, 10), mastery(HOME, 0.9, PREPOSITIONS, 0.85),
                    List.of(), List.of());

            assertThat(unit(revised, "a1_home")).isEqualTo(new PlanUnit("a1_home", "Zuhause", PlanUnitStatus.SKIPPED, 4,
                    "Bereits beherrscht"));
        }

        @Test
        void aCompletedUnitKeepsItsLessonsAndOnlyAReasonThatStillApplies() {
            LearningPlan skippedThenPlayed = withStatuses(generator.generate(learner(Level.A1_2, 10), mastery(FOOD, 0.9)),
                    Map.of("a1_food", PlanUnitStatus.COMPLETED));
            LearningPlan shortenedThenPlayed = withStatuses(
                    generator.revise(first, learner(Level.A1_2, 10), mastery(HOME, 0.9), List.of(), List.of()),
                    Map.of("a1_home", PlanUnitStatus.COMPLETED));

            assertThat(unit(generator.revise(skippedThenPlayed, learner(Level.A1_2, 10), mastery(FOOD, 0.9), List.of(),
                    List.of()), "a1_food")).isEqualTo(new PlanUnit("a1_food", "Essen & Trinken", PlanUnitStatus.COMPLETED, 5,
                    null));
            assertThat(unit(generator.revise(shortenedThenPlayed, learner(Level.A1_2, 10), noMastery(), List.of(), List.of()),
                    "a1_home")).isEqualTo(new PlanUnit("a1_home", "Zuhause", PlanUnitStatus.COMPLETED, 3,
                    "Verkürzt: Zuhause bereits beherrscht"));
        }

        @Test
        void shortensAPartlyMasteredUnitByOneLesson() {
            LearningPlan revised = generator.revise(first, learner(Level.A1_2, 10), mastery(HOME, 0.9), List.of(), List.of());

            assertThat(unit(revised, "a1_home")).isEqualTo(new PlanUnit("a1_home", "Zuhause", PlanUnitStatus.PLANNED, 3,
                    "Verkürzt: Zuhause bereits beherrscht"));
            assertThat(unit(revised, "a1_food").estimatedLessons()).isEqualTo(5);
        }

        @Test
        void neitherShortensCompletedUnitsNorBelowOneLesson() {
            List<Stage> oneLesson = List.of(new Stage(Level.A1_2, "Alltag", List.of(
                    new Unit("a1_short", Level.A1_2, "Kurz", null, List.of(), List.of(FOOD, HOME), null,
                            null, 1, List.of(), List.of(), List.of()))));
            RuleBasedPlanGenerator shortCurriculum = new RuleBasedPlanGenerator(oneLesson, PlanFixtures.LABELS, PlanFixtures.CLOCK);
            LearningPlan plan = shortCurriculum.generate(learner(Level.A1_2, 10), noMastery());

            assertThat(unit(shortCurriculum.revise(plan, learner(Level.A1_2, 10), mastery(FOOD, 0.9), List.of(), List.of()),
                    "a1_short").estimatedLessons()).isEqualTo(1);
            LearningPlan completed = withStatuses(first, Map.of("a1_home", PlanUnitStatus.COMPLETED));
            assertThat(unit(generator.revise(completed, learner(Level.A1_2, 10), mastery(HOME, 0.9), List.of(), List.of()),
                    "a1_home").estimatedLessons()).isEqualTo(4);
        }

        @Test
        void startsAtTheNewLevelAfterAReplacement() {
            LearningPlan revised = generator.revise(first, learner(Level.A2_1, 10), noMastery(), List.of(), List.of());

            assertThat(revised.startLevel()).isEqualTo(Level.A2_1);
            assertThat(unitIds(revised)).containsExactly("a2_past", "b1_opinions");
        }
    }

    @Nested
    class FocusUnits {

        private final LearningPlan live = withStatuses(generator.generate(learner(Level.A1_2, 10), noMastery()),
                Map.of("a1_food", PlanUnitStatus.COMPLETED, "a1_home", PlanUnitStatus.IN_PROGRESS));

        private LearningPlan revise(LearningPlan plan, SkillTagErrorRate... rates) {
            return generator.revise(plan, learner(Level.A1_2, 10), noMastery(), List.of(rates), List.of());
        }

        @Test
        void insertsAFocusUnitForAWeakTagRightAfterTheUnitInProgress() {
            LearningPlan revised = revise(live, new SkillTagErrorRate(INFINITIVE, 11, 5));

            assertThat(unitIds(revised)).containsExactly("a1_food", "a1_home", "focus_grammar.infinitive_1", "a1_infinitive",
                    "a1_review", "a2_past", "b1_opinions");
            assertThat(unit(revised, "focus_grammar.infinitive_1")).isEqualTo(new PlanUnit("focus_grammar.infinitive_1",
                    "Fokus: Infinitiv me + Partizip", PlanUnitStatus.PLANNED, 1, "Fehlerquote 45 % bei Infinitiv me + Partizip"));
        }

        @Test
        void insertsTheFocusUnitALessonAskedForBeforeTheWeakTags() {
            LearningPlan revised = generator.revise(live, learner(Level.A1_2, 10), noMastery(),
                    List.of(new SkillTagErrorRate(INFINITIVE, 10, 8), new SkillTagErrorRate(ARTICLE, 10, 6)),
                    List.of(new FocusRequest(PAST, 3)));

            assertThat(unitIds(revised)).containsExactly("a1_food", "a1_home", "focus_grammar.past_1",
                    "focus_grammar.infinitive_1", "a1_infinitive", "a1_review", "a2_past", "b1_opinions");
            assertThat(unit(revised, "focus_grammar.past_1")).isEqualTo(new PlanUnit("focus_grammar.past_1",
                    "Fokus: Vergangenheit", PlanUnitStatus.PLANNED, 1, "3 Fehler in einer Lektion bei Vergangenheit"));
        }

        @Test
        void aRequestedTagWithAnOpenFocusUnitGetsNoSecondOne() {
            LearningPlan withFocus = revise(live, new SkillTagErrorRate(INFINITIVE, 11, 5));

            LearningPlan revised = generator.revise(withFocus, learner(Level.A1_2, 10), noMastery(), List.of(),
                    List.of(new FocusRequest(INFINITIVE, 4)));

            assertThat(unitIds(revised)).filteredOn(unitId -> unitId.startsWith("focus_")).containsExactly("focus_grammar.infinitive_1");
        }

        @Test
        void aRequestTakesThePlaceOfTheOldestOpenFocusUnitWhoseTagIsNoLongerWeak() {
            LearningPlan full = revise(live, new SkillTagErrorRate(ARTICLE, 10, 9), new SkillTagErrorRate(INFINITIVE, 10, 8));

            LearningPlan revised = generator.revise(full, learner(Level.A1_2, 10), noMastery(),
                    List.of(new SkillTagErrorRate(INFINITIVE, 10, 8)), List.of(new FocusRequest(PAST, 3)));

            assertThat(full.units().filter(PlanUnit::isFocus).map(PlanUnit::unitId))
                    .containsExactly("focus_grammar.definite_article.fem_1", "focus_grammar.infinitive_1");
            assertThat(revised.units().filter(PlanUnit::isFocus).map(PlanUnit::unitId))
                    .containsExactly("focus_grammar.infinitive_1", "focus_grammar.past_1");
        }

        @Test
        void aRequestTakesThePlaceOfTheOldestOpenFocusUnitWhenAllAreStillWeak() {
            List<SkillTagErrorRate> weak = List.of(new SkillTagErrorRate(ARTICLE, 10, 9), new SkillTagErrorRate(INFINITIVE, 10, 8));
            LearningPlan full = generator.revise(live, learner(Level.A1_2, 10), noMastery(), weak, List.of());
            LearningPlan movedOn = withStatuses(full, Map.of("a1_home", PlanUnitStatus.COMPLETED,
                    "a1_infinitive", PlanUnitStatus.IN_PROGRESS));

            LearningPlan revised = generator.revise(movedOn, learner(Level.A1_2, 10), noMastery(), weak,
                    List.of(new FocusRequest(PAST, 4)));

            assertThat(unitIds(revised)).containsExactly("a1_food", "a1_home", "focus_grammar.infinitive_1", "a1_infinitive",
                    "focus_grammar.past_1", "a1_review", "a2_past", "b1_opinions");
            assertThat(unit(revised, "focus_grammar.past_1").reason()).isEqualTo("4 Fehler in einer Lektion bei Vergangenheit");
        }

        @Test
        void countsTheFocusLessonsInTheEstimates() {
            LearningPlan revised = revise(live, new SkillTagErrorRate(INFINITIVE, 11, 5));

            // a1_food is completed: 4 + 1 + 4 + 4 lessons × 4 min = 52 min → 6 days
            assertThat(revised.estimates().get(CefrBand.A1)).isEqualTo(LocalDate.parse("2026-10-01"));
        }

        @Test
        void needAtLeastFiveAnswersAndFortyPercentErrors() {
            LearningPlan revised = revise(live, new SkillTagErrorRate(INFINITIVE, 4, 4), new SkillTagErrorRate(PAST, 10, 3),
                    new SkillTagErrorRate(OPINIONS, 5, 2));

            assertThat(unitIds(revised)).containsExactly("a1_food", "a1_home", "focus_phrase.opinions_1", "a1_infinitive",
                    "a1_review", "a2_past", "b1_opinions");
        }

        @Test
        void insertsAtMostTwoForTheWeakestTags() {
            LearningPlan revised = revise(live, new SkillTagErrorRate(PAST, 10, 5), new SkillTagErrorRate(INFINITIVE, 10, 8),
                    new SkillTagErrorRate(ARTICLE, 10, 6));

            assertThat(revised.units().filter(PlanUnit::isFocus).map(PlanUnit::unitId))
                    .containsExactly("focus_grammar.infinitive_1", "focus_grammar.definite_article.fem_1");
        }

        @Test
        void keepsOpenFocusUnitsAndCountsThemTowardsTheLimit() {
            LearningPlan withFocus = revise(live, new SkillTagErrorRate(INFINITIVE, 10, 8));

            LearningPlan revised = revise(withFocus, new SkillTagErrorRate(PAST, 10, 9), new SkillTagErrorRate(ARTICLE, 10, 7));

            assertThat(revised.units().filter(PlanUnit::isFocus).map(PlanUnit::unitId))
                    .containsExactly("focus_grammar.infinitive_1", "focus_grammar.past_1");
            assertThat(unit(revised, "focus_grammar.infinitive_1").reason()).isEqualTo("Fehlerquote 80 % bei Infinitiv me + Partizip");
        }

        @Test
        void updatesTheReasonOfAnOpenFocusUnitThatIsStillWeak() {
            LearningPlan withFocus = revise(live, new SkillTagErrorRate(INFINITIVE, 10, 8));

            LearningPlan revised = revise(withFocus, new SkillTagErrorRate(INFINITIVE, 20, 10));

            assertThat(unit(revised, "focus_grammar.infinitive_1").reason()).isEqualTo("Fehlerquote 50 % bei Infinitiv me + Partizip");
        }

        @Test
        void aCompletedFocusUnitLeavesThePlanAndTheNextOneGetsTheNextNumber() {
            LearningPlan withFocus = revise(live, new SkillTagErrorRate(INFINITIVE, 10, 8));
            LearningPlan done = withStatuses(withFocus, Map.of("focus_grammar.infinitive_1", PlanUnitStatus.COMPLETED));

            assertThat(unitIds(revise(done))).doesNotContain("focus_grammar.infinitive_1");
            assertThat(unitIds(revise(done, new SkillTagErrorRate(INFINITIVE, 12, 6))))
                    .contains("focus_grammar.infinitive_2")
                    .doesNotContain("focus_grammar.infinitive_1");
        }

        @Test
        void goBeforeTheFirstPlannedUnitWithoutAUnitInProgress() {
            LearningPlan planned = withStatuses(live, Map.of("a1_home", PlanUnitStatus.PLANNED));

            LearningPlan revised = revise(planned, new SkillTagErrorRate(INFINITIVE, 10, 8));

            assertThat(unitIds(revised)).startsWith("a1_food", "focus_grammar.infinitive_1", "a1_home");
        }

        @Test
        void goToTheEndWhenEverythingIsDone() {
            LearningPlan b1 = generator.generate(learner(Level.B1_1, 10), noMastery());
            LearningPlan done = withStatuses(b1, Map.of("b1_opinions", PlanUnitStatus.COMPLETED));

            LearningPlan revised = generator.revise(done, learner(Level.B1_1, 10), noMastery(),
                    List.of(new SkillTagErrorRate(PAST, 10, 8)), List.of());

            assertThat(unitIds(revised)).containsExactly("b1_opinions", "focus_grammar.past_1");
        }

        @Test
        void aFocusUnitOfAnotherGeneratorIsKeptWhileOpen() {
            PlanUnit foreign = new PlanUnit("focus_vocab.home_3", "Fokus: Zuhause", PlanUnitStatus.PLANNED, 2, "Viele Fehler");

            LearningPlan revised = revise(withUnits(live, Level.A1_3, foreign));

            assertThat(unit(revised, "focus_vocab.home_3")).isEqualTo(foreign);
            assertThat(unitIds(revised)).containsExactly("a1_food", "a1_home", "a1_infinitive", "a1_review",
                    "focus_vocab.home_3", "a2_past", "b1_opinions");
        }

        @Test
        void anOpenFocusUnitStaysAfterTheUnitItWasInsertedForWhileTheLearnerMovesOn() {
            LearningPlan withFocus = revise(live, new SkillTagErrorRate(INFINITIVE, 10, 8));
            LearningPlan movedOn = withStatuses(withFocus,
                    Map.of("a1_home", PlanUnitStatus.COMPLETED, "a1_infinitive", PlanUnitStatus.IN_PROGRESS));

            LearningPlan revised = revise(movedOn, new SkillTagErrorRate(PAST, 10, 9));

            assertThat(unitIds(revised)).containsExactly("a1_food", "a1_home", "focus_grammar.infinitive_1", "a1_infinitive",
                    "focus_grammar.past_1", "a1_review", "a2_past", "b1_opinions");
        }

        @Test
        void anOpenFocusUnitMovesToTheStartOfTheFirstStageAfterALevelUpAndStaysThere() {
            LearningPlan withFocus = revise(live, new SkillTagErrorRate(INFINITIVE, 10, 8));
            LearningPlan stageDone = withStatuses(withFocus, Map.of("a1_home", PlanUnitStatus.COMPLETED));

            LearningPlan levelledUp = generator.revise(stageDone, learner(Level.A1_3, 10), noMastery(), List.of(), List.of());
            LearningPlan later = generator.revise(withStatuses(levelledUp, Map.of("a1_infinitive", PlanUnitStatus.IN_PROGRESS)),
                    learner(Level.A1_3, 10), noMastery(), List.of(), List.of());

            assertThat(unitIds(levelledUp)).containsExactly("focus_grammar.infinitive_1", "a1_infinitive", "a1_review",
                    "a2_past", "b1_opinions");
            assertThat(unitIds(later)).isEqualTo(unitIds(levelledUp));
            LearningPlan progress = PlanProgress.apply(levelledUp, Map.of(), Set.of("focus_grammar.infinitive_1", "a1_infinitive"));
            assertThat(unit(progress, "focus_grammar.infinitive_1").status()).isEqualTo(PlanUnitStatus.PLANNED);
            assertThat(unit(progress, "a1_infinitive").status()).as("the focus unit holds nothing back")
                    .isEqualTo(PlanUnitStatus.IN_PROGRESS);
        }
    }
}
