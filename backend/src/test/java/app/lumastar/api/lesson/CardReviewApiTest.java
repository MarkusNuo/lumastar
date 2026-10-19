package app.lumastar.api.lesson;

import static org.assertj.core.api.Assertions.assertThat;

import app.lumastar.IntegrationTest;
import app.lumastar.LearnerFixture;
import app.lumastar.SpaClient;
import app.lumastar.content.ContentFixture;
import app.lumastar.content.ContentLoader;
import app.lumastar.content.ContentSeeder;
import app.lumastar.core.srs.FsrsScheduler;
import app.lumastar.core.srs.SrsReplayer;
import app.lumastar.core.srs.SrsReplayer.LoggedReview;
import app.lumastar.core.srs.SrsSettings;
import app.lumastar.domain.CardState;
import app.lumastar.domain.Coded;
import app.lumastar.domain.Rating;
import app.lumastar.domain.SrsCard;
import app.lumastar.persistence.SqlTimestamps;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** FSRS cards and the review log behind every first answer, against the content fixture. */
class CardReviewApiTest extends IntegrationTest {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    private ContentLoader loader;

    @Autowired
    private ContentSeeder seeder;

    private SpaClient learner;
    private UUID learnerId;

    @BeforeEach
    void signedInLearnerWithSeededFixture() {
        jdbc.sql("TRUNCATE content_skill_tags, content_stages, content_units, content_items, exercises CASCADE").update();
        jdbc.sql("DELETE FROM users").update();
        seeder.seed(loader.load(ContentFixture.path()));
        learner = new SpaClient(mvc);
        learner.register("Erza");
        learnerId = jdbc.sql("SELECT id FROM users").query(UUID.class).single();
    }

    @Test
    void aFirstAnswerCreatesAndReviewsTheCardOfEveryItemAndLogsTheReview() {
        String lesson = startGreetings();

        JsonNode answered = answer(lesson, "ex_a1_u01_003", """
                {"tokens": ["Guten", "Tag", "wie", "geht", "es", "dir"]}""", 4000, false);

        assertThat(answered.get("rating").asString()).isEqualTo("good");
        assertThat(cardStates()).containsExactlyInAnyOrderEntriesOf(Map.of(
                "item_miredita", "learning|1|1", "item_si_je", "learning|1|1"));
        List<Map<String, Object>> log = jdbc.sql("""
                        SELECT r.item_id, r.rating, r.response_ms, r.scheduler_version, r.request_retention,
                               r.state_before ->> 'state' AS before, r.state_after ->> 'state' AS after,
                               r.attempt_id = a.id AS of_attempt, r.card_id = c.id AS of_card
                        FROM review_log r JOIN attempts a ON a.exercise_id = 'ex_a1_u01_003'
                        JOIN srs_cards c ON c.item_id = r.item_id
                        ORDER BY r.item_id""")
                .query().listOfRows();
        assertThat(log).containsExactly(
                Map.of("item_id", "item_miredita", "rating", "good", "response_ms", 4000, "scheduler_version",
                        FsrsScheduler.VERSION, "request_retention", 0.9, "before", "new", "after", "learning", "of_attempt", true,
                        "of_card", true),
                Map.of("item_id", "item_si_je", "rating", "good", "response_ms", 4000, "scheduler_version",
                        FsrsScheduler.VERSION, "request_retention", 0.9, "before", "new", "after", "learning", "of_attempt", true,
                        "of_card", true));
    }

    @Test
    void aRetryReviewsNoCard() {
        String lesson = startGreetings();
        assertThat(answer(lesson, "ex_a1_u01_002", """
                {"text": "si jeni"}""", 3000, false).get("rating").asString()).isEqualTo("again");

        answer(lesson, "ex_a1_u01_002", """
                {"text": "Si je?"}""", 3000, true);

        assertThat(cardStates()).containsExactly(Map.entry("item_si_je", "learning|1|0"));
        assertThat(count("review_log")).isEqualTo(1);
        assertThat(jdbc.sql("SELECT fsrs_rating FROM attempts WHERE is_retry").query(String.class).single()).isEqualTo("good");
    }

    @Test
    void wrongMatchesRateTheConfusedItemsAgainAndTheOthersGood() {
        String lesson = startGreetings();

        JsonNode answered = answer(lesson, "ex_a1_u01_004", """
                {"wrongMatches": [{"left": "Po", "right": "Nein"}]}""", 9000, false);

        assertThat(answered.get("rating").asString()).isEqualTo("again");
        assertThat(jdbc.sql("SELECT item_id || '|' || rating FROM review_log ORDER BY item_id").query(String.class).list())
                .containsExactly("item_faleminderit|good", "item_jo|again", "item_miredita|good", "item_mirupafshim|good",
                        "item_po|again");
    }

    @Test
    void reviewsWithTheLearnersTargetRetention() {
        jdbc.sql("UPDATE users SET settings = '{\"requestRetention\": 0.8}'").update();

        answer(startGreetings(), "ex_a1_u01_001", """
                {"choice": "Mirëdita"}""", 3000, false);

        assertThat(jdbc.sql("SELECT request_retention FROM review_log").query(Double.class).single()).isEqualTo(0.8);
    }

    @Test
    void aSlowAnswerIsHardAndAFastOneOnAKnownItemIsEasy() {
        tenEarlierMultipleChoiceAnswers(4000);
        jdbc.sql("""
                INSERT INTO srs_cards (user_id, item_id, state, stability, difficulty, due, last_review, reps)
                VALUES (:user, 'item_miredita', 'review', 3.2, 5.3, now(), now() - interval '3 days', 2)""")
                .param("user", learnerId).update();
        String lesson = startGreetings();

        assertThat(answer(lesson, "ex_a1_u01_001", """
                {"choice": "Mirëdita"}""", 1500, false).get("rating").asString()).isEqualTo("easy");

        String slow = startGreetings();
        assertThat(answer(slow, "ex_a1_u01_001", """
                {"choice": "Mirëdita"}""", 8001, false).get("rating").asString()).isEqualTo("hard");
        assertThat(jdbc.sql("SELECT fsrs_rating FROM attempts WHERE exercise_id = 'ex_a1_u01_001' ORDER BY answered_at DESC")
                .query(String.class).list()).startsWith("hard", "easy");
    }

    @Test
    void theStoredReviewLogReplaysToTheStoredCards() {
        playGreetings();
        playGreetings();

        List<LoggedReview> log = jdbc.sql("SELECT item_id, rating, reviewed_at FROM review_log ORDER BY reviewed_at, id")
                .query((row, rowNumber) -> new LoggedReview(row.getString("item_id"),
                        Coded.fromCode(Rating.class, row.getString("rating")), SqlTimestamps.instant(row, "reviewed_at")))
                .list();

        assertThat(log).hasSize(22);
        assertThat(SrsReplayer.replay(log, new FsrsScheduler(SrsSettings.DEFAULT)).cards()).isEqualTo(storedCards());
    }

    @Test
    void theResultCountsTheLearnedWordsByTheirCards() {
        playGreetings();
        JsonNode result = playGreetings();

        // miredita and si_je are practised twice per lesson and graduate; the pairs' items once per lesson
        assertThat(result.get("learnedWordsTotal").asInt()).isEqualTo(count("srs_cards WHERE state = 'review'"));
        assertThat(result.get("learnedItems")).filteredOn(item -> item.get("id").asString().equals("item_miredita"))
                .singleElement().satisfies(item -> assertThat(item.get("known").asBoolean()).isTrue());
        assertThat(text(learner.get("/api/profile/summary")))
                .contains("%d Wörter".formatted(result.get("learnedWordsTotal").asInt()));
    }

    private void tenEarlierMultipleChoiceAnswers(int responseMs) {
        LearnerFixture fixture = new LearnerFixture(jdbc);
        UUID lesson = fixture.lesson(learnerId, "a1_u01_greetings", Instant.now().minusSeconds(3600));
        for (int i = 0; i < 10; i++) {
            fixture.answer(learnerId, lesson, new LearnerFixture.Answer("ex_a1_u01_001", "multiple_choice",
                    List.of("vocab.greetings"), "{\"choice\": \"Mirëdita\"}", "correct", null, "Mirëdita", false,
                    Instant.now().minusSeconds(3600 - i)));
        }
        jdbc.sql("UPDATE attempts SET response_ms = :ms").param("ms", responseMs).update();
    }

    /** Plays the greetings lesson with every answer correct and returns its result. */
    private JsonNode playGreetings() {
        String lesson = startGreetings();
        Map<String, String> answers = Map.of(
                "ex_a1_u01_001", "{\"choice\": \"Mirëdita\"}",
                "ex_a1_u01_002", "{\"text\": \"si je\"}",
                "ex_a1_u01_003", "{\"tokens\": [\"Guten\", \"Tag\", \"wie\", \"geht\", \"es\", \"dir\"]}",
                "ex_a1_u01_004", "{\"wrongMatches\": []}",
                "ex_a1_u01_005", "{\"tokens\": [\"Mirëdita\", \"si\", \"je\"]}");
        answers.forEach((exercise, answer) -> answer(lesson, exercise, answer, 3000, false));
        MvcTestResult completed = learner.post("/api/lessons/%s/complete".formatted(lesson), "");
        assertThat(completed).hasStatusOk();
        return body(completed);
    }

    private String startGreetings() {
        MvcTestResult started = learner.post("/api/lessons", """
                {"unitId": "a1_u01_greetings"}""");
        assertThat(started).hasStatus(HttpStatus.CREATED);
        return body(started).get("sessionId").asString();
    }

    private JsonNode answer(String lesson, String exercise, String answer, int responseMs, boolean retry) {
        MvcTestResult answered = learner.post("/api/lessons/%s/attempts".formatted(lesson), """
                {"exerciseId": "%s", "answer": %s, "responseTimeMs": %d, "retry": %b}"""
                .formatted(exercise, answer, responseMs, retry));
        assertThat(answered).hasStatusOk();
        return body(answered);
    }

    /** state|reps|step per item. */
    private Map<String, String> cardStates() {
        return jdbc.sql("SELECT item_id, state || '|' || reps || '|' || coalesce(step::text, '-') AS card FROM srs_cards")
                .query((row, rowNumber) -> Map.entry(row.getString("item_id"), row.getString("card")))
                .stream()
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    private Map<String, SrsCard> storedCards() {
        return jdbc.sql("""
                        SELECT item_id, state, step, stability, difficulty, due, last_review, reps, lapses FROM srs_cards""")
                .query((row, rowNumber) -> new SrsCard(row.getString("item_id"),
                        Coded.fromCode(CardState.class, row.getString("state")), row.getObject("step", Integer.class),
                        row.getObject("stability", Double.class), row.getObject("difficulty", Double.class),
                        SqlTimestamps.instant(row, "due"), SqlTimestamps.instant(row, "last_review"), row.getInt("reps"),
                        row.getInt("lapses")))
                .stream()
                .collect(Collectors.toMap(SrsCard::itemId, Function.identity()));
    }

    private int count(String tableAndCondition) {
        return jdbc.sql("SELECT count(*) FROM " + tableAndCondition).query(Integer.class).single();
    }

    private static JsonNode body(MvcTestResult result) {
        return JSON.readTree(text(result));
    }

    private static String text(MvcTestResult result) {
        return new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
    }
}
