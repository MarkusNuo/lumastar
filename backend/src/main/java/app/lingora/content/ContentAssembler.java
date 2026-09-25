package app.lingora.content;

import app.lingora.content.ContentDocuments.CurriculumFile;
import app.lingora.content.ContentDocuments.ExerciseDocument;
import app.lingora.content.ContentDocuments.ItemDocument;
import app.lingora.content.ContentDocuments.PlacementFile;
import app.lingora.content.ContentDocuments.SkillTagDocument;
import app.lingora.content.ContentDocuments.SkillTagsFile;
import app.lingora.content.ContentDocuments.StageDocument;
import app.lingora.content.ContentDocuments.UnitDocument;
import app.lingora.content.ContentDocuments.UnitFile;
import app.lingora.domain.Curriculum;
import app.lingora.domain.Exercise;
import app.lingora.domain.ExerciseType;
import app.lingora.domain.Gender;
import app.lingora.domain.GrammarNote;
import app.lingora.domain.Item;
import app.lingora.domain.ItemKind;
import app.lingora.domain.Level;
import app.lingora.domain.PartOfSpeech;
import app.lingora.domain.SkillArea;
import app.lingora.domain.SkillTag;
import app.lingora.domain.SkillTagDefinition;
import app.lingora.domain.Stage;
import app.lingora.domain.Unit;
import app.lingora.domain.UnitColor;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Pattern;

/**
 * Turns the parsed documents into domain records and checks everything that spans documents: registered skill
 * tags, globally unique ids, item references and the placement rules. One instance serves one import run.
 */
final class ContentAssembler {

    private static final Pattern LESSON_EXERCISE_ID = Pattern.compile("^ex_[a-z0-9_]+_\\d{3}$");
    private static final Pattern PLACEMENT_EXERCISE_ID = Pattern.compile("^pl_[a-z0-9_]+_\\d{3}$");
    private static final Set<ExerciseType> PLACEMENT_TYPES = EnumSet.of(ExerciseType.MULTIPLE_CHOICE,
            ExerciseType.FILL_GAP, ExerciseType.TRANSLATE_WORDBANK, ExerciseType.WORD_ORDER, ExerciseType.TRANSLATE_FREE);

    private final Path contentRoot;
    private final ContentProblems problems;
    private final Set<SkillTag> registeredTags = new HashSet<>();
    private final Set<String> itemIds = new HashSet<>();
    private final Set<String> exerciseIds = new HashSet<>();
    private final List<ItemReference> itemReferences = new ArrayList<>();

    private record ItemReference(String location, String itemId) {
    }

    private record UnitContent(List<GrammarNote> grammar, List<Item> items, List<Exercise> exercises) {
        static final UnitContent NONE = new UnitContent(List.of(), List.of(), List.of());
    }

    ContentAssembler(Path contentRoot, ContentProblems problems) {
        this.contentRoot = contentRoot;
        this.problems = problems;
    }

    ContentBundle assemble(CurriculumFile curriculumFile, SkillTagsFile skillTagsFile, Map<String, UnitFile> unitFiles,
                           Optional<PlacementFile> placementFile) {
        List<SkillTagDefinition> skillTags = skillTags(skillTagsFile);
        List<Stage> stages = stages(curriculumFile, unitFiles);
        List<Exercise> placementExercises = placementFile.map(this::placementExercises).orElseGet(List::of);
        checkItemReferences();
        Optional<Curriculum> curriculum = problems.attempt(ContentLoader.CURRICULUM,
                () -> new Curriculum(curriculumFile.variety(), stages));
        problems.throwIfAny(contentRoot);
        return new ContentBundle(curriculum.orElseThrow(), skillTags, placementExercises);
    }

    private List<SkillTagDefinition> skillTags(SkillTagsFile file) {
        List<SkillTagDefinition> definitions = new ArrayList<>();
        List<SkillTagDocument> tags = file.tags();
        for (int i = 0; i < tags.size(); i++) {
            SkillTagDocument doc = tags.get(i);
            String location = "%s › tags[%d] (%s)".formatted(ContentLoader.SKILL_TAGS, i, doc.id());
            problems.attempt(location, () -> new SkillTagDefinition(SkillTag.of(doc.id()), doc.label(), SkillArea.fromCode(doc.area())))
                    .ifPresent(definition -> {
                        if (registeredTags.add(definition.tag())) {
                            definitions.add(definition);
                        } else {
                            problems.add(location, "duplicate skill tag");
                        }
                    });
        }
        return definitions;
    }

    private List<Stage> stages(CurriculumFile file, Map<String, UnitFile> unitFiles) {
        List<Stage> stages = new ArrayList<>();
        List<StageDocument> stageDocs = file.stages();
        for (int s = 0; s < stageDocs.size(); s++) {
            StageDocument stageDoc = stageDocs.get(s);
            String location = "%s › stages[%d] (%s)".formatted(ContentLoader.CURRICULUM, s, stageDoc.level());
            Optional<Level> level = problems.attempt(location, () -> Level.fromCode(stageDoc.level()));
            if (level.isEmpty()) {
                continue;
            }
            List<Unit> units = new ArrayList<>();
            List<UnitDocument> unitDocs = orEmpty(stageDoc.units());
            for (int u = 0; u < unitDocs.size(); u++) {
                UnitDocument unitDoc = unitDocs.get(u);
                String unitLocation = "%s.units[%d] (%s)".formatted(location, u, unitDoc.id());
                unit(unitLocation, unitDoc, level.get(), unitFiles.get(unitDoc.id())).ifPresent(units::add);
            }
            problems.attempt(location, () -> new Stage(level.get(), stageDoc.title(), units)).ifPresent(stages::add);
        }
        return stages;
    }

    private Optional<Unit> unit(String location, UnitDocument doc, Level level, UnitFile file) {
        List<SkillTag> tags = registeredTags(location, doc.skillTags());
        UnitColor color = optionalCode(location, doc.color(), UnitColor::fromCode);
        UnitContent content = file == null ? UnitContent.NONE : unitContent(doc, level, file);
        return problems.attempt(location, () -> new Unit(doc.id(), level, doc.title(), doc.description(), doc.goals(), tags,
                color, doc.icon(), doc.estimatedLessons(), content.grammar(), content.items(), content.exercises()));
    }

    private UnitContent unitContent(UnitDocument doc, Level level, UnitFile file) {
        String location = doc.file();
        checkUnitFileHeader(location, doc, level, file);
        return new UnitContent(grammar(location, file), items(location, file), lessonExercises(location, file));
    }

    private void checkUnitFileHeader(String location, UnitDocument doc, Level level, UnitFile file) {
        if (!doc.id().equals(file.unitId())) {
            problems.add(location, "unitId '%s' does not match the curriculum unit '%s'".formatted(file.unitId(), doc.id()));
        }
        if (!level.code().equals(file.level())) {
            problems.add(location, "level '%s' does not match its stage %s".formatted(file.level(), level.code()));
        }
    }

    private List<GrammarNote> grammar(String location, UnitFile file) {
        List<GrammarNote> notes = new ArrayList<>();
        orEmpty(file.grammar()).forEach(doc ->
                problems.attempt(location + " › grammar", () -> new GrammarNote(doc.title(), doc.explanation())).ifPresent(notes::add));
        return notes;
    }

    private List<Item> items(String location, UnitFile file) {
        List<Item> items = new ArrayList<>();
        List<ItemDocument> docs = orEmpty(file.items());
        for (int i = 0; i < docs.size(); i++) {
            ItemDocument doc = docs.get(i);
            String itemLocation = "%s › items[%d] (%s)".formatted(location, i, doc.id());
            if (!itemIds.add(doc.id())) {
                problems.add(itemLocation, "duplicate item id; item ids must be unique across all units");
                continue;
            }
            problems.attempt(itemLocation, () -> new Item(doc.id(), ItemKind.fromCode(doc.kind()), doc.gheg(), doc.de(),
                    optionalCode(itemLocation, doc.partOfSpeech(), PartOfSpeech::fromCode),
                    optionalCode(itemLocation, doc.gender(), Gender::fromCode),
                    doc.definite(), doc.plural(), doc.alternatives(), doc.note(), Boolean.TRUE.equals(doc.reviewed())))
                    .ifPresent(items::add);
        }
        return items;
    }

    private List<Exercise> lessonExercises(String location, UnitFile file) {
        List<Exercise> exercises = new ArrayList<>();
        List<ExerciseDocument> docs = orEmpty(file.exercises());
        for (int i = 0; i < docs.size(); i++) {
            ExerciseDocument doc = docs.get(i);
            exercise("%s › exercises[%d] (%s)".formatted(location, i, doc.id()), doc, LESSON_EXERCISE_ID).ifPresent(exercises::add);
        }
        return exercises;
    }

    private List<Exercise> placementExercises(PlacementFile file) {
        List<Exercise> exercises = new ArrayList<>();
        List<ExerciseDocument> docs = file.exercises();
        for (int i = 0; i < docs.size(); i++) {
            ExerciseDocument doc = docs.get(i);
            String location = "%s › exercises[%d] (%s)".formatted(ContentLoader.PLACEMENT, i, doc.id());
            exercise(location, doc, PLACEMENT_EXERCISE_ID).ifPresent(exercise -> {
                if (exercise.competence() == null) {
                    problems.add(location, "competence is required for placement exercises");
                }
                if (!PLACEMENT_TYPES.contains(exercise.type())) {
                    problems.add(location, "type %s cannot be evaluated automatically in the placement test".formatted(exercise.type().code()));
                }
                exercises.add(exercise);
            });
        }
        return exercises;
    }

    private Optional<Exercise> exercise(String location, ExerciseDocument doc, Pattern idFormat) {
        if (!idFormat.matcher(doc.id()).matches()) {
            problems.add(location, "id must match " + idFormat.pattern());
        }
        if (!exerciseIds.add(doc.id())) {
            problems.add(location, "duplicate exercise id; exercise ids must be unique across all files");
        }
        orEmpty(doc.itemIds()).forEach(itemId -> itemReferences.add(new ItemReference(location, itemId)));
        List<SkillTag> tags = registeredTags(location, doc.skillTags());
        return problems.attempt(location, () -> ExerciseDocumentMapper.toExercise(doc, tags));
    }

    /** Parses the tags and reports unregistered ones; they are still returned so that no follow-up errors arise. */
    private List<SkillTag> registeredTags(String location, List<String> ids) {
        List<SkillTag> tags = new ArrayList<>();
        for (String id : orEmpty(ids)) {
            problems.attempt(location, () -> SkillTag.of(id)).ifPresent(tag -> {
                if (!registeredTags.contains(tag)) {
                    problems.add(location, "skill tag %s is not registered in %s".formatted(tag, ContentLoader.SKILL_TAGS));
                }
                tags.add(tag);
            });
        }
        return tags;
    }

    private void checkItemReferences() {
        itemReferences.stream()
                .filter(reference -> !itemIds.contains(reference.itemId()))
                .forEach(reference -> problems.add(reference.location(), "references unknown item " + reference.itemId()));
    }

    private <E> E optionalCode(String location, String code, Function<String, E> parser) {
        return code == null ? null : problems.attempt(location, () -> parser.apply(code)).orElse(null);
    }

    private static <T> List<T> orEmpty(List<T> values) {
        return values == null ? List.of() : values;
    }
}
