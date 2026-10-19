package app.lumastar;

import static org.assertj.core.api.Assertions.assertThat;

import app.lumastar.domain.AnswerNormalizer;
import app.lumastar.domain.Level;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Predicate;
import java.util.stream.StreamSupport;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/**
 * Takes the placement test through the API like the app does. It looks the solutions up in the database, since the
 * items shown carry none, and answers each item correctly or wrongly as the test asks.
 */
public final class PlacementDriver {

    public static final JsonMapper JSON = JsonMapper.builder().build();

    private final SpaClient client;
    private final JdbcClient jdbc;

    public PlacementDriver(SpaClient client, JdbcClient jdbc) {
        this.client = client;
        this.jdbc = jdbc;
    }

    /** An item as answered, with its level from the bank. */
    public record AnsweredItem(JsonNode item, Level level, boolean correct) {
    }

    public record Placement(String testId, List<AnsweredItem> items, JsonNode result) {

        public Level level() {
            return Level.fromCode(result.get("level").asString());
        }
    }

    public void answerOnboarding(String selfAssessment) {
        assertThat(client.put("/api/onboarding", """
                {"motivations": ["family"], "dailyGoalMinutes": 10, "selfAssessment": "%s"}""".formatted(selfAssessment)))
                .hasStatusOk();
    }

    public JsonNode start() {
        MvcTestResult started = client.post("/api/placement", "");
        assertThat(started).hasStatus(HttpStatus.CREATED);
        return body(started);
    }

    /** Runs a started test to its end; {@code knows} decides per item level whether the answer is correct. */
    public Placement finish(JsonNode started, Predicate<Level> knows) {
        String testId = started.get("testId").asString();
        List<AnsweredItem> items = new ArrayList<>();
        JsonNode item = started.get("item");
        while (item != null) {
            Level level = levelOf(item);
            boolean correct = knows.test(level);
            items.add(new AnsweredItem(item, level, correct));
            MvcTestResult answered = client.post("/api/placement/" + testId + "/answers", answerJson(item, correct));
            assertThat(answered).hasStatusOk();
            JsonNode response = body(answered);
            item = response.get("finished").asBoolean() ? null : response.get("nextItem");
        }
        MvcTestResult result = client.get("/api/placement/" + testId + "/result");
        assertThat(result).hasStatusOk();
        return new Placement(testId, items, body(result));
    }

    public Placement place(Predicate<Level> knows) {
        return finish(start(), knows);
    }

    /** The request body of an answer to {@code item}. */
    public String answerJson(JsonNode item, boolean correct) {
        ObjectNode request = JSON.createObjectNode();
        request.put("exerciseId", item.get("id").asString());
        request.put("responseTimeMs", 3000);
        request.set("answer", correct ? correctAnswer(item) : wrongAnswer(item));
        return request.toString();
    }

    public Level levelOf(JsonNode item) {
        return Level.fromCode(jdbc.sql("SELECT level FROM exercises WHERE id = :id")
                .param("id", item.get("id").asString()).query(String.class).single());
    }

    private ObjectNode correctAnswer(JsonNode item) {
        String solution = jdbc.sql("SELECT payload -> 'solutions' ->> 0 FROM exercises WHERE id = :id")
                .param("id", item.get("id").asString()).query(String.class).single();
        ObjectNode answer = JSON.createObjectNode();
        switch (item.get("type").asString()) {
            case "multiple_choice" -> answer.put("choice", solution);
            case "fill_gap" -> answer.put(item.has("choices") ? "choice" : "text", solution);
            case "translate_free" -> answer.put("text", solution);
            default -> {
                var tokens = answer.putArray("tokens");
                for (String word : solution.split("\\s+")) {
                    tokens.add(word);
                }
            }
        }
        return answer;
    }

    private ObjectNode wrongAnswer(JsonNode item) {
        ObjectNode answer = JSON.createObjectNode();
        if (item.has("choices")) {
            String solution = AnswerNormalizer.normalize(jdbc.sql("SELECT payload -> 'solutions' ->> 0 FROM exercises WHERE id = :id")
                    .param("id", item.get("id").asString()).query(String.class).single());
            answer.put("choice", StreamSupport.stream(item.get("choices").spliterator(), false)
                    .map(JsonNode::asString)
                    .filter(choice -> !AnswerNormalizer.normalize(choice).equals(solution))
                    .findFirst()
                    .orElseThrow());
        } else if (item.has("wordBank") || item.has("tokens")) {
            answer.putArray("tokens").add("zzz");
        } else {
            answer.put("text", "zzz");
        }
        return answer;
    }

    public static JsonNode body(MvcTestResult result) {
        return JSON.readTree(new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8));
    }
}
