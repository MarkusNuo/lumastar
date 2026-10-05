package app.lingora.core.plan;

import app.lingora.domain.CefrBand;
import app.lingora.domain.Level;
import app.lingora.domain.LevelBadge;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;

/**
 * What passing a checkpoint changes (PRD chapter 5, F9): the learner moves on to the stage after it, never down, and
 * earns the badge of every CEFR band from the learner's own up to the checkpoint's that this completes. Passing the
 * last stage (C2.3) completes C2 without a new level.
 */
public record LevelUp(Level from, Level to, List<LevelBadge> badges) {

    public LevelUp {
        Objects.requireNonNull(from, "from");
        Objects.requireNonNull(to, "to");
        badges = List.copyOf(badges);
    }

    public static LevelUp afterCheckpoint(Level current, Level checkpoint) {
        Level next = levelAfter(checkpoint);
        Level to = next.isAbove(current) ? next : current;
        boolean lastStage = checkpoint == Level.highest();
        List<LevelBadge> badges = Arrays.stream(CefrBand.values())
                .filter(band -> band.compareTo(current.band()) >= 0 && band.compareTo(checkpoint.band()) <= 0)
                .filter(band -> band.compareTo(to.band()) < 0 || lastStage)
                .flatMap(band -> LevelBadge.of(band).stream())
                .toList();
        return new LevelUp(current, to, badges);
    }

    /** The stage a passed checkpoint leads to; the last stage leads nowhere further. */
    public static Level levelAfter(Level checkpoint) {
        return checkpoint.next().orElse(checkpoint);
    }

    public boolean changesLevel() {
        return to != from;
    }
}
