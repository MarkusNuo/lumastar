package app.lingora.content;

import app.lingora.content.ContentDocuments.CurriculumFile;
import app.lingora.content.ContentDocuments.PlacementFile;
import app.lingora.content.ContentDocuments.SkillTagsFile;
import app.lingora.content.ContentDocuments.StageDocument;
import app.lingora.content.ContentDocuments.UnitDocument;
import app.lingora.content.ContentDocuments.UnitFile;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import java.io.IOException;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.json.JsonMapper;

/**
 * Reads {@code /content} per docs/CONTENT_FORMAT.md and validates it completely: first every file on its own
 * (JSON syntax, Bean Validation), then the cross-references. All problems of a phase are reported together.
 */
@Component
public class ContentLoader {

    static final String CURRICULUM = "curriculum.json";
    static final String SKILL_TAGS = "skill_tags.json";
    static final String PLACEMENT = "placement.json";

    private final JsonMapper jsonMapper = JsonMapper.builder()
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .build();
    private final Validator validator;

    public ContentLoader(Validator validator) {
        this.validator = validator;
    }

    public ContentBundle load(Path contentRoot) {
        Path root = contentRoot.toAbsolutePath().normalize();
        ContentProblems problems = new ContentProblems();
        Optional<SkillTagsFile> skillTags = read(root, root.resolve(SKILL_TAGS), SkillTagsFile.class, problems);
        Optional<CurriculumFile> curriculum = read(root, root.resolve(CURRICULUM), CurriculumFile.class, problems);
        Path placementPath = root.resolve(PLACEMENT);
        Optional<PlacementFile> placement = Files.exists(placementPath)
                ? read(root, placementPath, PlacementFile.class, problems)
                : Optional.empty();
        Map<String, UnitFile> unitFiles = curriculum.map(file -> readUnitFiles(root, file, problems)).orElseGet(Map::of);
        problems.throwIfAny(root);
        return new ContentAssembler(root, problems).assemble(curriculum.orElseThrow(), skillTags.orElseThrow(), unitFiles, placement);
    }

    private Map<String, UnitFile> readUnitFiles(Path root, CurriculumFile curriculum, ContentProblems problems) {
        Map<String, UnitFile> unitFiles = new LinkedHashMap<>();
        for (StageDocument stage : curriculum.stages()) {
            for (UnitDocument unit : stage.units() == null ? List.<UnitDocument>of() : stage.units()) {
                if (unit.file() == null) {
                    continue;
                }
                Path file = root.resolve(unit.file()).normalize();
                if (!file.startsWith(root)) {
                    problems.add("%s › unit %s".formatted(CURRICULUM, unit.id()), "file '%s' lies outside the content directory".formatted(unit.file()));
                    continue;
                }
                read(root, file, UnitFile.class, problems).ifPresent(unitFile -> unitFiles.put(unit.id(), unitFile));
            }
        }
        return unitFiles;
    }

    private <T> Optional<T> read(Path root, Path file, Class<T> type, ContentProblems problems) {
        String name = root.relativize(file).toString().replace('\\', '/');
        if (!Files.isRegularFile(file)) {
            problems.add(name, "file not found");
            return Optional.empty();
        }
        T document;
        try (Reader reader = Files.newBufferedReader(file, StandardCharsets.UTF_8)) {
            document = jsonMapper.readValue(reader, type);
        } catch (JacksonException e) {
            String position = e.getLocation() == null ? ""
                    : " at line %d, column %d".formatted(e.getLocation().getLineNr(), e.getLocation().getColumnNr());
            problems.add(name, "invalid JSON%s: %s".formatted(position, e.getOriginalMessage()));
            return Optional.empty();
        } catch (IOException e) {
            problems.add(name, "cannot be read: " + e.getMessage());
            return Optional.empty();
        }
        if (document == null) {
            problems.add(name, "is empty");
            return Optional.empty();
        }
        Set<ConstraintViolation<T>> violations = validator.validate(document);
        violations.stream()
                .map(violation -> violation.getPropertyPath() + " " + violation.getMessage())
                .sorted()
                .forEach(message -> problems.add(name, message));
        return violations.isEmpty() ? Optional.of(document) : Optional.empty();
    }
}
