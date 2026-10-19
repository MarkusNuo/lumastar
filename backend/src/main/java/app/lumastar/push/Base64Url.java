package app.lumastar.push;

import java.util.Base64;

/** URL-safe Base64 without padding, the encoding of keys and tokens in web push. */
final class Base64Url {

    private Base64Url() {
    }

    static String encode(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /** @throws IllegalArgumentException if {@code text} is not URL-safe Base64; padding is accepted */
    static byte[] decode(String text) {
        return Base64.getUrlDecoder().decode(text);
    }
}
