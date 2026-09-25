package app.lingora.content;

import static app.lingora.content.ContentFixture.FAMILY;
import static app.lingora.content.ContentFixture.GREETINGS;
import static app.lingora.content.ContentFixture.editJson;
import static app.lingora.content.ContentFixture.exercise;
import static app.lingora.content.ContentFixture.strings;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.lingora.domain.AnswerLang;
import app.lingora.domain.Curriculum;
import app.lingora.domain.ErrorCategory;
import app.lingora.domain.Exercise;
import app.lingora.domain.ExercisePayload;
import app.lingora.domain.ExerciseSource;
import app.lingora.domain.Level;
import app.lingora.domain.Unit;
import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

class ContentLoaderTest {

    private static final ValidatorFactory VALIDATION = Validation.buildDefaultValidatorFactory();

    private final ContentLoader loader = new ContentLoader(VALIDATION.getValidator());

    @TempDir
    Path tempDir;

    private Path content;

    @BeforeEach
    void copyFixture() {
        content = ContentFixture.copyTo(tempDir);
    }

    @AfterAll
    static void closeValidation() {
        VALIDATION.close();
    }

    @Test
    void loadsTheWholeFixture() {
        ContentBundle bundle = loader.load(ContentFixture.path());

        Curriculum curriculum = bundle.curriculum();
        assertThat(curriculum.variety()).isEqualTo("gheg-kosovo");
        assertThat(curriculum.stages()).extracting(stage -> stage.level()).containsExactly(Level.A1_1, Level.A1_2);
        assertThat(curriculum.units()).extracting(Unit::id).containsExactly("a1_u01_greetings", "a1_u02_family", "a1_u03_numbers");
        assertThat(curriculum.units()).filteredOn(Unit::isSkeleton).extracting(Unit::id).containsExactly("a1_u03_numbers");
        assertThat(curriculum.units()).flatExtracting(Unit::items).hasSize(10);
        assertThat(curriculum.units()).flatExtracting(Unit::exercises).hasSize(8);
        assertThat(bundle.placementExercises()).extracting(Exercise::id).containsExactly("pl_a1_1_001", "pl_a1_2_001");
        assertThat(bundle.skillTags()).hasSize(7);
    }

    @Test
    void mapsTypeSpecificFieldsAndErrorHints() {
        Exercise fillGap = unit(loader.load(ContentFixture.path()), "a1_u02_family").exercises().getFirst();

        assertThat(fillGap.payload()).isEqualTo(new ExercisePayload.FillGap(AnswerLang.GHEG, "Nâna ___ në shpi.",
                List.of("âsht"), List.of("âsht", "jam", "je"), List.of("është")));
        assertThat(fillGap.errorHints()).singleElement()
                .satisfies(hint -> assertThat(hint.category()).isEqualTo(ErrorCategory.SPELLING_NASAL_VOWEL));
        assertThat(fillGap.source()).isEqualTo(ExerciseSource.MANUAL);
        assertThat(fillGap.reviewed()).isFalse();
    }

    @Test
    void treatsThePlacementFileAsOptional() throws IOException {
        Files.delete(content.resolve("placement.json"));

        assertThat(loader.load(content).placementExercises()).isEmpty();
    }

    @Test
    void reportsAnUnregisteredSkillTag() {
        editJson(content, GREETINGS, unit -> strings(exercise(unit, 0), "skillTags", List.of("vocab.weather")));

        assertProblems("units/a1_u01_greetings.json › exercises[0] (ex_a1_u01_001): skill tag vocab.weather is not registered in skill_tags.json");
    }

    @Test
    void reportsAReferenceToAnUnknownItem() {
        editJson(content, FAMILY, unit -> strings(exercise(unit, 2), "itemIds", List.of("item_motra")));

        assertProblems("units/a1_u02_family.json › exercises[2] (ex_a1_u02_003): references unknown item item_motra");
    }

    @Test
    void reportsABrokenTypeRule() {
        editJson(content, GREETINGS, unit -> strings(exercise(unit, 0), "choices", List.of("Mirëdita", "Mirupafshim", "Po")));

        assertProblems("units/a1_u01_greetings.json › exercises[0] (ex_a1_u01_001): multiple_choice needs exactly 4 choices, found 3");
    }

    @Test
    void reportsExerciseIdsThatAreNotGloballyUnique() {
        editJson(content, FAMILY, unit -> exercise(unit, 0).put("id", "ex_a1_u01_001"));

        assertProblems("units/a1_u02_family.json › exercises[0] (ex_a1_u01_001): duplicate exercise id; exercise ids must be unique across all files");
    }

    @Test
    void reportsAMissingRequiredFieldWithItsPath() {
        editJson(content, GREETINGS, unit -> exercise(unit, 1).remove("explanation"));

        assertProblems("units/a1_u01_greetings.json: exercises[1].explanation is required");
    }

    @Test
    void reportsInvalidJsonWithItsPosition() throws IOException {
        Files.writeString(content.resolve("skill_tags.json"), "{ \"schemaVersion\": 1, \"tags\": [ }");

        assertThatThrownBy(() -> loader.load(content))
                .isInstanceOfSatisfying(ContentValidationException.class, exception -> assertThat(exception.problems())
                        .singleElement().asString().startsWith("skill_tags.json: invalid JSON at line 1, column"));
    }

    @Test
    void reportsAnUnsupportedSchemaVersion() {
        editJson(content, "curriculum.json", curriculum -> curriculum.put("schemaVersion", 2));

        assertProblems("curriculum.json: schemaVersion must be 1");
    }

    @Test
    void reportsAMissingUnitFile() throws IOException {
        Files.delete(content.resolve(FAMILY));

        assertProblems("units/a1_u02_family.json: file not found");
    }

    @Test
    void rejectsUnitFilesOutsideTheContentDirectory() {
        editJson(content, "curriculum.json", curriculum -> ((ObjectNode) curriculum.get("stages").get(0).get("units").get(1))
                .put("file", "../outside.json"));

        assertProblems("curriculum.json › unit a1_u02_family: file '../outside.json' lies outside the content directory");
    }

    @Test
    void reportsAUnitFileThatDoesNotMatchItsCurriculumEntry() {
        editJson(content, FAMILY, unit -> unit.put("level", "A1.2"));

        assertProblems("units/a1_u02_family.json: level 'A1.2' does not match its stage A1.1");
    }

    @Test
    void rejectsReservedExerciseTypes() {
        editJson(content, GREETINGS, unit -> exercise(unit, 1).put("type", "reading"));

        assertProblems("units/a1_u01_greetings.json › exercises[1] (ex_a1_u01_002): "
                + "exercise type reading is reserved; its content format is not defined yet");
    }

    @Test
    void requiresACompetenceForPlacementExercises() {
        editJson(content, "placement.json", placement -> exercise(placement, 1).remove("competence"));

        assertProblems("placement.json › exercises[1] (pl_a1_2_001): competence is required for placement exercises");
    }

    @Test
    void allowsOnlyAutomaticallyEvaluableTypesInThePlacement() {
        editJson(content, "placement.json", placement -> {
            ObjectNode matchPairs = exercise(placement, 0).deepCopy();
            matchPairs.put("id", "pl_a1_1_002").put("type", "match_pairs");
            matchPairs.remove("choices");
            matchPairs.remove("solutions");
            ArrayNode pairs = matchPairs.putArray("pairs");
            List.of("Mirëdita:Guten Tag", "Mirupafshim:Auf Wiedersehen", "Faleminderit:Danke", "Po:Ja", "Jo:Nein")
                    .forEach(pair -> pairs.addObject().put("left", pair.split(":")[0]).put("right", pair.split(":")[1]));
            ((ArrayNode) placement.get("exercises")).add(matchPairs);
        });

        assertProblems("placement.json › exercises[2] (pl_a1_1_002): type match_pairs cannot be evaluated automatically in the placement test");
    }

    @Test
    void reportsAllProblemsOfAPhaseTogether() {
        editJson(content, GREETINGS, unit -> strings(exercise(unit, 0), "skillTags", List.of("vocab.weather")));
        editJson(content, FAMILY, unit -> strings(exercise(unit, 2), "itemIds", List.of("item_motra")));

        assertThatThrownBy(() -> loader.load(content))
                .isInstanceOfSatisfying(ContentValidationException.class, exception -> {
                    assertThat(exception.problems()).hasSize(2);
                    assertThat(exception.getMessage()).contains("is invalid (2 problems)", "vocab.weather", "item_motra");
                });
    }

    private void assertProblems(String... expected) {
        assertThatThrownBy(() -> loader.load(content))
                .isInstanceOfSatisfying(ContentValidationException.class,
                        exception -> assertThat(exception.problems()).containsExactly(expected));
    }

    private static Unit unit(ContentBundle bundle, String id) {
        return bundle.curriculum().units().stream().filter(unit -> unit.id().equals(id)).findFirst().orElseThrow();
    }
}
