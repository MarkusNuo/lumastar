package app.lumastar;

import static org.assertj.core.api.Assertions.assertThat;

import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.JsonNode;

/** Plays lessons of {@link SyntheticContent} through the API, where every exercise is a multiple choice. */
public final class LessonDriver {

    public static final String A0_WORDS = """
            {"unitId": "a0_words"}""";

    private final SpaClient learner;

    public LessonDriver(SpaClient learner) {
        this.learner = learner;
    }

    /** Starts a lesson with the request body of POST /api/lessons. */
    public JsonNode start(String request) {
        MvcTestResult started = learner.post("/api/lessons", request);
        assertThat(started).hasStatus(HttpStatus.CREATED);
        return PlacementDriver.body(started);
    }

    /** Answers every exercise of the lesson with {@code choice}; "ja" is right, anything else wrong. */
    public void answerAll(JsonNode lesson, String choice) {
        for (JsonNode exercise : lesson.get("exercises")) {
            assertThat(learner.post("/api/lessons/%s/attempts".formatted(lesson.get("sessionId").asString()), """
                    {"exerciseId": "%s", "answer": {"choice": "%s"}, "responseTimeMs": 2000}"""
                    .formatted(exercise.get("id").asString(), choice))).hasStatusOk();
        }
    }

    public JsonNode complete(JsonNode lesson) {
        MvcTestResult completed = learner.post("/api/lessons/%s/complete".formatted(lesson.get("sessionId").asString()), "");
        assertThat(completed).hasStatusOk();
        return PlacementDriver.body(completed);
    }

    /** Starts, answers and completes a lesson; the result of the lesson. */
    public JsonNode play(String request, String choice) {
        JsonNode lesson = start(request);
        answerAll(lesson, choice);
        return complete(lesson);
    }
}
