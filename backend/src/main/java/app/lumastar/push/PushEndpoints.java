package app.lumastar.push;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;
import java.util.Locale;

/**
 * The push services a subscription may point to. The server posts to every stored endpoint, so an arbitrary URL would
 * let a learner make it send requests anywhere, e.g. into the local network or to another port of a push service's
 * host (server-side request forgery): only HTTPS on its default port reaches a push service.
 *
 * @param hosts        host names or parent domains of the accepted push services
 * @param requireHttps {@code false} only for a local stub push service in tests: endpoints on a loopback host among
 *                     {@code hosts} may then use plain HTTP and any port
 */
public record PushEndpoints(List<String> hosts, boolean requireHttps) {

    private static final int HTTPS_PORT = 443;

    public PushEndpoints {
        hosts = hosts.stream().map(String::strip).filter(host -> !host.isEmpty())
                .map(host -> host.toLowerCase(Locale.ROOT)).toList();
    }

    public boolean isAllowed(String endpoint) {
        URI uri;
        try {
            uri = new URI(endpoint);
        } catch (URISyntaxException e) {
            return false;
        }
        String host = uri.getHost();
        if (host == null || uri.getRawUserInfo() != null || !isAllowedHost(host)) {
            return false;
        }
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        if (!requireHttps && LoopbackHosts.isLoopback(host)) {
            return scheme.equals("https") || scheme.equals("http");
        }
        return scheme.equals("https") && (uri.getPort() == -1 || uri.getPort() == HTTPS_PORT);
    }

    private boolean isAllowedHost(String host) {
        String name = host.toLowerCase(Locale.ROOT);
        return hosts.stream().anyMatch(allowed -> name.equals(allowed) || name.endsWith("." + allowed));
    }
}
