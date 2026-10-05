package app.lingora.core.srs;

import java.util.List;

/**
 * The learner's scheduling settings (PRD F8): the target retention ({@code request_retention}) and the optimised
 * weights, empty for the scheduler's defaults.
 */
public record SrsSettings(double requestRetention, List<Double> weights) {

    public static final double DEFAULT_REQUEST_RETENTION = 0.90;
    public static final double MIN_REQUEST_RETENTION = 0.70;
    public static final double MAX_REQUEST_RETENTION = 0.99;
    public static final SrsSettings DEFAULT = new SrsSettings(DEFAULT_REQUEST_RETENTION, List.of());

    public SrsSettings {
        if (!isValidRetention(requestRetention)) {
            throw new IllegalArgumentException("requestRetention must be between %s and %s, found %s"
                    .formatted(MIN_REQUEST_RETENTION, MAX_REQUEST_RETENTION, requestRetention));
        }
        weights = List.copyOf(weights);
    }

    public static boolean isValidRetention(double requestRetention) {
        return requestRetention >= MIN_REQUEST_RETENTION && requestRetention <= MAX_REQUEST_RETENTION;
    }
}
