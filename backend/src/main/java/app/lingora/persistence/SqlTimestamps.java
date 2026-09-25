package app.lingora.persistence;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

/**
 * {@code timestamptz} values for native SQL. An {@link OffsetDateTime} parameter is sent as {@code timestamptz}, so
 * PostgreSQL never has to guess the type, e.g. in the select list of {@code INSERT … SELECT}.
 */
public final class SqlTimestamps {

    private SqlTimestamps() {
    }

    public static OffsetDateTime of(Instant instant) {
        return instant == null ? null : OffsetDateTime.ofInstant(instant, ZoneOffset.UTC);
    }

    public static Instant instant(ResultSet row, String column) throws SQLException {
        Timestamp timestamp = row.getTimestamp(column);
        return timestamp == null ? null : timestamp.toInstant();
    }
}
