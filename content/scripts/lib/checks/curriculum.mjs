import { curriculumUnits } from '../walk.mjs';

/** Stage order, unit file references and their unitId/level consistency, orphaned unit files. */
export function checkCurriculum(content, levels, report) {
  const curriculum = content.curriculum;
  if (!curriculum?.valid) return;

  checkStageOrder(curriculum, levels, report);

  const unitDocsByPath = new Map(content.units.map((doc) => [doc.path, doc]));
  const referencedFiles = new Set();
  for (const { stage, unit, pointer } of curriculumUnits(curriculum)) {
    if (!unit.file) continue;
    referencedFiles.add(unit.file);
    checkUnitFile({ curriculum, stage, unit, pointer, unitDoc: unitDocsByPath.get(unit.file) }, report);
  }

  for (const doc of content.units.filter((unitDoc) => !referencedFiles.has(unitDoc.path))) {
    report.error(doc.path, '', 'Unit file is not referenced by any unit in curriculum.json.');
  }
}

function checkStageOrder(curriculum, levels, report) {
  let previousPosition = -1;
  for (const [index, stage] of curriculum.data.stages.entries()) {
    const position = levels.indexOf(stage.level);
    if (position <= previousPosition) {
      report.error(curriculum.path, `/stages/${index}/level`, `Stage ${stage.level} is duplicated or out of order (order: ${levels.join(', ')}).`);
    }
    previousPosition = Math.max(previousPosition, position);
  }
}

function checkUnitFile({ curriculum, stage, unit, pointer, unitDoc }, report) {
  const expectedFile = `units/${unit.id}.json`;
  if (unit.file !== expectedFile) {
    report.error(curriculum.path, `${pointer}/file`, `File of unit ${unit.id} must be "${expectedFile}".`);
  }
  if (!unitDoc) {
    report.error(curriculum.path, `${pointer}/file`, `File "${unit.file}" does not exist.`);
    return;
  }
  if (!unitDoc.valid) return;
  if (unitDoc.data.unitId !== unit.id) {
    report.error(unitDoc.path, '/unitId', `unitId "${unitDoc.data.unitId}" does not match curriculum unit "${unit.id}".`);
  }
  if (unitDoc.data.level !== stage.level) {
    report.error(unitDoc.path, '/level', `level "${unitDoc.data.level}" does not match curriculum stage "${stage.level}".`);
  }
}
