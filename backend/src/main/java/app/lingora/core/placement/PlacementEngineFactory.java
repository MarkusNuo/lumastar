package app.lingora.core.placement;

import app.lingora.domain.Exercise;
import java.util.List;

/** Creates the engine for the current placement item bank, which the content seed may change at any start. */
@FunctionalInterface
public interface PlacementEngineFactory {

    PlacementEngine create(List<Exercise> itemBank);
}
