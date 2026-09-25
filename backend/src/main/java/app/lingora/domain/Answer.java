package app.lingora.domain;

import java.time.Duration;
import java.util.List;
import java.util.Objects;

/** What the learner submitted for an exercise, with the measured response time (PRD F5). */
public sealed interface Answer {

    Duration responseTime();

    /** Typed or chosen text: translate_free, fill_gap and multiple_choice. */
    record Text(String value, Duration responseTime) implements Answer {

        public Text {
            Objects.requireNonNull(value, "value");
            requireValid(responseTime);
        }
    }

    /** Word chips in the chosen order: translate_wordbank and word_order. */
    record Tokens(List<String> tokens, Duration responseTime) implements Answer {

        public Tokens {
            tokens = List.copyOf(tokens);
            requireValid(responseTime);
        }
    }

    /** Pairs as matched by the learner: match_pairs. */
    record Pairs(List<MatchPair> pairs, Duration responseTime) implements Answer {

        public Pairs {
            pairs = List.copyOf(pairs);
            requireValid(responseTime);
        }
    }

    private static void requireValid(Duration responseTime) {
        Objects.requireNonNull(responseTime, "responseTime");
        Require.that(!responseTime.isNegative(), "responseTime must not be negative");
    }
}
