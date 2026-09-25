package app.lingora.content;

import app.lingora.content.ContentDocuments.ErrorHintDocument;
import app.lingora.content.ContentDocuments.ExerciseDocument;
import app.lingora.content.ContentDocuments.PairDocument;
import app.lingora.domain.AnswerLang;
import app.lingora.domain.Competence;
import app.lingora.domain.ErrorCategory;
import app.lingora.domain.ErrorHint;
import app.lingora.domain.Exercise;
import app.lingora.domain.ExercisePayload;
import app.lingora.domain.ExerciseSource;
import app.lingora.domain.ExerciseType;
import app.lingora.domain.Level;
import app.lingora.domain.MatchPair;
import app.lingora.domain.Prompt;
import app.lingora.domain.SkillTag;
import java.util.List;
import java.util.function.Function;

/** Maps a flat exercise document to the domain; rule violations surface as {@link IllegalArgumentException}. */
final class ExerciseDocumentMapper {

    private ExerciseDocumentMapper() {
    }

    static Exercise toExercise(ExerciseDocument doc, List<SkillTag> skillTags) {
        ExerciseType type = ExerciseType.fromCode(doc.type());
        return new Exercise(
                doc.id(),
                Level.fromCode(doc.level()),
                doc.difficulty(),
                skillTags,
                doc.itemIds(),
                optionalCode(doc.competence(), Competence::fromCode),
                new Prompt(AnswerLang.fromCode(doc.prompt().lang()), doc.prompt().text()),
                doc.explanation(),
                orEmpty(doc.errorHints()).stream().map(ExerciseDocumentMapper::toErrorHint).toList(),
                doc.source() == null ? ExerciseSource.MANUAL : ExerciseSource.fromCode(doc.source()),
                Boolean.TRUE.equals(doc.reviewed()),
                doc.note(),
                toPayload(type, doc));
    }

    private static ExercisePayload toPayload(ExerciseType type, ExerciseDocument doc) {
        return switch (type) {
            case MULTIPLE_CHOICE -> new ExercisePayload.MultipleChoice(doc.choices(), doc.solutions());
            case TRANSLATE_WORDBANK -> new ExercisePayload.TranslateWordbank(answerLang(doc), doc.solutions(), doc.wordBank());
            case TRANSLATE_FREE -> new ExercisePayload.TranslateFree(answerLang(doc), doc.solutions(), doc.standardForms());
            case FILL_GAP -> new ExercisePayload.FillGap(answerLang(doc), doc.text(), doc.solutions(), doc.choices(),
                    doc.standardForms());
            case MATCH_PAIRS -> new ExercisePayload.MatchPairs(orEmpty(doc.pairs()).stream().map(ExerciseDocumentMapper::toPair).toList());
            case WORD_ORDER -> new ExercisePayload.WordOrder(answerLang(doc), doc.tokens(), doc.solutions());
            default -> throw new IllegalArgumentException("exercise type %s is reserved; its content format is not defined yet"
                    .formatted(type.code()));
        };
    }

    private static AnswerLang answerLang(ExerciseDocument doc) {
        if (doc.answerLang() == null) {
            throw new IllegalArgumentException("answerLang is required for " + doc.type());
        }
        return AnswerLang.fromCode(doc.answerLang());
    }

    private static ErrorHint toErrorHint(ErrorHintDocument doc) {
        return new ErrorHint(doc.pattern(), ErrorCategory.fromCode(doc.category()), doc.hint());
    }

    private static MatchPair toPair(PairDocument doc) {
        return new MatchPair(doc.left(), doc.right());
    }

    private static <E> E optionalCode(String code, Function<String, E> parser) {
        return code == null ? null : parser.apply(code);
    }

    private static <T> List<T> orEmpty(List<T> values) {
        return values == null ? List.of() : values;
    }
}
