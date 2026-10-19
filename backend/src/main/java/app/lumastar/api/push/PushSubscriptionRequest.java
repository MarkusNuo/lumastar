package app.lumastar.api.push;

import app.lumastar.push.PushSubscription;
import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(description = "The JSON of the browser's PushSubscription (subscription.toJSON(); expirationTime is ignored) and "
        + "an optional device name")
public record PushSubscriptionRequest(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "https://fcm.googleapis.com/fcm/send/dPy3…")
        @NotBlank @Size(max = 2048) String endpoint,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) @NotNull @Valid Keys keys,
        @Schema(example = "Chrome auf Android", description = "Name of the device for the settings")
        @Size(max = 100) String label) {

    @Schema(name = "PushSubscriptionKeys")
    public record Keys(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "P-256 public key, URL-safe Base64")
            @NotBlank @Size(max = 100) String p256dh,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Authentication secret, URL-safe Base64")
            @NotBlank @Size(max = 30) String auth) {

        @JsonIgnore
        @AssertTrue(message = "must be a P-256 public key in URL-safe Base64")
        public boolean isP256dhValid() {
            return p256dh == null || PushSubscription.isPublicKey(p256dh);
        }

        @JsonIgnore
        @AssertTrue(message = "must be 16 bytes in URL-safe Base64")
        public boolean isAuthValid() {
            return auth == null || PushSubscription.isAuthSecret(auth);
        }
    }

    PushSubscription subscription() {
        return new PushSubscription(endpoint.strip(), keys.p256dh(), keys.auth());
    }

    /** The device name, {@code null} if none is given. */
    String deviceLabel() {
        return label == null || label.isBlank() ? null : label.strip();
    }
}
