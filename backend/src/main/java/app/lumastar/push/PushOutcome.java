package app.lumastar.push;

/** What the push service answered to a push message. */
public enum PushOutcome {
    /** Accepted for delivery. */
    DELIVERED,
    /** The subscription has expired or was revoked (404, 410): it is of no use any more. */
    GONE,
    /** Any other failure, e.g. a rejected request, an overloaded service or no connection. */
    FAILED
}
