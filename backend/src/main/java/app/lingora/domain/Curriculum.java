package app.lingora.domain;

import java.util.List;

/** All stages from A0 upwards in ascending level order; the order of units is the learning path. */
public record Curriculum(String variety, List<Stage> stages) {

    public Curriculum {
        Require.notBlank(variety, "variety");
        stages = Require.listOrEmpty(stages);
        for (int i = 1; i < stages.size(); i++) {
            Level previous = stages.get(i - 1).level();
            Level current = stages.get(i).level();
            Require.that(current.isAbove(previous), "stages must be in ascending level order, but %s follows %s",
                    current.code(), previous.code());
        }
        Require.distinct(stages.stream().flatMap(stage -> stage.units().stream()).map(Unit::id).toList(), "unit ids");
    }

    public List<Unit> units() {
        return stages.stream().flatMap(stage -> stage.units().stream()).toList();
    }
}
