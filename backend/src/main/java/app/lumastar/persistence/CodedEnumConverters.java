package app.lumastar.persistence;

import app.lumastar.domain.AnswerLang;
import app.lumastar.domain.Coded;
import app.lumastar.domain.Competence;
import app.lumastar.domain.ErrorCategory;
import app.lumastar.domain.ExerciseSource;
import app.lumastar.domain.ExerciseType;
import app.lumastar.domain.Gender;
import app.lumastar.domain.ItemKind;
import app.lumastar.domain.Level;
import app.lumastar.domain.Outcome;
import app.lumastar.domain.PartOfSpeech;
import app.lumastar.domain.Rating;
import app.lumastar.domain.SelfAssessment;
import app.lumastar.domain.SkillArea;
import app.lumastar.domain.UnitColor;
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
    public static class SelfAssessmentConverter extends CodedEnumConverter<SelfAssessment> {
        public SelfAssessmentConverter() {
            super(SelfAssessment.class);
        }
    }

    @Converter(autoApply = true)
    public static class PlacementStatusConverter extends CodedEnumConverter<PlacementStatus> {
        public PlacementStatusConverter() {
            super(PlacementStatus.class);
        }
    }

    @Converter(autoApply = true)
    public static class RatingConverter extends CodedEnumConverter<Rating> {
        public RatingConverter() {
            super(Rating.class);
        }
    }
}
