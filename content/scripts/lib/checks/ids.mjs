import { at } from '../report.mjs';
import { curriculumUnits, exercisesOf, itemsOf } from '../walk.mjs';

/** Unit, item and exercise ids must be globally unique across all content files. */
export function checkUniqueIds(content, report) {
  const firstSeen = new Map();
  const register = (kind, id, file, pointer) => {
    const key = `${kind}:${id}`;
    if (firstSeen.has(key)) report.error(file, at(pointer, id), `Duplicate ${kind} id (first defined in ${firstSeen.get(key)}).`);
    else firstSeen.set(key, `${file} ${pointer}`);
  };

  for (const { unit, pointer } of curriculumUnits(content.curriculum)) register('unit', unit.id, content.curriculum.path, pointer);
  for (const { doc, item, pointer } of itemsOf(content)) register('item', item.id, doc.path, pointer);
  for (const { doc, exercise, pointer } of exercisesOf(content)) register('exercise', exercise.id, doc.path, pointer);
}
