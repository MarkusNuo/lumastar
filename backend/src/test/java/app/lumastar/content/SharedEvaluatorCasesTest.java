package app.lumastar.content;

import static org.assertj.core.api.Assertions.assertThat;

import app.lumastar.content.ContentDocuments.ExerciseDocument;
import app.lumastar.core.evaluation.AnswerEvaluator;
import app.lumastar.core.evaluation.RuleBasedAnswerEvaluator;
import app.lumastar.domain.Answer;
import app.lumastar.domain.Coded;
import app.lumastar.domain.ErrorCategory;
import app.lumastar.domain.EvaluationResult;
import app.lumastar.domain.Exercise;
import app.lumastar.domain.MatchPair;
import app.lumastar.domain.Outcome;
import app.lumastar.domain.SkillTag;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/**
 * The evaluator cases shared with the frontend pre-check ({@code content/fixtures/evaluator-cases.json}), evaluated with
 * the real Gheg blocklist. Fixture exercises are mapped like content exercises, with neutral values for the fields the
 * evaluator ignores.
 */
class SharedEvaluatorCasesTest {

    private static final Path CONTENT = Path.of("../content");
    private static final JsonMapper JSON = JsonMapper.builder()
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .build();
    private static final Duration TIME = Duration.ofSeconds(4);
    private static final AnswerEvaluator EVALUATOR =
            new RuleBasedAnswerEvaluator(GhegBlocklistReader.read(CONTENT.resolve(GhegBlocklistReader.FILE)));

    @ParameterizedTest(name = "{0}")
    @MethodSource("cases")
    void evaluatesTheCaseAsExpected(String id, String description, JsonNode exercise, JsonNode answer, JsonNode expected) {
        EvaluationResult result = EVALUATOR.evaluate(exercise(id, exercise), answer(answer));

        assertThat(result.outcome()).as(description).isEqualTo(Coded.fromCode(Outcome.class, expected.get("outcome").asString()));
        assertThat(result.errorCategory()).as(description).isEqualTo(expected.has("errorCategory")
                ? ErrorCategory.fromCode(expected.get("errorCategory").asString())
                : null);
    }

    static Stream<Arguments> cases() throws IOException {
        JsonNode cases = JSON.readTree(Files.readString(CONTENT.resolve("fixtures/evaluator-cases.json"))).get("cases");
        return StreamSupport.stream(cases.spliterator(), false)
                .map(entry -> Arguments.of(entry.get("id").asString(), entry.get("description").asString(),
                        entry.get("exercise"), entry.get("answer"), entry.get("expected")));
    }

    private static Exercise exercise(String id, JsonNode fixture) {
        ObjectNode document = (ObjectNode) fixture.deepCopy();
        document.put("id", "ex_fixture_" + id);
        document.put("level", "A1.1");
        document.put("difficulty", 1);
        document.putObject("prompt").put("lang", "de").put("text", "Aufgabe");
        document.put("explanation", "Erklärung");
        List<SkillTag> skillTags = StreamSupport.stream(fixture.get("skillTags").spliterator(), false)
                .map(tag -> SkillTag.of(tag.asString()))
                .toList();
        return ExerciseDocumentMapper.toExercise(JSON.treeToValue(document, ExerciseDocument.class), skillTags);
    }

    private static Answer answer(JsonNode answer) {
        if (answer.has("text")) {
            return new Answer.Text(answer.get("text").asString(), TIME);
        }
        if (answer.has("choice")) {
            return new Answer.Choice(answer.get("choice").asString(), TIME);
        }
        if (answer.has("tokens")) {
            return new Answer.Tokens(strings(answer.get("tokens")), TIME);
        }
        List<MatchPair> wrongMatches = StreamSupport.stream(answer.get("wrongMatches").spliterator(), false)
                .map(match -> new MatchPair(match.get("left").asString(), match.get("right").asString()))
                .toList();
        return new Answer.WrongMatches(wrongMatches, TIME);
    }

    private static List<String> strings(JsonNode array) {
        return StreamSupport.stream(array.spliterator(), false).map(JsonNode::asString).toList();
    }
}
