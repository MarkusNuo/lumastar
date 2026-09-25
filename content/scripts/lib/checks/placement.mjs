import { at } from '../report.mjs';

const COMPETENCES = ['vocabulary', 'grammar', 'reading', 'translation'];

/**
 * The placement bank must cover every stage and all four competences (docs/CONTENT_FORMAT.md,
 * "placement.json"); ids follow pl_<stage>_<nnn>, e.g. pl_a1_1_001 for A1.1.
 */
export function checkPlacementCoverage(content, levels, report) {
  const placement = content.placement;
  if (!placement?.valid) return;
  const exercises = placement.data.exercises.filter((_, index) => !placement.invalidEntries.has(`/exercises/${index}`));

  for (const level of levels.filter((stage) => !exercises.some((exercise) => exercise.level === stage))) {
    report.error(placement.path, '/exercises', `No placement exercise for stage ${level}.`);
  }
  for (const competence of COMPETENCES.filter((name) => !exercises.some((exercise) => exercise.competence === name))) {
    report.error(placement.path, '/exercises', `No placement exercise for competence "${competence}".`);
  }
  for (const [index, exercise] of placement.data.exercises.entries()) {
    const prefix = `pl_${exercise.level?.toLowerCase().replace('.', '_')}_`;
    if (!placement.invalidEntries.has(`/exercises/${index}`) && !exercise.id.startsWith(prefix)) {
      report.warn(placement.path, at(`/exercises/${index}/id`, exercise.id), `Placement id should start with "${prefix}" (level ${exercise.level}).`);
    }
  }
}
