package app.lumastar.api.lesson;

import app.lumastar.domain.Answer;
import app.lumastar.domain.MatchPair;
import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
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
        + "wrongMatches for match_pairs.")
public record SubmittedAnswer(
        @Schema(description = "Typed answer") @Size(max = 500) String text,
        @Schema(description = "The picked option, as offered") @Size(max = 500) String choice,
        @Schema(description = "Word chips in the chosen order") @Size(max = 50) List<@NotNull @Size(max = 100) String> tokens,
        @Schema(description = "match_pairs: every wrong match before all pairs were matched, in order; empty if none. "
                + "Each one joins the left side of one pair with the right side of another, as shown.")
        @Size(max = 100) List<@NotNull @Valid WrongMatch> wrongMatches,
        @Schema(description = "Number of wrong matches; send wrongMatches instead", deprecated = true)
        @PositiveOrZero @Max(100) Integer mistakes) {

    @Schema(description = "A Gheg side (left) matched with the German side (right) of another pair")
    public record WrongMatch(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) @NotBlank @Size(max = 200) String left,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) @NotBlank @Size(max = 200) String right) {
    }

    @JsonIgnore
    @AssertTrue(message = "must contain exactly one of text, choice, tokens, wrongMatches or mistakes")
    public boolean isSingleAnswer() {
        return Stream.of(text, choice, tokens, wrongMatches, mistakes).filter(Objects::nonNull).count() == 1;
    }

    public Answer toDomain(Duration responseTime) {
        if (text != null) {
            return new Answer.Text(text, responseTime);
        }
        if (choice != null) {
            return new Answer.Choice(choice, responseTime);
        }
        if (tokens != null) {
            return new Answer.Tokens(tokens, responseTime);
        }
        if (wrongMatches != null) {
            return new Answer.WrongMatches(
                    wrongMatches.stream().map(match -> new MatchPair(match.left(), match.right())).toList(), responseTime);
        }
        return new Answer.PairMistakes(mistakes, responseTime);
    }

    /** The answer as stored with the attempt: the one field that was submitted. */
    public Map<String, Object> toJson() {
        if (text != null) {
            return Map.of("text", text);
        }
        if (choice != null) {
            return Map.of("choice", choice);
        }
        if (tokens != null) {
            return Map.of("tokens", tokens);
        }
        if (wrongMatches != null) {
            return Map.of("wrongMatches",
                    wrongMatches.stream().map(match -> Map.of("left", match.left(), "right", match.right())).toList());
        }
        return Map.of("mistakes", mistakes);
    }
}
