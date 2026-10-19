package app.lumastar.core;

import java.time.Duration;
import java.util.List;

/** Statistics over response times. */
public final class Durations {

    private Durations() {
    }

    /** The middle value; the mean of the two middle values for an even count. */
    public static Duration median(List<Duration> durations) {
        if (durations.isEmpty()) {
            throw new IllegalArgumentException("the median needs at least one value");
        }
        List<Duration> sorted = durations.stream().sorted().toList();
        int middle = sorted.size() / 2;
        return sorted.size() % 2 == 1
                ? sorted.get(middle)
                : sorted.get(middle - 1).plus(sorted.get(middle)).dividedBy(2);
    }
}
