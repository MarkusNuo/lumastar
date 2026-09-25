package app.lingora.export;

import java.util.List;

/** A backup file that cannot be imported. Nothing has been changed when it is thrown. */
public class BackupRejectedException extends RuntimeException {

    public enum Reason {
        /** The file, or its unpacked content, exceeds the configured limit. */
        TOO_LARGE,
        /** Not a readable Lingora export: no ZIP, no manifest, unsafe or duplicate entry names, malformed manifest. */
        INVALID_ARCHIVE,
        /** Written by a newer Lingora version than this one. */
        UNSUPPORTED_SCHEMA_VERSION,
        /** Data files missing, of the wrong shape or with values the database rejects; see {@link #issues()}. */
        INVALID_DATA,
        /** The data refers to exercises, items, units or skill tags this instance does not know. */
        UNKNOWN_CONTENT
    }

    /** One problem in a data file; {@code field} is a path such as {@code data/attempts.json[3].answeredAt}. */
    public record Issue(String field, String message) {
    }

    /** Content ids referred to by the backup but missing in this instance, each list sorted. */
    public record UnknownContentReferences(List<String> exercises, List<String> items, List<String> units,
                                           List<String> skillTags) {
    }

    private final Reason reason;
    private final transient List<Issue> issues;
    private final transient UnknownContentReferences unknownReferences;

    private BackupRejectedException(Reason reason, String message, List<Issue> issues,
                                    UnknownContentReferences unknownReferences) {
        super(message);
        this.reason = reason;
        this.issues = List.copyOf(issues);
        this.unknownReferences = unknownReferences;
    }

    static BackupRejectedException of(Reason reason, String message) {
        return new BackupRejectedException(reason, message, List.of(), null);
    }

    static BackupRejectedException invalidData(List<Issue> issues) {
        return new BackupRejectedException(Reason.INVALID_DATA, "The data files of the export are invalid.", issues, null);
    }

    static BackupRejectedException unknownContent(UnknownContentReferences references) {
        return new BackupRejectedException(Reason.UNKNOWN_CONTENT,
                "The export refers to content that does not exist in this instance.", List.of(), references);
    }

    public Reason reason() {
        return reason;
    }

    public List<Issue> issues() {
        return issues;
    }

    /** Present for {@link Reason#UNKNOWN_CONTENT} only. */
    public UnknownContentReferences unknownReferences() {
        return unknownReferences;
    }
}
