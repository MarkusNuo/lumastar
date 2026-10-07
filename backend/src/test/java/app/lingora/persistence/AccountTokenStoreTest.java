package app.lingora.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.lingora.IntegrationTest;
import app.lingora.LearnerFixture;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DuplicateKeyException;

/** One open link per account and purpose, also when links are issued at the same time (M8 review). */
class AccountTokenStoreTest extends IntegrationTest {

    private static final Instant NOW = Instant.parse("2026-10-07T10:00:00Z");

    @Autowired
    private AccountTokenStore store;

    private UUID learner;

    @BeforeEach
    void learner() {
        jdbc.sql("DELETE FROM users").update();
        learner = new LearnerFixture(jdbc).learner("Erza");
    }

    @Test
    void aNewLinkReplacesTheEarlierOneOfTheSamePurposeOnly() {
        store.replace(learner, AccountTokenPurpose.VERIFY_EMAIL, hash(1), "erza@example.com", NOW);
        store.replace(learner, AccountTokenPurpose.RESET_PASSWORD, hash(2), "erza@example.com", NOW);

        store.replace(learner, AccountTokenPurpose.RESET_PASSWORD, hash(3), "erza@example.com", NOW.plusSeconds(60));

        assertThat(store.take(hash(2), AccountTokenPurpose.RESET_PASSWORD)).isEmpty();
        assertThat(store.take(hash(3), AccountTokenPurpose.RESET_PASSWORD)).get()
                .extracting(AccountTokenStore.StoredToken::expiresAt).isEqualTo(NOW.plusSeconds(60).plus(
                        AccountTokenPurpose.RESET_PASSWORD.validity()));
        assertThat(store.take(hash(1), AccountTokenPurpose.VERIFY_EMAIL)).isPresent();
    }

    @Test
    void concurrentLinksLeaveExactlyOneValidLink() throws Exception {
        int requests = 24;
        CountDownLatch start = new CountDownLatch(1);
        List<Future<?>> issued = new ArrayList<>();
        try (ExecutorService pool = Executors.newFixedThreadPool(8)) {
            for (int i = 0; i < requests; i++) {
                String tokenHash = hash(i);
                issued.add(pool.submit(() -> {
                    start.await();
                    store.replace(learner, AccountTokenPurpose.RESET_PASSWORD, tokenHash, "erza@example.com", NOW);
                    return null;
                }));
            }
            start.countDown();
            for (Future<?> request : issued) {
                request.get();
            }
        }

        List<String> links = jdbc.sql("SELECT token_hash FROM account_tokens WHERE user_id = :user")
                .param("user", learner).query(String.class).list();
        assertThat(links).hasSize(1);
    }

    @Test
    void theSchemaRejectsASecondLinkOfTheSamePurpose() {
        store.replace(learner, AccountTokenPurpose.CHANGE_EMAIL, hash(1), "new@example.com", NOW);

        assertThatThrownBy(() -> jdbc.sql("""
                        INSERT INTO account_tokens (user_id, purpose, token_hash, email, created_at, expires_at)
                        VALUES (:user, 'change_email', :hash, 'other@example.com', now(), now() + interval '1 hour')""")
                .param("user", learner).param("hash", hash(2)).update())
                .isInstanceOf(DuplicateKeyException.class);
    }

    private static String hash(int seed) {
        byte[] bytes = new byte[32];
        bytes[31] = (byte) seed;
        bytes[0] = (byte) 0xab;
        return HexFormat.of().formatHex(bytes);
    }
}
