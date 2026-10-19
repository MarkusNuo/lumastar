package app.lumastar.domain;

import java.util.List;
import java.util.Objects;

/** One level of the curriculum with its units in path order; it ends with an automatically composed checkpoint. */
public record Stage(Level level, String title, List<Unit> units) {

    public Stage {
        Objects.requireNonNull(level, "stage level");
        Require.notBlank(title, "title of stage " + level.code());
        units = Require.listOrEmpty(units);
        for (Unit unit : units) {
            Require.that(unit.level() == level, "unit %s has level %s but belongs to stage %s",
                    unit.id(), unit.level().code(), level.code());
        }
    }
}
