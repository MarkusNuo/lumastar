package app.lingora.core.srs;

import java.util.List;

/**
 * The learner's scheduling settings (PRD F8): the target retention ({@code request_retention}) and the optimised
 * weights, empty for the scheduler's defaults.
 */
public record SrsSettings(double requestRetention, List<Double> weights) {

    public static final double DEFAULT_REQUEST_RETENTION = 0.90;
    public static final SrsSettings DEFAULT = new SrsSettings(DEFAULT_REQUEST_RETENTION, List.of());

    public SrsSettings {
        if (!(requestRetention > 0 && requestRetention < 1)) {
            throw new IllegalArgumentException("requestRetention must be between 0 and 1, found " + requestRetention);
        }
        weights = List.copyOf(weights);
    }
}
