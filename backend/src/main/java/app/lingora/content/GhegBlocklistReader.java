package app.lingora.content;

import app.lingora.core.evaluation.StandardFormLexicon;
import java.io.IOException;
import java.io.Reader;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.json.JsonMapper;

/**
 * Reads {@code content/gheg_blocklist.json} into a {@link StandardFormLexicon}. A {@code gheg} value may list
 * alternatives separated by "/" and remarks in parentheses: {@code "-ue (Partizip) / -uem (Adjektiv)"}.
 */
public final class GhegBlocklistReader {

    public static final String FILE = "gheg_blocklist.json";

    private static final JsonMapper JSON = JsonMapper.builder()
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .build();
    private static final Pattern REMARK = Pattern.compile("\\([^)]*\\)");

    private record BlocklistFile(List<WordDocument> words, List<PatternDocument> patterns) {
    }

    private record WordDocument(String standard, String gheg) {
    }

    private record PatternDocument(String id, String pattern, String gheg, List<ExceptionDocument> exceptions) {
    }

    private record ExceptionDocument(String word) {
    }

    private GhegBlocklistReader() {
    }

    public static StandardFormLexicon read(Path file) {
        BlocklistFile blocklist;
        try (Reader reader = Files.newBufferedReader(file, StandardCharsets.UTF_8)) {
            blocklist = JSON.readValue(reader, BlocklistFile.class);
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot read " + file, e);
        }
        List<StandardFormLexicon.Word> words = orEmpty(blocklist.words()).stream()
                .map(word -> new StandardFormLexicon.Word(word.standard(), alternatives(word.gheg())))
                .toList();
        List<StandardFormLexicon.WordPattern> patterns = orEmpty(blocklist.patterns()).stream()
                .map(pattern -> new StandardFormLexicon.WordPattern(pattern.id(), pattern.pattern(),
                        alternatives(pattern.gheg()).stream().map(StandardFormLexicon.Replacement::parse).toList(),
                        orEmpty(pattern.exceptions()).stream().map(ExceptionDocument::word).toList()))
                .toList();
        return StandardFormLexicon.of(words, patterns);
    }

    static List<String> alternatives(String gheg) {
        return Arrays.stream(REMARK.matcher(gheg).replaceAll("").split("/"))
                .map(String::strip)
                .filter(alternative -> !alternative.isEmpty())
                .toList();
    }

    private static <T> List<T> orEmpty(List<T> values) {
        return values == null ? List.of() : values;
    }
}
