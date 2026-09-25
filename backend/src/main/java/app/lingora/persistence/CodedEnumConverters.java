package app.lingora.persistence;

import app.lingora.domain.AnswerLang;
import app.lingora.domain.Coded;
import app.lingora.domain.Competence;
import app.lingora.domain.ErrorCategory;
import app.lingora.domain.ExerciseSource;
import app.lingora.domain.ExerciseType;
import app.lingora.domain.Gender;
import app.lingora.domain.ItemKind;
import app.lingora.domain.Level;
import app.lingora.domain.Outcome;
import app.lingora.domain.PartOfSpeech;
import app.lingora.domain.Rating;
import app.lingora.domain.SkillArea;
import app.lingora.domain.UnitColor;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** Stores enums by their external code (e.g. {@code A1.2}, {@code multiple_choice}) instead of the constant name. */
public final class CodedEnumConverters {

    private CodedEnumConverters() {
    }

    abstract static class CodedEnumConverter<E extends Enum<E> & Coded> implements AttributeConverter<E, String> {

        private final Class<E> type;

        CodedEnumConverter(Class<E> type) {
            this.type = type;
        }

        @Override
        public String convertToDatabaseColumn(E value) {
            return value == null ? null : value.code();
        }

        @Override
        public E convertToEntityAttribute(String code) {
            return code == null ? null : Coded.fromCode(type, code);
        }
    }

    @Converter(autoApply = true)
    public static class LevelConverter extends CodedEnumConverter<Level> {
        public LevelConverter() {
            super(Level.class);
        }
    }

    @Converter(autoApply = true)
    public static class ExerciseTypeConverter extends CodedEnumConverter<ExerciseType> {
        public ExerciseTypeConverter() {
            super(ExerciseType.class);
        }
    }

    @Converter(autoApply = true)
    public static class CompetenceConverter extends CodedEnumConverter<Competence> {
        public CompetenceConverter() {
            super(Competence.class);
        }
    }

    @Converter(autoApply = true)
    public static class AnswerLangConverter extends CodedEnumConverter<AnswerLang> {
        public AnswerLangConverter() {
            super(AnswerLang.class);
        }
    }

    @Converter(autoApply = true)
    public static class ExerciseSourceConverter extends CodedEnumConverter<ExerciseSource> {
        public ExerciseSourceConverter() {
            super(ExerciseSource.class);
        }
    }

    @Converter(autoApply = true)
    public static class ExercisePoolConverter extends CodedEnumConverter<ExercisePool> {
        public ExercisePoolConverter() {
            super(ExercisePool.class);
        }
    }

    @Converter(autoApply = true)
    public static class ItemKindConverter extends CodedEnumConverter<ItemKind> {
        public ItemKindConverter() {
            super(ItemKind.class);
        }
    }

    @Converter(autoApply = true)
    public static class PartOfSpeechConverter extends CodedEnumConverter<PartOfSpeech> {
        public PartOfSpeechConverter() {
            super(PartOfSpeech.class);
        }
    }

    @Converter(autoApply = true)
    public static class GenderConverter extends CodedEnumConverter<Gender> {
        public GenderConverter() {
            super(Gender.class);
        }
    }

    @Converter(autoApply = true)
    public static class SkillAreaConverter extends CodedEnumConverter<SkillArea> {
        public SkillAreaConverter() {
            super(SkillArea.class);
        }
    }

    @Converter(autoApply = true)
    public static class UnitColorConverter extends CodedEnumConverter<UnitColor> {
        public UnitColorConverter() {
            super(UnitColor.class);
        }
    }

    @Converter(autoApply = true)
    public static class SessionKindConverter extends CodedEnumConverter<SessionKind> {
        public SessionKindConverter() {
            super(SessionKind.class);
        }
    }

    @Converter(autoApply = true)
    public static class OutcomeConverter extends CodedEnumConverter<Outcome> {
        public OutcomeConverter() {
            super(Outcome.class);
        }
    }

    @Converter(autoApply = true)
    public static class ErrorCategoryConverter extends CodedEnumConverter<ErrorCategory> {
        public ErrorCategoryConverter() {
            super(ErrorCategory.class);
        }
    }

    @Converter(autoApply = true)
    public static class RatingConverter extends CodedEnumConverter<Rating> {
        public RatingConverter() {
            super(Rating.class);
        }
    }
}
