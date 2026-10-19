package app.lumastar.export;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Generates the profile documents from the current database state. */
@Service
public class ProfileDocuments {

    private final LearnerSnapshotReader snapshots;
    private final ProfileDocumentRenderer renderer = new ProfileDocumentRenderer();

    ProfileDocuments(LearnerSnapshotReader snapshots) {
        this.snapshots = snapshots;
    }

    @Transactional(readOnly = true)
    public RenderedDocument render(UUID userId, ProfileDocument document) {
        return new RenderedDocument(document, renderer.render(document, snapshots.read(userId)));
    }

    /** All documents from one snapshot, in the order of {@link ProfileDocument}. */
    @Transactional(readOnly = true)
    public List<RenderedDocument> renderAll(UUID userId) {
        LearnerSnapshot snapshot = snapshots.read(userId);
        return Arrays.stream(ProfileDocument.values())
                .map(document -> new RenderedDocument(document, renderer.render(document, snapshot)))
                .toList();
    }

    /** {@code learner_summary.md}, for "KI-Zusammenfassung kopieren". */
    @Transactional(readOnly = true)
    public String summary(UUID userId) {
        return new String(render(userId, ProfileDocument.LEARNER_SUMMARY).content(), StandardCharsets.UTF_8);
    }
}
