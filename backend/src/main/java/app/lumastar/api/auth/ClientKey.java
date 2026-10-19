package app.lumastar.api.auth;

import jakarta.servlet.http.HttpServletRequest;
import java.net.Inet6Address;
import java.net.InetAddress;
import java.util.StringJoiner;

/**
 * The key by which the throttles count a client: its IPv4 address, or the /64 prefix of its IPv6 address, since a
 * subscriber usually gets a whole /64 and could otherwise rotate through its addresses. Behind a reverse proxy the
 * remote address is the client's only with {@code LUMASTAR_FORWARD_HEADERS_STRATEGY=native}; otherwise all clients share
 * the proxy's address and its limits.
 */
final class ClientKey {

    private static final int PREFIX_GROUPS = 4;

    private ClientKey() {
    }

    static String of(HttpServletRequest request) {
        return of(request.getRemoteAddr());
    }

    static String of(String remoteAddress) {
        String literal = remoteAddress.strip();
        if (literal.indexOf(':') < 0) {
            return literal;
        }
        int zone = literal.indexOf('%');
        try {
            InetAddress address = Inet6Address.ofLiteral(zone < 0 ? literal : literal.substring(0, zone));
            return address instanceof Inet6Address ? prefix64(address.getAddress()) : address.getHostAddress();
        } catch (IllegalArgumentException notAnAddress) {
            return literal;
        }
    }

    private static String prefix64(byte[] address) {
        StringJoiner prefix = new StringJoiner(":", "", "::/64");
        for (int group = 0; group < PREFIX_GROUPS; group++) {
            prefix.add(Integer.toHexString((address[2 * group] & 0xff) << 8 | address[2 * group + 1] & 0xff));
        }
        return prefix.toString();
    }
}
