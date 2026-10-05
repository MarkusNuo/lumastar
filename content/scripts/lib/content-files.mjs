import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const REQUIRED_FILES = {
  curriculum: 'curriculum.json',
  skillTags: 'skill_tags.json',
  blocklist: 'gheg_blocklist.json',
  evaluatorCases: 'fixtures/evaluator-cases.json',
};
const OPTIONAL_FILES = { placement: 'placement.json' };
const UNITS_DIR = 'units';

/**
 * @typedef {{ path: string, schema: string, data: any, valid: boolean, invalidEntries: Set<string> }} ContentDoc
 * @typedef {{ curriculum: ContentDoc?, skillTags: ContentDoc?, blocklist: ContentDoc?,
 *             placement: ContentDoc?, evaluatorCases: ContentDoc?, units: ContentDoc[] }} Content
 */

/** Loads and parses every content file; missing or unparsable files are reported and returned as null. */
export function loadContent(contentDir, report) {
  const content = { units: [] };

  for (const [key, file] of Object.entries(REQUIRED_FILES)) {
    content[key] = existsSync(path.join(contentDir, file)) ? loadDoc(contentDir, file, report) : missing(file, report);
  }
  for (const [key, file] of Object.entries(OPTIONAL_FILES)) {
    content[key] = existsSync(path.join(contentDir, file)) ? loadDoc(contentDir, file, report) : null;
  }

  const unitsDir = path.join(contentDir, UNITS_DIR);
  const unitFiles = existsSync(unitsDir) ? readdirSync(unitsDir).filter((name) => name.endsWith('.json')).sort() : [];
  content.units = unitFiles.map((name) => loadDoc(contentDir, `${UNITS_DIR}/${name}`, report, 'unit')).filter(Boolean);
  return content;
}

/** All successfully parsed learning-content documents (the evaluator fixture is not learning content). */
export function allDocs(content) {
  return [content.curriculum, content.skillTags, content.blocklist, content.placement, ...content.units].filter(Boolean);
}

/** Test fixtures shared with the backend and frontend test suites. */
export function fixtureDocs(content) {
  return [content.evaluatorCases].filter(Boolean);
}

/** Unit and placement documents that passed schema validation, i.e. the documents holding exercises. */
export function exerciseDocs(content) {
  return [...content.units, content.placement].filter((doc) => doc?.valid);
}

function loadDoc(contentDir, relativePath, report, schema = path.basename(relativePath, '.json')) {
  report.addFile(relativePath);
  try {
    const data = JSON.parse(readFileSync(path.join(contentDir, relativePath), 'utf8'));
    return { path: relativePath, schema, data, valid: false, invalidEntries: new Set() };
  } catch (error) {
    report.error(relativePath, '', `Cannot parse JSON: ${error.message}`);
    return null;
  }
}

function missing(file, report) {
  report.error(file, '', 'Required file is missing.');
  return null;
}
