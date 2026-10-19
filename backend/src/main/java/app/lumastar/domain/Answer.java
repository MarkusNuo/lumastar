package app.lumastar.domain;

import java.time.Duration;
import java.util.List;
import java.util.Objects;

/** What the learner submitted for an exercise, with the measured response time (PRD F5). */
public sealed interface Answer {

    Duration responseTime();

    /** Typed text: translate_free and fill_gap without choices. */
    record Text(String value, Duration responseTime) implements Answer {

        public Text {
            Objects.requireNonNull(value, "value");
            requireValid(responseTime);
        }
    }

    /** The option the learner picked: multiple_choice and fill_gap with choices. */
    record Choice(String value, Duration responseTime) implements Answer {

        public Choice {
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

    /** Every wrong match the learner made before all pairs were matched, in order: match_pairs. */
    record WrongMatches(List<MatchPair> matches, Duration responseTime) implements Answer {

        public WrongMatches {
            matches = List.copyOf(matches);
            requireValid(responseTime);
        }
    }

    /** The number of wrong matches only: match_pairs answered by an app that does not report them yet. */
    record PairMistakes(int mistakes, Duration responseTime) implements Answer {

        public PairMistakes {
            Require.that(mistakes >= 0, "mistakes must not be negative");
            requireValid(responseTime);
        }
    }

    private static void requireValid(Duration responseTime) {
        Objects.requireNonNull(responseTime, "responseTime");
        Require.that(!responseTime.isNegative(), "responseTime must not be negative");
    }
}
