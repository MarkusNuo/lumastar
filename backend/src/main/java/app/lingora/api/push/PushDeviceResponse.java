package app.lingora.api.push;

import app.lingora.persistence.PushSubscriptionStore.StoredSubscription;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

@Schema(description = "A browser or device the learner gets reminders on")
public record PushDeviceResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Compare with the endpoint of this browser's "
                + "subscription to find this device") String endpoint,
        @Schema(description = "Name of the device, if one was given") String label,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant createdAt,
        @Schema(description = "Last notification the push service accepted; absent before the first") Instant lastSuccessAt,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Failed deliveries since the last successful "
                + "one") int failureCount) {

    static PushDeviceResponse of(StoredSubscription device) {
        return new PushDeviceResponse(device.subscription().endpoint(), device.label(), device.createdAt(),
                device.lastSuccessAt(), device.failureCount());
    }
}
