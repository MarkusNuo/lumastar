import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const SCHEMA_ID_BASE = 'https://lumastar.invalid/schema/';

/**
 * Loads all JSON Schemas of `schemaDir` into one Ajv (draft 2020-12) instance and compiles them
 * eagerly, so a broken schema fails even when no content file uses it yet.
 */
export function createSchemaValidator(schemaDir) {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const schemas = readdirSync(schemaDir)
    .filter((name) => name.endsWith('.schema.json'))
    .map((file) => JSON.parse(readFileSync(path.join(schemaDir, file), 'utf8')));
  for (const schema of schemas) ajv.addSchema(schema);
  for (const schema of schemas) ajv.getSchema(schema.$id);

  return {
    /** Validates a document against `<schemaName>.schema.json`; returns readable errors. */
    validate(schemaName, data) {
      const validateFn = ajv.getSchema(`${SCHEMA_ID_BASE}${schemaName}.schema.json`);
      if (!validateFn) throw new Error(`No schema ${schemaName}.schema.json in ${schemaDir}`);
      return validateFn(data) ? [] : readableErrors(validateFn.errors);
    },
    /** The ordered stage codes (A0 … C2.3) defined in the shared schema. */
    levels() {
      return ajv.getSchema(`${SCHEMA_ID_BASE}common.schema.json#/$defs/level`).schema.enum;
    },
  };
}

// Arrays whose entries are skipped individually when they break the schema, so one broken
// exercise (or evaluator case) does not hide the findings (or the items) of the rest of the file.
const ENTRY_COLLECTIONS = new Set(['items', 'exercises', 'cases']);

/**
 * Schema-validates every document. A document is `valid` when its structure outside single entries is
 * sound; broken items, exercises and evaluator cases are listed in `invalidEntries` and skipped by the semantic checks.
 */
export function checkSchemas(docs, schemaValidator, report) {
  for (const doc of docs) {
    const errors = schemaValidator.validate(doc.schema, doc.data);
    for (const { pointer, message } of errors) report.error(doc.path, pointer, `Schema: ${message}`);
    const entryPointers = errors.map(({ pointer }) => entryPointerOf(pointer));
    doc.valid = !entryPointers.includes(null);
    doc.invalidEntries = new Set(entryPointers.filter(Boolean));
  }
}

function entryPointerOf(pointer) {
  const [, collection, index] = pointer.split('/');
  return ENTRY_COLLECTIONS.has(collection) && /^\d+$/u.test(index ?? '') ? `/${collection}/${index}` : null;
}

function readableErrors(errors) {
  const relevant = errors.filter((error) => error.keyword !== 'if');
  // A failed type branch drops its property annotations, so the branch's valid fields would also
  // show up as "unexpected"; report those only when nothing else is wrong at the same place.
  const pathsWithOtherErrors = new Set(relevant.filter((error) => error.keyword !== 'unevaluatedProperties').map((error) => error.instancePath));
  const unique = new Map();
  for (const error of relevant) {
    if (error.keyword === 'unevaluatedProperties' && pathsWithOtherErrors.has(error.instancePath)) continue;
    const pointer = error.instancePath || '/';
    const message = describe(error);
    unique.set(`${pointer} ${message}`, { pointer, message });
  }
  return [...unique.values()];
}

function describe(error) {
  switch (error.keyword) {
    case 'unevaluatedProperties':
      return `unexpected property "${error.params.unevaluatedProperty}" (not allowed for this exercise type)`;
    case 'additionalProperties':
      return `unexpected property "${error.params.additionalProperty}"`;
    case 'enum':
      return `${error.message}: ${error.params.allowedValues.join(', ')}`;
    case 'const':
      return `must be ${JSON.stringify(error.params.allowedValue)}`;
    default:
      return error.message;
  }
}
