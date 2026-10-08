package app.lingora.push;

import java.util.Locale;
import java.util.regex.Pattern;

/** Host names of the local machine: a push service or contact there exists only in development and tests. */
final class LoopbackHosts {

    private static final Pattern IPV4_LOOPBACK = Pattern.compile("127(\\.\\d{1,3}){3}");

    private LoopbackHosts() {
    }

    /** @param host a host as {@link java.net.URI#getHost()} returns it, IPv6 addresses in brackets; may be null */
    static boolean isLoopback(String host) {
        if (host == null) {
            return false;
        }
        String name = host.toLowerCase(Locale.ROOT);
        return name.equals("localhost") || name.endsWith(".localhost") || name.equals("[::1]")
                || IPV4_LOOPBACK.matcher(name).matches();
    }
}
