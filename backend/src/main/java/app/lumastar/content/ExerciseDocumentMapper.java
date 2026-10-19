package app.lumastar.content;

import app.lumastar.content.ContentDocuments.ErrorHintDocument;
import app.lumastar.content.ContentDocuments.ExerciseDocument;
import app.lumastar.content.ContentDocuments.PairDocument;
import app.lumastar.domain.AnswerLang;
import app.lumastar.domain.Competence;
import app.lumastar.domain.ErrorCategory;
import app.lumastar.domain.ErrorHint;
import app.lumastar.domain.Exercise;
import app.lumastar.domain.ExercisePayload;
import app.lumastar.domain.ExerciseSource;
import app.lumastar.domain.ExerciseType;
import app.lumastar.domain.Level;
import app.lumastar.domain.MatchPair;
import app.lumastar.domain.Prompt;
import app.lumastar.domain.SkillTag;
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
