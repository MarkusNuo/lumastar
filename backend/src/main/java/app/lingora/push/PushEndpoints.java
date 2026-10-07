package app.lingora.push;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;
import java.util.Locale;

/**
 * The push services a subscription may point to. The server posts to every stored endpoint, so an arbitrary URL would
 * let a learner make it send requests anywhere, e.g. into the local network (server-side request forgery).
 *
 * @param hosts        host names or parent domains of the accepted push services
 * @param requireHttps whether plain HTTP endpoints are refused
 */
public record PushEndpoints(List<String> hosts, boolean requireHttps) {

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
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        boolean schemeAllowed = scheme.equals("https") || scheme.equals("http") && !requireHttps;
        return schemeAllowed && uri.getHost() != null && uri.getRawUserInfo() == null && isAllowedHost(uri.getHost());
    }

    private boolean isAllowedHost(String host) {
        String name = host.toLowerCase(Locale.ROOT);
        return hosts.stream().anyMatch(allowed -> name.equals(allowed) || name.endsWith("." + allowed));
    }
}
