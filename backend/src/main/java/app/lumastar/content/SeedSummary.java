package app.lumastar.content;

/** What a seed run did per content table. */
public record SeedSummary(Count skillTags, Count stages, Count units, Count items, Count exercises) {

    /** {@code total} rows in the content files, of which {@code created} were new; {@code retired} rows disappeared. */
    public record Count(int total, int created, int retired) {

        @Override
        public String toString() {
            return "%d (%d new, %d retired)".formatted(total, created, retired);
        }
    }

    @Override
    public String toString() {
        return "skill tags %s, stages %s, units %s, items %s, exercises %s".formatted(skillTags, stages, units, items, exercises);
    }
}
