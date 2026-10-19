package app.lumastar.persistence;

import app.lumastar.domain.ExercisePayload;
import app.lumastar.domain.ExerciseType;
import java.util.Map;
import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

/** Converts exercise payloads to the JSON document stored in {@code exercises.payload} and back. */
@Component
public class ExercisePayloadCodec {

    private static final TypeReference<Map<String, Object>> JSON_OBJECT = new TypeReference<>() {
    };

    private final JsonMapper jsonMapper;

    public ExercisePayloadCodec(JsonMapper jsonMapper) {
        this.jsonMapper = jsonMapper;
    }

    public Map<String, Object> toJson(ExercisePayload payload) {
        return jsonMapper.convertValue(payload, JSON_OBJECT);
    }

    public ExercisePayload fromJson(ExerciseType type, Map<String, Object> json) {
        return jsonMapper.convertValue(json, payloadClass(type));
    }

    private static Class<? extends ExercisePayload> payloadClass(ExerciseType type) {
        return switch (type) {
            case MULTIPLE_CHOICE -> ExercisePayload.MultipleChoice.class;
            case TRANSLATE_WORDBANK -> ExercisePayload.TranslateWordbank.class;
            case TRANSLATE_FREE -> ExercisePayload.TranslateFree.class;
            case FILL_GAP -> ExercisePayload.FillGap.class;
            case MATCH_PAIRS -> ExercisePayload.MatchPairs.class;
            case WORD_ORDER -> ExercisePayload.WordOrder.class;
            default -> throw new IllegalArgumentException("Exercise type " + type.code() + " has no payload format yet");
        };
    }
}
