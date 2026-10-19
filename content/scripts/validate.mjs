// Validates the Lumastar content set: JSON Schemas, Unicode NFC, ids, cross references, exercise-type rules,
// placement coverage, the Gheg blocklist and the shared evaluator cases, and summarises the review progress. Exits
// non-zero on any error.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { allDocs, fixtureDocs, loadContent } from './lib/content-files.mjs';
import { Report } from './lib/report.mjs';
import { checkSchemas, createSchemaValidator } from './lib/schemas.mjs';
import { checkCurriculum } from './lib/checks/curriculum.mjs';
import { checkEvaluatorCases } from './lib/checks/evaluator-cases.mjs';
import { checkExerciseRules } from './lib/checks/exercise-rules.mjs';
import { checkGhegBlocklist } from './lib/checks/gheg-blocklist.mjs';
import { checkUniqueIds } from './lib/checks/ids.mjs';
import { checkPlacementCoverage } from './lib/checks/placement.mjs';
import { checkReferences } from './lib/checks/references.mjs';
import { summarizeReviewed } from './lib/checks/reviewed.mjs';
import { checkUnicodeNormalisation } from './lib/checks/unicode.mjs';

const contentDir = fileURLToPath(new URL('..', import.meta.url));
const report = new Report();
const schemaValidator = createSchemaValidator(path.join(contentDir, 'schema'));
const content = loadContent(contentDir, report);

checkSchemas([...allDocs(content), ...fixtureDocs(content)], schemaValidator, report);
checkUnicodeNormalisation(allDocs(content), report);
checkCurriculum(content, schemaValidator.levels(), report);
checkUniqueIds(content, report);
checkReferences(content, report);
checkExerciseRules(content, report);
checkPlacementCoverage(content, schemaValidator.levels(), report);
checkGhegBlocklist(content, report);
checkEvaluatorCases(content, report);
summarizeReviewed(content, report);

console.log(`Lumastar content validation (${contentDir})\n`);
report.print();
process.exitCode = report.errorCount > 0 ? 1 : 0;
