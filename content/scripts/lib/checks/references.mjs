import { at } from '../report.mjs';
import { curriculumUnits, evaluatorCasesOf, exercisesOf, itemsOf } from '../walk.mjs';

/** Skill tags must be registered (and consistent with their area); itemIds must point to existing items. */
export function checkReferences(content, report) {
  const registeredTags = registeredSkillTags(content.skillTags, report);
  if (registeredTags) checkSkillTagUsage(content, registeredTags, report);
  checkItemReferences(content, report);
}

function registeredSkillTags(skillTagsDoc, report) {
  if (!skillTagsDoc?.valid) return null;
  const tags = new Set();
  for (const [index, tag] of skillTagsDoc.data.tags.entries()) {
    const pointer = `/tags/${index}`;
    if (tags.has(tag.id)) report.error(skillTagsDoc.path, at(pointer, tag.id), 'Duplicate skill tag id.');
    if (!tag.id.startsWith(`${tag.area}.`)) {
      report.error(skillTagsDoc.path, at(pointer, tag.id), `Tag id must start with its area "${tag.area}.".`);
    }
    tags.add(tag.id);
  }
  return tags;
}

function checkSkillTagUsage(content, registeredTags, report) {
  const checkTags = (file, pointer, owner, tags) => {
    for (const [index, tag] of tags.entries()) {
      if (!registeredTags.has(tag)) report.error(file, at(`${pointer}/skillTags/${index}`, owner), `Skill tag "${tag}" is not registered in skill_tags.json.`);
    }
  };
  for (const { unit, pointer } of curriculumUnits(content.curriculum)) checkTags(content.curriculum.path, pointer, unit.id, unit.skillTags);
  for (const { doc, exercise, pointer } of exercisesOf(content)) checkTags(doc.path, pointer, exercise.id, exercise.skillTags);
  for (const { doc, testCase, pointer } of evaluatorCasesOf(content)) {
    checkTags(doc.path, `${pointer}/exercise`, testCase.id, testCase.exercise.skillTags);
  }
}

function checkItemReferences(content, report) {
  const itemIds = new Set([...itemsOf(content)].map(({ item }) => item.id));
  const referencedIds = new Set();
  for (const { doc, exercise, pointer } of exercisesOf(content)) {
    for (const [index, itemId] of exercise.itemIds.entries()) {
      referencedIds.add(itemId);
      if (!itemIds.has(itemId)) report.error(doc.path, at(`${pointer}/itemIds/${index}`, exercise.id), `Item "${itemId}" does not exist.`);
    }
  }
  for (const { doc, item, pointer } of itemsOf(content)) {
    if (!referencedIds.has(item.id)) report.warn(doc.path, at(pointer, item.id), 'Item is not referenced by any exercise.');
  }
}
