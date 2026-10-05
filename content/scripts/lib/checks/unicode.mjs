/**
 * Every string must already be in Unicode NFC. Normalisation and tokenisation compare text as written, so
 * a decomposed "â" (a + combining circumflex) in a solution or word bank would silently never match.
 */
export function checkUnicodeNormalisation(docs, report) {
  for (const doc of docs) {
    for (const { pointer, text } of stringsOf(doc.data, '')) {
      if (text !== text.normalize('NFC')) report.error(doc.path, pointer || '/', `Text is not in Unicode NFC: "${text}".`);
    }
  }
}

/** Yields every string of a JSON value with its JSON pointer. */
export function* stringsOf(value, pointer) {
  if (typeof value === 'string') {
    yield { pointer, text: value };
  } else if (Array.isArray(value)) {
    for (const [index, entry] of value.entries()) yield* stringsOf(entry, `${pointer}/${index}`);
  } else if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) yield* stringsOf(entry, `${pointer}/${key}`);
  }
}
