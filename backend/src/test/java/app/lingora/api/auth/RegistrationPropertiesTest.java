package app.lingora.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.lingora.api.error.ApiProblemException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpStatus;

class RegistrationPropertiesTest {

    @Test
    void openRegistrationAdmitsEveryone() {
        RegistrationProperties open = new RegistrationProperties(RegistrationMode.OPEN, "ignored");

        assertThatNoException().isThrownBy(() -> open.admit(null));
        assertThatNoException().isThrownBy(() -> open.admit("anything"));
    }

    @Test
    void closedRegistrationAdmitsNobody() {
        RegistrationProperties closed = new RegistrationProperties(RegistrationMode.CLOSED, "mirë-se-vjen");

        assertRejected(() -> closed.admit("mirë-se-vjen"), HttpStatus.FORBIDDEN, "registration_closed");
    }

    @Test
    void inviteRegistrationAdmitsTheInviteCodeWithSurroundingWhitespace() {
        RegistrationProperties invite = new RegistrationProperties(RegistrationMode.INVITE, "mirë-se-vjen");

        assertThatNoException().isThrownBy(() -> invite.admit("mirë-se-vjen"));
        assertThatNoException().isThrownBy(() -> invite.admit("  mirë-se-vjen \n"));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"mire-se-vjen", "MIRË-SE-VJEN", "mirë-se-vjen!"})
    void inviteRegistrationRejectsOtherCodes(String code) {
        RegistrationProperties invite = new RegistrationProperties(RegistrationMode.INVITE, "mirë-se-vjen");

        assertRejected(() -> invite.admit(code), HttpStatus.FORBIDDEN, "invite_code_invalid");
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = " ")
    void inviteRegistrationWithoutConfiguredCodeAdmitsNobody(String configured) {
        RegistrationProperties invite = new RegistrationProperties(RegistrationMode.INVITE, configured);

        assertRejected(() -> invite.admit(configured), HttpStatus.FORBIDDEN, "invite_code_invalid");
        assertRejected(() -> invite.admit("guess"), HttpStatus.FORBIDDEN, "invite_code_invalid");
    }

    private static void assertRejected(Runnable admission, HttpStatus status, String code) {
        assertThatThrownBy(admission::run).isInstanceOfSatisfying(ApiProblemException.class, problem -> {
            assertThat(problem.getStatusCode()).isEqualTo(status);
            assertThat(problem.getBody().getProperties()).containsEntry("code", code);
        });
    }
}
