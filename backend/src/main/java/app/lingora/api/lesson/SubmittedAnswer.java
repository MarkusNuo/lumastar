package app.lingora.api.lesson;

import app.lingora.domain.Answer;
import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Stream;

@Schema(description = "Exactly one field, depending on the exercise type: text for translate_free and fill_gap without "
        + "choices, choice for multiple_choice and fill_gap with choices, tokens for translate_wordbank and word_order, "
        + "mistakes for match_pairs.")
public record SubmittedAnswer(
        @Schema(description = "Typed answer") @Size(max = 500) String text,
        @Schema(description = "The picked option, as offered") @Size(max = 500) String choice,
        @Schema(description = "Word chips in the chosen order") @Size(max = 50) List<@NotNull @Size(max = 100) String> tokens,
        @Schema(description = "Wrong matches before all pairs were matched") @PositiveOrZero @Max(100) Integer mistakes) {

    @JsonIgnore
    @AssertTrue(message = "must contain exactly one of text, choice, tokens or mistakes")
    public boolean isSingleAnswer() {
        return Stream.of(text, choice, tokens, mistakes).filter(Objects::nonNull).count() == 1;
    }

    Answer toDomain(Duration responseTime) {
        if (text != null) {
            return new Answer.Text(text, responseTime);
        }
        if (choice != null) {
            return new Answer.Choice(choice, responseTime);
        }
        if (tokens != null) {
            return new Answer.Tokens(tokens, responseTime);
        }
        return new Answer.PairMistakes(mistakes, responseTime);
    }

    /** The answer as stored with the attempt: the one field that was submitted. */
    Map<String, Object> toJson() {
        if (text != null) {
            return Map.of("text", text);
        }
        if (choice != null) {
            return Map.of("choice", choice);
        }
        if (tokens != null) {
            return Map.of("tokens", tokens);
        }
        return Map.of("mistakes", mistakes);
    }
}
