package app.lingora.api.auth;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record LoginRequest(@NotNull @Size(min = 1, max = 128) String password) {

    @Override
    public String toString() {
        return "LoginRequest[password=***]";
    }
}
