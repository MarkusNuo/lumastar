package app.lingora.api.lesson;

import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * A lesson names its unit and no skill tag, a practice lesson its skill tag and no unit. A violation is reported on
 * the field concerned, {@code unitId} or {@code skillTag}.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = LessonTarget.Validator.class)
public @interface LessonTarget {

    String message() default "must name a unit for a lesson or a skill tag for a practice lesson";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};

    class Validator implements ConstraintValidator<LessonTarget, StartLessonRequest> {

        @Override
        public boolean isValid(StartLessonRequest request, ConstraintValidatorContext context) {
            if (request == null) {
                return true;
            }
            context.disableDefaultConstraintViolation();
            boolean valid = true;
            if (request.isPractice()) {
                valid &= check(request.unitId() == null, "unitId", "must be absent for a practice lesson", context);
                valid &= check(request.skillTag() != null, "skillTag", "is required for a practice lesson", context);
            } else {
                valid &= check(request.unitId() != null && !request.unitId().isBlank(), "unitId", "is required for a lesson",
                        context);
                valid &= check(request.skillTag() == null, "skillTag", "must be absent for a lesson", context);
            }
            return valid;
        }

        private static boolean check(boolean fits, String field, String message, ConstraintValidatorContext context) {
            if (!fits) {
                context.buildConstraintViolationWithTemplate(message).addPropertyNode(field).addConstraintViolation();
            }
            return fits;
        }
    }
}
