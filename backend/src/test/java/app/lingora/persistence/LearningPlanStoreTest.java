package app.lingora.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import app.lingora.IntegrationTest;
import app.lingora.LearnerFixture;
import app.lingora.domain.CefrBand;
import app.lingora.domain.LearningPlan;
import app.lingora.domain.LearningPlan.PlanStage;
import app.lingora.domain.LearningPlan.PlanUnit;
import app.lingora.domain.Level;
import app.lingora.domain.PlanChange;
import app.lingora.domain.PlanChangeKind;
import app.lingora.domain.PlanTrigger;
import app.lingora.domain.PlanUnitStatus;
import app.lingora.persistence.LearningPlanStore.StoredPlan;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class LearningPlanStoreTest extends IntegrationTest {

    private static final Instant NOW = Instant.parse("2026-09-25T10:05:00Z");
    private static final LearningPlan PLAN = new LearningPlan(NOW, "rule_based_v1", Level.A1_2,
            List.of(new PlanStage(Level.A1_2, List.of(
                    new PlanUnit("a1_u05_food_drink", "Essen & Trinken", PlanUnitStatus.PLANNED, 5, null),
                    new PlanUnit("focus_grammar.infinitive_1", "Fokus: Infinitiv", PlanUnitStatus.PLANNED, 1,
                            "Fehlerquote 45 % bei Infinitiv")))),
            Map.of(CefrBand.A1, LocalDate.parse("2026-10-20"), CefrBand.C2, LocalDate.parse("2029-06-01")));

    @Autowired
    private LearningPlanStore store;

    private UUID learner;

    @BeforeEach
    void learner() {
        jdbc.sql("DELETE FROM users").update();
        learner = new LearnerFixture(jdbc).learner("Erza");
    }

    @Test
    void storesEveryPlanAsTheNextVersion() {
        store.save(learner, PLAN, NOW);
        StoredPlan second = store.save(learner, PLAN, NOW.plusSeconds(60));

        assertThat(second.version()).isEqualTo(2);
        assertThat(store.current(learner)).contains(second);
        assertThat(store.current(new LearnerFixture(jdbc).learner("Arta"))).isEmpty();
    }

    @Test
    void keepsTheDocumentShapeInTheDatabase() {
        store.save(learner, PLAN, NOW);

        assertThat(jdbc.sql("SELECT plan -> 'stages' -> 0 -> 'units' -> 0 FROM learning_plans").query(String.class).single())
                .isEqualTo("{\"title\": \"Essen & Trinken\", \"status\": \"planned\", \"unitId\": \"a1_u05_food_drink\", "
                        + "\"estimatedLessons\": 5}");
        assertThat(jdbc.sql("SELECT plan ->> 'generatedAt' FROM learning_plans").query(String.class).single())
                .isEqualTo("2026-09-25T10:05:00Z");
    }

    @Test
    void logsTheChangesOfAVersionInOrderAndTheNewestVersionFirst() {
        StoredPlan first = store.save(learner, PLAN, NOW);
        store.logChanges(learner, first.id(), PlanTrigger.PLACEMENT, List.of(
                PlanChange.of(PlanChangeKind.PLAN_CREATED, "Lernplan erstellt"),
                new PlanChange(PlanChangeKind.FOCUS_INSERTED, "Fokus eingefügt", Map.of("unitId", "focus_grammar.infinitive_1"))),
                NOW);
        StoredPlan second = store.save(learner, PLAN, NOW.plusSeconds(60));
        store.logChanges(learner, second.id(), PlanTrigger.MANUAL,
                List.of(PlanChange.of(PlanChangeKind.REPLANNED, "Tagesziel geändert")), NOW.plusSeconds(60));

        assertThat(store.changes(learner)).extracting(LearningPlanStore.LoggedChange::reason)
                .containsExactly("Tagesziel geändert", "Lernplan erstellt", "Fokus eingefügt");
        assertThat(store.changes(learner).getFirst().trigger()).isEqualTo(PlanTrigger.MANUAL);
        assertThat(store.focusInsertions(learner)).isEqualTo(Map.of("focus_grammar.infinitive_1", NOW.plusNanos(1_000)));
    }
}
