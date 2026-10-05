package app.lingora.export;

/**
 * Version and layout of the export (PRD F11, 13). The version is written to {@code manifest.json} and
 * {@code learner_profile.json}; a change of the data format raises it and adds a {@link BackupUpgrader}.
 */
public final class ExportFormat {

    public static final int SCHEMA_VERSION = 4;

    static final String MANIFEST = "manifest.json";
    static final String DOCUMENTS = "documents/";
    static final String DATA = "data/";
    static final String PROFILE_DATA = DATA + "profile.json";

    private ExportFormat() {
    }
}
