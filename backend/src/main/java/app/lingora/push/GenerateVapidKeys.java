package app.lingora.push;

/**
 * Prints a new VAPID key pair as environment variables: {@code ./gradlew generateVapidKeys}. Keep the pair: browsers
 * subscribe with the public key, so a new pair ends every existing subscription.
 */
public final class GenerateVapidKeys {

    private GenerateVapidKeys() {
    }

    public static void main(String[] args) {
        VapidKeys keys = VapidKeys.generate();
        System.out.println("LINGORA_PUSH_PUBLIC_KEY=" + keys.encodedPublicKey());
        System.out.println("LINGORA_PUSH_PRIVATE_KEY=" + keys.encodedPrivateKey());
    }
}
