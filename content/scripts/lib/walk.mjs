import { exerciseDocs } from './content-files.mjs';

/** Yields every curriculum unit with its stage and JSON pointer. */
export function* curriculumUnits(curriculumDoc) {
  if (!curriculumDoc?.valid) return;
  for (const [stageIndex, stage] of curriculumDoc.data.stages.entries()) {
    for (const [unitIndex, unit] of stage.units.entries()) {
      yield { stage, unit, pointer: `/stages/${stageIndex}/units/${unitIndex}` };
    }
  }
}

/** Yields every schema-valid item of the unit files with its JSON pointer. */
export function* itemsOf(content) {
  for (const doc of content.units.filter((unitDoc) => unitDoc.valid)) yield* validEntries(doc, 'items', 'item');
}

/** Yields every schema-valid exercise of the unit and placement files with its JSON pointer. */
export function* exercisesOf(content) {
  for (const doc of exerciseDocs(content)) yield* validEntries(doc, 'exercises', 'exercise');
}

/** Yields every schema-valid case of content/fixtures/evaluator-cases.json with its JSON pointer. */
export function* evaluatorCasesOf(content) {
  if (content.evaluatorCases?.valid) yield* validEntries(content.evaluatorCases, 'cases', 'testCase');
}

/** True for exercises of a unit file (as opposed to placement.json). */
export function isUnitDoc(doc) {
  return doc.schema === 'unit';
}

function* validEntries(doc, collection, key) {
  for (const [index, entry] of doc.data[collection].entries()) {
    const pointer = `/${collection}/${index}`;
    if (!doc.invalidEntries.has(pointer)) yield { doc, [key]: entry, pointer };
  }
}
