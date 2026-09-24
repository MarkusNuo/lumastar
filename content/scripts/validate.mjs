// Validates the Lingora content set: JSON Schemas, ids, cross references, exercise-type rules,
// the Gheg blocklist and the reviewed flags. Exits non-zero when any error is found.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { allDocs, loadContent } from './lib/content-files.mjs';
import { Report } from './lib/report.mjs';
import { checkSchemas, createSchemaValidator } from './lib/schemas.mjs';
import { checkCurriculum } from './lib/checks/curriculum.mjs';
import { checkExerciseRules } from './lib/checks/exercise-rules.mjs';
import { checkGhegBlocklist } from './lib/checks/gheg-blocklist.mjs';
import { checkUniqueIds } from './lib/checks/ids.mjs';
import { checkReferences } from './lib/checks/references.mjs';
import { checkReviewedFlags } from './lib/checks/reviewed.mjs';

const contentDir = fileURLToPath(new URL('..', import.meta.url));
const report = new Report();
const schemaValidator = createSchemaValidator(path.join(contentDir, 'schema'));
const content = loadContent(contentDir, report);

checkSchemas(allDocs(content), schemaValidator, report);
checkCurriculum(content, schemaValidator.levels(), report);
checkUniqueIds(content, report);
checkReferences(content, report);
checkExerciseRules(content, report);
checkGhegBlocklist(content, report);
checkReviewedFlags(content, report);

console.log(`Lingora content validation (${contentDir})\n`);
report.print();
process.exitCode = report.errorCount > 0 ? 1 : 0;
