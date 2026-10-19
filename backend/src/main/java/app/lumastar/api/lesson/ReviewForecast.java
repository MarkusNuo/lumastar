package app.lumastar.api.lesson;

import app.lumastar.persistence.SrsCardStore;
import app.lumastar.persistence.SrsCardStore.DueCounts;
import app.lumastar.persistence.UserEntity;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** How many items are due now and tomorrow (PRD F8, F10 "morgen fällig: 34 Items"), in the learner's time zone. */
@Component
class ReviewForecast {

    private final SrsCardStore cards;
    private final Clock clock;

    ReviewForecast(SrsCardStore cards, Clock clock) {
        this.cards = cards;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    ReviewSummaryResponse summary(UserEntity learner) {
        Instant now = clock.instant();
        ZoneId zone = learner.getTimeZone();
        LocalDate today = LocalDate.ofInstant(now, zone);
        DueCounts counts = cards.dueCounts(learner.getId(), now, today.plusDays(1).atStartOfDay(zone).toInstant(),
                today.plusDays(2).atStartOfDay(zone).toInstant());
        return new ReviewSummaryResponse(counts.dueNow(), counts.dueTomorrow(), counts.totalCards());
    }
}
