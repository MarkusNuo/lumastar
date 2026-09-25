package app.lingora.export;

import java.util.Arrays;
import java.util.Optional;

/** The learner profile documents of PRD 8.3: views generated from the database, never a second source. */
public enum ProfileDocument {
    LEARNER_PROFILE("learner_profile.json"),
    SKILL_MASTERY("skill_mastery.json"),
    RECENT_ERRORS("recent_errors.json"),
    LEARNING_PLAN("learning_plan.json"),
    LEARNER_SUMMARY("learner_summary.md");

    public static final String JSON = "application/json";
    public static final String MARKDOWN = "text/markdown;charset=UTF-8";

    private final String fileName;

    ProfileDocument(String fileName) {
        this.fileName = fileName;
    }

    public static Optional<ProfileDocument> byFileName(String fileName) {
        return Arrays.stream(values()).filter(document -> document.fileName.equals(fileName)).findFirst();
    }

    public String fileName() {
        return fileName;
    }

    public String mediaType() {
        return fileName.endsWith(".md") ? MARKDOWN : JSON;
    }
}
